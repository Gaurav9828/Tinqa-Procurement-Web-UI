import { useCallback, useRef, useState } from 'react';
import { financeApi } from '../api/financeApi';
import type { ApiResponse } from '../../../types/common.types';
import type { InvoiceAnalysis, Voucher, VoucherDocumentKind, VoucherPayload } from '../types/finance.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '../../../utils/apiError';
import { getApiErrorKind } from '../../../utils/apiErrorKind';

export interface VoucherActionResult {
  ok: boolean;
  voucher?: Voucher;
  fieldErrors: Record<string, string>;
}

/** A file chosen in the form (already compressed), uploaded once the voucher is saved. */
export interface StagedDocument {
  key: string;
  file: File;
  kind: VoucherDocumentKind;
  originalSize: number;
  compressed: boolean;
  /** For an invoice: what was read from it, or why it couldn't be read. */
  analysis?: InvoiceAnalysis;
  readError?: string;
}

export interface DocumentChanges {
  add: StagedDocument[];
  /** Ids of attached documents to remove. */
  remove: number[];
}

const MESSAGES: Record<string, string> = {
  VOUCHER_SELF_APPROVAL_NOT_ALLOWED: 'You raised this voucher, so another approver must decide on it.',
  VOUCHER_NOT_PENDING: 'This voucher was already decided. The list has been refreshed.',
  VOUCHER_NOT_YOURS: 'Only the person who raised this voucher can change or withdraw it.',
};

/**
 * Every voucher action: one in flight at a time, outcome through the global alert, and the list reloaded from the
 * server (`onChanged`) instead of being patched locally. Field errors come back for the form to show inline.
 */
export const useVoucherActions = (onChanged: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const notify = useNotify();

  const run = useCallback(
    async (call: () => Promise<ApiResponse<Voucher>>, success: string, failure: string): Promise<VoucherActionResult> => {
      if (inFlight.current) return { ok: false, fieldErrors: {} };
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const res = await call();
        if (!res.success) {
          notify.error(res, failure);
          return { ok: false, fieldErrors: {} };
        }
        notify.success(res.message || success);
        onChanged();
        return { ok: true, voucher: res.data, fieldErrors: {} };
      } catch (err: unknown) {
        const fieldErrors = getApiFieldErrors(err);
        const code = getApiErrorCode(err);
        if (code && MESSAGES[code]) notify.error(MESSAGES[code]);
        else notify.error(err, failure);
        if (getApiErrorKind(err) === 'conflict' || getApiErrorKind(err) === 'notFound') onChanged();
        return { ok: false, fieldErrors };
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [notify, onChanged]
  );

  /**
   * Raises or edits a voucher, then removes and attaches its documents. `payload` is null when only the documents
   * changed. A file that fails doesn't undo the voucher: the alert names it, and it can be attached again from Edit.
   */
  const save = useCallback(
    async (voucherId: number | null, payload: VoucherPayload | null, documents: DocumentChanges): Promise<VoucherActionResult> => {
      if (inFlight.current) return { ok: false, fieldErrors: {} };
      inFlight.current = true;
      setIsSubmitting(true);
      const failure = voucherId === null ? 'The voucher could not be raised.' : 'The voucher could not be updated.';
      try {
        let id = voucherId;
        let voucher: Voucher | undefined;
        let saved = 'Voucher updated.';
        try {
          if (payload) {
            const res = id === null ? await financeApi.createVoucher(payload) : await financeApi.updateVoucher(id, payload);
            if (!res.success) {
              notify.error(res, failure);
              return { ok: false, fieldErrors: {} };
            }
            voucher = res.data;
            id = res.data.id;
            saved = res.message || (voucherId === null ? 'Voucher raised for approval.' : saved);
          }
        } catch (err: unknown) {
          const code = getApiErrorCode(err);
          if (code && MESSAGES[code]) notify.error(MESSAGES[code]);
          else notify.error(err, failure);
          if (getApiErrorKind(err) === 'conflict' || getApiErrorKind(err) === 'notFound') onChanged();
          return { ok: false, fieldErrors: getApiFieldErrors(err) };
        }
        if (id === null) return { ok: false, fieldErrors: {} };

        // One at a time, so the stored names are numbered in the order the files were chosen
        const failed: string[] = [];
        for (const documentId of documents.remove) {
          try {
            voucher = (await financeApi.removeDocument(id, documentId)).data ?? voucher;
          } catch (err: unknown) {
            failed.push(`A file could not be removed: ${getApiErrorMessage(err)}`);
          }
        }
        for (const staged of documents.add) {
          try {
            voucher = (await financeApi.uploadDocument(id, staged.file, staged.kind)).data ?? voucher;
          } catch (err: unknown) {
            failed.push(`${staged.file.name} was not attached: ${getApiErrorMessage(err)}`);
          }
        }

        if (failed.length) notify.warning(`${saved} ${failed.join(' ')} You can attach it again from Edit.`);
        else notify.success(documents.add.length ? `${saved} ${documents.add.length} file(s) attached to ${voucher?.voucherNumber ?? 'the voucher'}.` : saved);
        onChanged();
        return { ok: true, voucher, fieldErrors: {} };
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [notify, onChanged]
  );

  return {
    isSubmitting,
    save,
    create: (payload: VoucherPayload) =>
      run(() => financeApi.createVoucher(payload), 'Voucher raised for approval.', 'The voucher could not be raised.'),
    update: (id: number, payload: VoucherPayload) =>
      run(() => financeApi.updateVoucher(id, payload), 'Voucher updated.', 'The voucher could not be updated.'),
    cancel: (id: number) => run(() => financeApi.cancelVoucher(id), 'Voucher withdrawn.', 'The voucher could not be withdrawn.'),
    approve: (id: number, comment?: string) =>
      run(() => financeApi.approveVoucher(id, comment), 'Approved and posted to the company account.', 'The voucher could not be approved.'),
    reject: (id: number, comment: string) =>
      run(() => financeApi.rejectVoucher(id, comment), 'Voucher rejected.', 'The voucher could not be rejected.'),
    reverse: (id: number, comment: string) =>
      run(() => financeApi.reverseVoucher(id, comment), 'Voucher reversed.', 'The voucher could not be reversed.'),
  };
};
