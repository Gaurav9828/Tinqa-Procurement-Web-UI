import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { CustomerDetail, CustomerEditForm, CustomerField } from '../types/customer.types';
import { FIELD_LABELS, REASON_MAX_LENGTH, changedFields, toEditForm, validateEditForm } from '../utils/customer.utils';
import { CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { GENDER_OPTIONS } from '../../../types/common.types';
import { SOLID_TONE } from '../../../components/ui/actionTones';

/**
 * The customer's editable details. A Super Admin saves them (mode "edit"); customer care sends the same form as a
 * request (mode "request") and nothing changes until the Super Admin makes it. A reason is always required.
 */
export const CustomerChangeModal: React.FC<{
  customer: CustomerDetail;
  mode: 'edit' | 'request';
  busy: boolean;
  serverErrors: Record<string, string>;
  onSubmit: (changes: Partial<Record<CustomerField, string>>, form: CustomerEditForm) => Promise<boolean>;
  onClose: () => void;
}> = ({ customer, mode, busy, serverErrors, onSubmit, onClose }) => {
  const [form, setForm] = useState<CustomerEditForm>(() => toEditForm(customer));
  const [submitted, setSubmitted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const changes = useMemo(() => changedFields(customer, form), [customer, form]);
  const errors = useMemo(() => validateEditForm(form, changes), [form, changes]);
  const shown = (key: keyof CustomerEditForm) => (submitted ? errors[key] : undefined) ?? serverErrors[key];

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('input')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const set = (key: keyof CustomerEditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    if (await onSubmit(changes, form)) onClose();
  };

  const title = mode === 'edit' ? 'Edit customer details' : 'Request a change';
  const changeList = Object.keys(changes) as CustomerField[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl text-xs p-6"
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-black dark:text-white">{title}</h2>
              <p className="text-gray-500 mt-0.5">
                {mode === 'edit'
                  ? `Changes apply to ${customer.name}'s account at once.`
                  : `A Super Admin is notified and makes the change after checking it. ${customer.name}'s details stay as they are until then.`}
              </p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} disabled={busy} className="p-1 rounded-lg hover:bg-black/5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CommonInput label="First name" value={form.firstName} onChange={set('firstName')} maxLength={50} error={shown('firstName')} />
            <CommonInput label="Middle name" value={form.middleName} onChange={set('middleName')} maxLength={50} error={shown('middleName')} />
            <CommonInput label="Last name" value={form.lastName} onChange={set('lastName')} maxLength={50} error={shown('lastName')} />
            <CommonInput label="Phone number" type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} maxLength={15} error={shown('phoneNumber')} />
            <CommonInput label="Date of birth" type="date" value={form.dob} onChange={set('dob')} error={shown('dob')} />
            <CommonSelect label="Gender" options={GENDER_OPTIONS} value={form.gender} onChange={set('gender')} error={shown('gender')} />
          </div>
          <p className="text-[11px] text-gray-500">
            The email address is the customer's sign-in and cannot be changed here.
          </p>

          <CommonTextArea
            label="Reason"
            required
            value={form.reason}
            onChange={set('reason')}
            maxLength={REASON_MAX_LENGTH}
            placeholder="e.g. Customer called: their name is misspelt"
            error={shown('reason')}
          />

          {changeList.length > 0 ? (
            <p className="p-2.5 rounded-xl bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-300">
              Changing: {changeList.map((field) => FIELD_LABELS[field]).join(', ')}
            </p>
          ) : (
            submitted && <p className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">{errors.changes}</p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 font-medium cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium cursor-pointer disabled:opacity-60 ${
                mode === 'edit' ? SOLID_TONE.approve : SOLID_TONE.primary
              }`}
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'edit' ? 'Save changes' : 'Send request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
