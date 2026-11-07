import React, { useEffect, useState } from 'react';
import { BellRing, Building2, KeyRound, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supplierPortalApi } from '../api/supplierPortalApi';
import type { SupplierOrder, SupplierProfile } from '../types/supplierPortal.types';
import { PasswordTab } from '../../../components/profile/PasswordTab';
import { useNotify } from '../../../hooks/useNotify';

const Row: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => (
  <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b last:border-0 border-black/5 dark:border-white/5 text-sm">
    <dt className="text-gray-500 dark:text-neutral-400">{label}</dt>
    <dd className="font-medium break-words">{value?.trim() ? value : '—'}</dd>
  </div>
);

/**
 * A supplier's profile: the business details on record (read-only; the supplier manager keeps them up to date) and
 * their password.
 */
export const SupplierProfilePage: React.FC = () => {
  const notify = useNotify();
  const [tab, setTab] = useState<'details' | 'password'>('details');
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [awaiting, setAwaiting] = useState<SupplierOrder[]>([]);

  useEffect(() => {
    let current = true;
    supplierPortalApi
      .getProfile()
      .then((res) => {
        if (!current) return;
        if (res.success && res.data) setProfile(res.data);
        else notify.error(res, 'Your details could not be loaded.');
      })
      .catch((err: unknown) => current && notify.error(err, 'Your details could not be loaded.'));
    // Orders waiting for the supplier, so they are not missed; the orders page shows the details
    supplierPortalApi
      .getOrders()
      .then((res) => {
        if (current && res.success) setAwaiting((res.data ?? []).filter((order) => order.awaitingYourResponse));
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [notify]);

  const address = profile
    ? [profile.street, profile.landmark, profile.city, profile.district, profile.state, profile.pincode, profile.country]
        .filter((part) => part && part.trim())
        .join(', ')
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supplier Profile</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
          Your business details as the procurement team has them. Ask your supplier manager to correct anything that is out of date.
        </p>
      </div>

      {awaiting.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#0071e3]/30 bg-[#0071e3]/5 px-4 py-3 text-sm max-w-2xl">
          <BellRing className="w-4 h-4 text-[#0071e3] dark:text-blue-400 shrink-0" />
          <span className="flex-1 min-w-0">
            {awaiting.length === 1 ? `Order ${awaiting[0].orderNumber} is` : `${awaiting.length} orders are`} waiting for you to accept or reject.
          </span>
          <Link to="/supplier/orders" className="text-xs font-semibold text-[#0071e3] dark:text-blue-400 hover:underline">
            Review in My Orders
          </Link>
        </div>
      )}

      <div className="flex items-center gap-6 border-b border-black/10 dark:border-white/10">
        {(
          [
            { id: 'details', label: 'Business details', Icon: Building2 },
            { id: 'password', label: 'Password', Icon: KeyRound },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`pb-2 text-sm font-medium flex items-center gap-2 cursor-pointer ${
              tab === id ? 'text-[#0071e3] dark:text-blue-400 font-semibold border-b-2 border-[#0071e3]' : 'text-gray-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'password' && <PasswordTab />}
      {tab === 'details' &&
        (profile ? (
          <dl className="apple-card p-5 max-w-2xl">
            <Row label="Business name" value={profile.name} />
            <Row label="Trade name" value={profile.tradeName} />
            <Row label="Sign-in username" value={profile.username} />
            <Row label="Email" value={profile.email} />
            <Row label="Phone" value={profile.phoneNumber} />
            <Row label="Alternate phone" value={profile.alternatePhoneNumber} />
            <Row label="Address" value={address} />
            <Row label="GSTIN" value={profile.gstin} />
            <Row label="PAN" value={profile.panNumber} />
          </dl>
        ) : (
          <div className="py-10 flex justify-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ))}
    </div>
  );
};
