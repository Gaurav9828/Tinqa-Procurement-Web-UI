import React, { useState } from 'react';
import { Building2, ExternalLink, Loader2, X } from 'lucide-react';
import { CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useBusinessSave } from '../hooks/useOutreachActions';
import type { OutreachBusiness } from '../types/outreach.types';
import { BUSINESS_TYPES, businessPayload, businessToForm, businessTypeLabel, validateBusiness, type BusinessForm } from '../utils/outreach';

interface Props {
  /** The business being edited; null adds a new one. */
  business: OutreachBusiness | null;
  onClose: () => void;
  onSaved: (business: OutreachBusiness) => void;
  /** Opens a business already on file (offered when the phone or email is a duplicate). */
  onOpenExisting: (id: number) => void;
}

/** Add or edit a business we pitch to (OUTREACH_LOG). Its phone and email must not be on file already. */
export const BusinessFormModal: React.FC<Props> = ({ business, onClose, onSaved, onOpenExisting }) => {
  const { isSubmitting, save } = useBusinessSave();
  const [form, setForm] = useState<BusinessForm>(() => businessToForm(business));
  const [showErrors, setShowErrors] = useState(false);
  const [existingId, setExistingId] = useState<number | null>(null);
  const errors = validateBusiness(form);
  const err = (field: keyof BusinessForm) => (showErrors ? errors[field] : undefined);
  const set = (field: keyof BusinessForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    setExistingId(null);
    if (Object.keys(errors).length > 0) return;
    const result = await save(business?.id ?? null, businessPayload(form));
    if (result.ok) onSaved(result.business);
    else if (result.existingId !== null && result.existingId !== business?.id) setExistingId(result.existingId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form role="dialog" aria-modal="true" aria-label={business ? `Edit ${business.name}` : 'Add business'} onSubmit={submit} noValidate
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#0071e3]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-black dark:text-white">{business ? `Edit ${business.name}` : 'Add business'}</h3>
              <p className="text-xs text-gray-500">A hotel, office, hospital or other business we pitch to. Each phone number and email can be on file once.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {existingId !== null && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
            <span>This business is already in the list: its phone number or email is on file. Open it to log your contact there.</span>
            <button type="button" onClick={() => onOpenExisting(existingId)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${SOLID_TONE.primary}`}>
              <ExternalLink className="w-3.5 h-3.5" /> Open existing business
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CommonInput label="Business name" required maxLength={200} value={form.name} onChange={set('name')} error={err('name')} />
          <CommonSelect label="Type" required placeholder="Select a type" value={form.businessType} onChange={set('businessType')} error={err('businessType')}
            options={BUSINESS_TYPES.map((value) => ({ value, label: businessTypeLabel(value) }))} />
          <CommonInput label="Phone" type="tel" maxLength={20} value={form.phone} onChange={set('phone')} error={err('phone')} />
          <CommonInput label="Email" type="email" maxLength={200} value={form.email} onChange={set('email')} error={err('email')} />
          <CommonInput label="Contact person" maxLength={150} value={form.contactPerson} onChange={set('contactPerson')} />
          <CommonInput label="City" maxLength={100} value={form.city} onChange={set('city')} />
        </div>
        <CommonInput label="Address" maxLength={500} value={form.address} onChange={set('address')} />
        <CommonInput label="Google Maps link" type="url" maxLength={500} value={form.googleMapsUrl} onChange={set('googleMapsUrl')} error={err('googleMapsUrl')} />
        <CommonTextArea label="Notes" rows={2} maxLength={2000} value={form.notes} onChange={set('notes')} />

        <div className="flex justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer ${SOLID_TONE.primary}`}>
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {business ? 'Save business' : 'Add business'}
          </button>
        </div>
      </form>
    </div>
  );
};
