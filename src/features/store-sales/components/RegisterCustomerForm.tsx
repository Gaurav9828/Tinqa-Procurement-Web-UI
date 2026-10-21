import React, { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { CommonInput } from '../../../components/ui/FormInputs';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import type { StoreCustomerRequest } from '../types/storeSale.types';
import { emptyCustomer, isValidEmail, validateCustomer, type FieldErrors } from '../utils/storeSale.utils';
import { AddressFields } from './AddressFields';
import { useEmailVerification } from '../../../hooks/useEmailVerification';
import { EmailVerificationPanel } from '../../../components/email-verification/EmailVerificationPanel';
import { storeEmailVerificationApi } from '../api/storeSaleApi';

interface Props {
  /** Prefilled from the lookup (mobile number or email the agent typed). */
  initialContact?: string;
  isSaving: boolean;
  onRegister: (form: StoreCustomerRequest) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * The storefront sign-up, filled in at the counter. The customer's email is verified first with a code sent there; no
 * password is typed: with their first order the customer is emailed a link to set their own.
 */
export const RegisterCustomerForm: React.FC<Props> = ({ initialContact = '', isSaving, onRegister, onCancel }) => {
  const [form, setForm] = useState<StoreCustomerRequest>(() => {
    const initial = emptyCustomer();
    const contact = initialContact.trim();
    return contact.includes('@') ? { ...initial, email: contact } : { ...initial, phoneNumber: contact, address: { ...initial.address, phoneNumber: contact } };
  });
  const [submitted, setSubmitted] = useState(false);
  const verification = useEmailVerification(storeEmailVerificationApi, form.email);
  const errors: FieldErrors = submitted ? validateCustomer(form) : {};
  const set = (field: keyof StoreCustomerRequest) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateCustomer(form)).length > 0 || !verification.token) return;
    await onRegister({ ...form, emailVerificationToken: verification.token });
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Register customer" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CommonInput label="First name" required value={form.firstName} onChange={set('firstName')} error={errors.firstName} maxLength={50} />
        <CommonInput label="Middle name" value={form.middleName ?? ''} onChange={set('middleName')} error={errors.middleName} maxLength={50} />
        <CommonInput label="Last name" required value={form.lastName} onChange={set('lastName')} error={errors.lastName} maxLength={50} />
        <CommonInput label="Mobile number" required type="tel" inputMode="numeric" placeholder="98765 43210" value={form.phoneNumber} onChange={set('phoneNumber')} error={errors.phoneNumber} maxLength={16} />
        <CommonInput
          label="Email"
          required
          type="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email ?? (submitted && !verification.token ? 'Verify the email with the code sent to it.' : undefined)}
          maxLength={255}
        />
        <CommonInput label="Date of birth" required type="date" value={form.dob} onChange={set('dob')} error={errors.dob} />
        <div className="sm:col-span-3 space-y-2">
          <EmailVerificationPanel verification={verification} canSend={isValidEmail(form.email)} whose="the customer" />
          <p className="px-1 text-[11px] text-gray-500 dark:text-neutral-400">
            Once you book their order, we email the customer the receipt, how to track it and a link to set their own
            password (it works for 15 minutes; after that they use "Forgot password" on the website). Order updates and
            the tax invoice on delivery go to this email too.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery address</h3>
        <AddressFields value={form.address} onChange={(address) => setForm({ ...form, address })} errors={errors} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${SOLID_TONE.danger}`}>
          Cancel
        </button>
        <button type="submit" disabled={isSaving} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.approve}`}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Register customer
        </button>
      </div>
    </form>
  );
};
