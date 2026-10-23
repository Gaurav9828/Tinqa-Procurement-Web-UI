import React from 'react';
import { Mail, MapPin, Pencil, Phone, Send } from 'lucide-react';
import type { CustomerDetail } from '../types/customer.types';
import { formatStatus } from '../utils/customer.utils';
import { CartBadge, ClosedBadge } from './CustomerTable';
import { formatCurrency, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { SOLID_TONE } from '../../../components/ui/actionTones';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="text-xs text-black dark:text-white break-words">{children}</dd>
  </div>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.05] p-3">
    <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-sm font-bold text-black dark:text-white">{value}</p>
    {hint && <p className="text-[10px] text-gray-500">{hint}</p>}
  </div>
);

/**
 * Who the customer is and how to reach them. "Edit details" for a Super Admin; "Request change" for customer care,
 * which notifies the Super Admin instead of changing anything.
 */
export const CustomerProfileCard: React.FC<{
  customer: CustomerDetail;
  canEdit: boolean;
  canRequest: boolean;
  onChange: () => void;
}> = ({ customer, canEdit, canRequest, onChange }) => {
  const closed = customer.status === 'DELETED';
  return (
    <section aria-label="Customer profile" className="apple-card p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-black dark:text-white">{customer.name}</h1>
            <CartBadge units={customer.cartUnits} />
            {closed && <ClosedBadge />}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1 text-[#0071e3] hover:underline">
              <Mail className="w-3.5 h-3.5" /> {customer.email}
            </a>
            <a href={`tel:${customer.phoneNumber.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 text-[#0071e3] hover:underline">
              <Phone className="w-3.5 h-3.5" /> {customer.phoneNumber}
            </a>
          </div>
        </div>
        {!closed && (canEdit || canRequest) && (
          <button
            type="button"
            onClick={onChange}
            className={`self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
              canEdit ? SOLID_TONE.primary : SOLID_TONE.warning
            }`}
          >
            {canEdit ? <Pencil className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {canEdit ? 'Edit details' : 'Request change'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Orders" value={customer.orderCount} hint={customer.lastOrderAt ? `Last ${formatDateTime(customer.lastOrderAt)}` : 'None yet'} />
        <Stat label="Paid in total" value={formatCurrency(customer.totalSpent)} />
        <Stat
          label="In cart"
          value={formatCurrency(customer.cartValue)}
          hint={customer.cartUnits ? `${customer.cartUnits} units, last added ${formatDateTime(customer.lastCartActivityAt)}` : 'Empty'}
        />
        <Stat label="Open tickets" value={customer.openTicketCount} />
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Customer ID">#{customer.id}</Field>
        <Field label="Account">{formatStatus(customer.status)}</Field>
        <Field label="Email">{customer.emailVerified ? `Verified ${formatDateTime(customer.emailVerifiedAt)}` : 'Not verified'}</Field>
        <Field label="Password">{customer.passwordSetupPending ? 'Not set yet (welcome link sent)' : 'Set'}</Field>
        <Field label="Date of birth">{customer.dob ?? '—'}</Field>
        <Field label="Reward points">{customer.rewardPoints ?? 0}</Field>
        <Field label="Joined">
          {formatDateTime(customer.registeredAt)}
          {customer.registeredBy ? ` at a store by ${customer.registeredBy}` : ' on the storefront'}
        </Field>
        <Field label="Last profile change">{formatDateTime(customer.updatedAt)}</Field>
      </dl>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-black dark:text-white">Addresses</h2>
        {customer.addresses.length === 0 ? (
          <p className="text-xs text-gray-500">No address saved.</p>
        ) : (
          <ul className="grid md:grid-cols-2 gap-2">
            {customer.addresses.map((address) => (
              <li key={address.id} className="flex gap-2 rounded-xl border border-black/10 dark:border-white/10 p-3 text-xs">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0 text-gray-700 dark:text-gray-300">
                  <p className="font-semibold text-black dark:text-white">
                    {address.recipientName} · {address.phoneNumber}
                    {address.isDefault && <span className="ml-2 text-[10px] font-semibold text-emerald-600">Default</span>}
                  </p>
                  <p>
                    {[address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode, address.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
