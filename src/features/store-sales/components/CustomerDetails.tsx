import React from 'react';
import { BadgeCheck, CheckCircle2, KeyRound, Mail, Phone, X } from 'lucide-react';
import { CHOICE_TONE } from '../../../components/ui/actionTones';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import type { StoreCustomer } from '../types/storeSale.types';

interface Props {
  customer: StoreCustomer;
  onClear: () => void;
}

/** The customer at the counter: how to reach them, and whether their email and account are set up. */
export const CustomerDetails: React.FC<Props> = ({ customer, onClear }) => (
  <div className="flex flex-wrap items-start justify-between gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20" aria-label="Customer details">
    <dl className="text-xs space-y-1">
      <dt className="sr-only">Name</dt>
      <dd className="text-sm font-semibold text-black dark:text-white flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {customer.name}
      </dd>
      <dt className="sr-only">Email</dt>
      <dd className="flex flex-wrap items-center gap-1.5 text-gray-600 dark:text-neutral-300">
        <Mail className="w-3.5 h-3.5 text-gray-400" />
        <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
        {customer.emailVerified && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <BadgeCheck className="w-3 h-3" /> verified
          </span>
        )}
      </dd>
      <dt className="sr-only">Mobile</dt>
      <dd className="flex items-center gap-1.5 text-gray-600 dark:text-neutral-300">
        <Phone className="w-3.5 h-3.5 text-gray-400" />
        {customer.phoneNumber ? <a href={`tel:${customer.phoneNumber.replace(/\s/g, '')}`} className="hover:underline">{customer.phoneNumber}</a> : '—'}
      </dd>
      {customer.registeredAt && (
        <>
          <dt className="sr-only">Customer since</dt>
          <dd className="text-gray-400">Customer since {formatDateTime(customer.registeredAt)}</dd>
        </>
      )}
      {customer.passwordSetupPending && (
        <>
          <dt className="sr-only">Account</dt>
          <dd className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <KeyRound className="w-3.5 h-3.5" /> Hasn't set a password yet: the link is in their email (or "Forgot password" on the website).
          </dd>
        </>
      )}
    </dl>
    <button type="button" onClick={onClear} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${CHOICE_TONE.danger.idle}`}>
      <X className="w-3.5 h-3.5" /> Change customer
    </button>
  </div>
);
