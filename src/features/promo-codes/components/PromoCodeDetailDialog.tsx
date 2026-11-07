import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, EyeOff, Mail, Pencil, Power, RotateCcw, Store, Trash2 } from 'lucide-react';
import type { PromoCodeDetail, PromoCustomer } from '../types/promoCode.types';
import { usePromoRedemptions } from '../hooks/usePromoCodes';
import { canBeShared, discountLabel, formatDay, productUnitsLabel, unitsLabel, usesLabel } from '../utils/promoCodeForm';
import { PromoDialog, PromoStatusChip } from './PromoUi';
import { PromoRedemptionList } from './PromoRedemptionList';
import { formatCurrency, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import { useNotify } from '../../../hooks/useNotify';

const totalLabel = (limit: number | null) => (limit === null ? 'No limit' : `${limit} in all`);
const usedLabel = (times: number) => `${times} ${times === 1 ? 'time' : 'times'}`;

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-[10px] text-gray-500">{label}</dt>
    <dd className="text-black dark:text-white font-medium">{children}</dd>
  </div>
);

const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium cursor-pointer';

const ScopeList: React.FC<{ title: string; all: string; items: { id: number; label: string; detail?: string }[] | null }> = ({ title, all, items }) => (
  <section aria-label={title} className="space-y-1">
    <h3 className="font-semibold text-black dark:text-white">{title}</h3>
    {items === null ? (
      <p className="text-gray-500">{all}</p>
    ) : (
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item.id} title={item.detail} className="px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10">
            {item.label} {item.detail && <span className="text-gray-500">{item.detail}</span>}
          </li>
        ))}
      </ul>
    )}
  </section>
);

/** What a Super Admin (edit … restore) and a sharer (share, storefront) can do with a code from its detail. */
export interface PromoDetailActions {
  onEdit: (detail: PromoCodeDetail) => void;
  onToggle: (detail: PromoCodeDetail) => void;
  onDelete: (detail: PromoCodeDetail) => void;
  onRestore: (detail: PromoCodeDetail) => void;
  /** Email the code to these customers (all of its customers when every one is listed). */
  onShare: (detail: PromoCodeDetail, customers: PromoCustomer[]) => void;
  onStorefront: (detail: PromoCodeDetail, shown: boolean) => void;
}

const sharedLabel = (customer: PromoCustomer) => {
  if (customer.timesShared === 0 || !customer.lastSharedAt) return 'Not emailed yet';
  const times = customer.timesShared === 1 ? 'once' : `${customer.timesShared} times`;
  return `Emailed ${times}, last on ${formatDateTime(customer.lastSharedAt)}`;
};

/** Chosen customers, each with when the code was last emailed to them and (for sharers) a button to email it. */
const CustomerShareList: React.FC<{ detail: PromoCodeDetail; canShare: boolean; onShare: PromoDetailActions['onShare'] }> = ({
  detail,
  canShare,
  onShare,
}) => {
  const shareable = canShare && canBeShared(detail);
  return (
    <section aria-label="Customers" className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-black dark:text-white">Customers</h3>
        {shareable && detail.customers.length > 1 && (
          <button type="button" onClick={() => onShare(detail, detail.customers)} className={`${btn} ${SOLID_TONE.primary}`}>
            <Mail className="w-3.5 h-3.5" /> Email all {detail.customers.length}
          </button>
        )}
      </div>
      <ul className="divide-y divide-black/5 dark:divide-white/10 rounded-xl border border-black/10 dark:border-white/10">
        {detail.customers.map((customer) => (
          <li key={customer.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span>
              <span className="text-black dark:text-white font-medium">{customer.name}</span>{' '}
              <span className="text-gray-500">{customer.email}</span>
              <span className="block text-[10px] text-gray-500">{sharedLabel(customer)}</span>
            </span>
            {shareable && (
              <button
                type="button"
                onClick={() => onShare(detail, [customer])}
                aria-label={`Email the code to ${customer.name}`}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${CHOICE_TONE.approve.idle}`}
              >
                <Mail className="w-3 h-3" /> Email code
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

/** An everyone code: whether every storefront visitor sees it, and (for sharers) the switch. */
const StorefrontSection: React.FC<{ detail: PromoCodeDetail; canShare: boolean; onStorefront: PromoDetailActions['onStorefront'] }> = ({
  detail,
  canShare,
  onStorefront,
}) => (
  <section aria-label="Storefront" className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
    <p className="text-gray-600 dark:text-neutral-300">
      <Store className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
      {detail.shownOnStorefront
        ? 'Shown on the storefront: every visitor sees this code and its offer while it can be used.'
        : 'Not shown on the storefront. Customers use it only if they are told the code.'}
    </p>
    {canShare && detail.status !== 'DELETED' && (detail.shownOnStorefront || canBeShared(detail)) && (
      <button
        type="button"
        onClick={() => onStorefront(detail, !detail.shownOnStorefront)}
        className={`${btn} ${detail.shownOnStorefront ? SOLID_TONE.warning : SOLID_TONE.approve}`}
      >
        <Store className="w-3.5 h-3.5" /> {detail.shownOnStorefront ? 'Remove from storefront' : 'Show on storefront'}
      </button>
    )}
  </section>
);


// A deleted code is only restored; a live one is switched, deleted or edited
const ManageButtons: React.FC<{ detail: PromoCodeDetail } & Omit<PromoDetailActions, 'onShare' | 'onStorefront'>> = ({ detail, onEdit, onToggle, onDelete, onRestore }) => (
  <div className="flex flex-wrap justify-end gap-2">
    {detail.status === 'DELETED' ? (
      <button type="button" onClick={() => onRestore(detail)} className={`${btn} ${SOLID_TONE.approve}`}>
        <RotateCcw className="w-3.5 h-3.5" /> Restore
      </button>
    ) : (
      <>
        <button type="button" onClick={() => onDelete(detail)} className={`${btn} ${SOLID_TONE.danger}`}>
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
        <button type="button" onClick={() => onToggle(detail)} className={`${btn} ${detail.active ? SOLID_TONE.warning : SOLID_TONE.approve}`}>
          <Power className="w-3.5 h-3.5" /> {detail.active ? 'Switch off' : 'Switch on'}
        </button>
        <button type="button" onClick={() => onEdit(detail)} className={`${btn} ${SOLID_TONE.primary}`}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      </>
    )}
  </div>
);

const PromoDetailBody: React.FC<{ detail: PromoCodeDetail; canManage: boolean; canShare: boolean } & PromoDetailActions> = ({
  detail,
  canManage,
  canShare,
  onShare,
  onStorefront,
  ...actions
}) => {
  const changed = detail.updatedAt && detail.updatedBy ? ` · changed by ${detail.updatedBy} on ${formatDateTime(detail.updatedAt)}` : '';
  const deleted = detail.deletedAt ? ` · deleted by ${detail.deletedBy ?? '—'} on ${formatDateTime(detail.deletedAt)}` : '';
  const products =
    detail.productScope === 'ALL' ? null : detail.products.map((p) => ({ id: p.id, label: p.title, detail: `on ${productUnitsLabel(p.maxUnits)}` }));
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PromoStatusChip status={detail.status} />
        <span className="text-gray-500">
          Created by {detail.createdBy ?? '—'} on {formatDateTime(detail.createdAt)}
          {changed}
          {deleted}
        </span>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
        <Fact label="Discount">
          {discountLabel(detail)} off {detail.discountType === 'AMOUNT' ? "each unit's list price" : 'the list price'}
        </Fact>
        <Fact label="Valid">{formatDay(detail.startsOn)} – {formatDay(detail.expiresOn)}</Fact>
        <Fact label="Units per product">{detail.productScope === 'ALL' ? unitsLabel(detail.maxUnitsPerProduct) : 'Set per product'}</Fact>
        <Fact label="Uses per customer">{usesLabel(detail.usageLimitPerCustomer)}</Fact>
        <Fact label="Total uses">{totalLabel(detail.totalUsageLimit)}</Fact>
        <Fact label="Used">{usedLabel(detail.timesUsed)}</Fact>
        <Fact label="Discount given">{formatCurrency(detail.totalDiscountGiven)}</Fact>
      </dl>

      {detail.codeHidden && (
        <p className="flex items-start gap-1.5 p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-200">
          <EyeOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          This code is only for the customers below, so only the Super Admin sees it in full.{' '}
          {canShare ? 'Use "Email code" to send it to them.' : 'Ask someone who shares promo codes to email it to them.'}
        </p>
      )}

      {detail.customerScope === 'ALL' ? (
        <>
          <ScopeList title="Customers" all="Every signed-in customer." items={null} />
          <StorefrontSection detail={detail} canShare={canShare} onStorefront={onStorefront} />
        </>
      ) : (
        <CustomerShareList detail={detail} canShare={canShare} onShare={onShare} />
      )}
      <ScopeList title="Products" all="Every product." items={products} />

      {canManage && <ManageButtons detail={detail} {...actions} />}
    </>
  );
};

/** Copies a code staff may see in full; a masked code has nothing to copy. */
const CopyCode: React.FC<{ code: string }> = ({ code }) => {
  const notify = useNotify();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      notify.success('Promo code copied.');
    } catch {
      notify.error('The promo code could not be copied.');
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label="Copy the code"
      className="ml-2 inline-flex items-center p-1 rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
};

/**
 * One code: who and what it is for, its limits and dates, and (once opened) the orders that used it. A Super Admin
 * edits it, switches it off or on, deletes or restores it from here; a sharer emails a chosen customers' code to them
 * or shows an everyone code on the storefront.
 */
export const PromoCodeDetailDialog: React.FC<
  {
    id: number;
    detail: PromoCodeDetail | null;
    isLoading: boolean;
    canManage: boolean;
    canShare: boolean;
    onClose: () => void;
  } & PromoDetailActions
> = ({ id, detail, isLoading, canManage, canShare, onClose, ...actions }) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = usePromoRedemptions(id, historyOpen);

  return (
    <PromoDialog
      wide
      label={detail ? `Promo code ${detail.code}` : 'Promo code'}
      title={
        detail ? (
          <span className="inline-flex items-center">
            <span className="font-mono break-all">{detail.code}</span>
            {!detail.codeHidden && <CopyCode code={detail.code} />}
          </span>
        ) : (
          'Promo code'
        )
      }
      subtitle={detail?.description}
      onClose={onClose}
    >
      {!detail ? (
        <p role="status" className="p-6 text-center text-gray-500">{isLoading ? 'Loading...' : 'This promo code could not be loaded.'}</p>
      ) : (
        <PromoDetailBody detail={detail} canManage={canManage} canShare={canShare} {...actions} />
      )}

      <section aria-label="Use history" className="space-y-2 border-t border-black/10 dark:border-white/10 pt-3">
        <button
          type="button"
          aria-expanded={historyOpen}
          onClick={() => setHistoryOpen((open) => !open)}
          className="inline-flex items-center gap-1 font-semibold text-black dark:text-white cursor-pointer"
        >
          {historyOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          Use history{history.hasLoaded ? ` (${history.totalElements})` : ''}
        </button>
        {historyOpen && (
          <PromoRedemptionList
            rows={history.rows}
            isLoading={history.isLoading}
            hasLoaded={history.hasLoaded}
            loadFailed={history.loadFailed}
            page={history.page}
            totalPages={history.totalPages}
            onPage={history.setPage}
          />
        )}
      </section>
    </PromoDialog>
  );
};
