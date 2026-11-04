import { useCallback, useState } from 'react';
import { useNotify } from '../../../hooks/useNotify';
import { useApiAction } from '../../../hooks/useApiAction';
import { errorCodeOf, errorDetailOf } from '../../../utils/apiErrorDetail';
import { outreachApi } from '../api/outreachApi';
import type { BusinessPayload, ContactPayload, OutreachBusiness } from '../types/outreach.types';

/** The error code for a business whose phone or email is already on file; its body carries `existingId`. */
export const BUSINESS_EXISTS = 'BUSINESS_EXISTS';

export type BusinessSaveResult = { ok: true; business: OutreachBusiness } | { ok: false; existingId: number | null };

/** Add or edit a business (OUTREACH_LOG). A duplicate answers with the id of the business already on file. */
export const useBusinessSave = () => {
  const notify = useNotify();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const save = useCallback(
    async (id: number | null, payload: BusinessPayload): Promise<BusinessSaveResult> => {
      setIsSubmitting(true);
      try {
        const res = id === null ? await outreachApi.createBusiness(payload) : await outreachApi.updateBusiness(id, payload);
        if (res.success && res.data) {
          notify.success(res.message || (id === null ? `${payload.name} added.` : `${payload.name} saved.`));
          return { ok: true, business: res.data };
        }
        notify.error(res, 'The business could not be saved.');
        return { ok: false, existingId: null };
      } catch (err: unknown) {
        if (errorCodeOf(err) === BUSINESS_EXISTS) {
          const existing = Number(errorDetailOf(err, 'existingId'));
          // The form offers to open the business already on file
          notify.warning('This business is already in the list (same phone or email).');
          return { ok: false, existingId: Number.isFinite(existing) && existing > 0 ? existing : null };
        }
        notify.error(err, 'The business could not be saved.');
        return { ok: false, existingId: null };
      } finally {
        setIsSubmitting(false);
      }
    },
    [notify]
  );

  return { isSubmitting, save };
};

/**
 * Log or edit a contact (OUTREACH_LOG; editing is the logger's own), then upload its new proofs one by one. The contact
 * stays saved when a proof fails; the failures are reported and can be added again by editing it.
 */
export const useContactSave = () => {
  const notify = useNotify();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const save = useCallback(
    async (businessId: number, contactId: number | null, payload: ContactPayload, files: File[]): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const res = contactId === null ? await outreachApi.logContact(businessId, payload) : await outreachApi.updateContact(contactId, payload);
        if (!res.success || !res.data) {
          notify.error(res, 'The contact could not be saved.');
          return false;
        }
        const failed: string[] = [];
        for (const file of files) {
          try {
            const upload = await outreachApi.uploadProof(res.data.id, file);
            if (!upload.success) failed.push(file.name);
          } catch {
            failed.push(file.name);
          }
        }
        if (failed.length) {
          notify.warning(`Contact saved, but these proofs could not be uploaded: ${failed.join(', ')}. Edit the contact to add them again.`);
        } else {
          notify.success(contactId === null ? 'Contact logged.' : 'Contact saved.');
        }
        return true;
      } catch (err: unknown) {
        notify.error(err, 'The contact could not be saved.');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [notify]
  );

  return { isSubmitting, save };
};

/** Remove one proof of your own contact (OUTREACH_LOG). */
export const useProofRemoval = (onRemoved: () => void) => {
  const { isSubmitting, run } = useApiAction(onRemoved);
  const remove = (contactId: number, proofId: number, fileName: string) =>
    run(() => outreachApi.removeProof(contactId, proofId), { success: `${fileName} removed.`, failure: 'The proof could not be removed.' });
  return { isSubmitting, remove };
};
