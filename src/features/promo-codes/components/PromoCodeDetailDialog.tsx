import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Power, RotateCcw, Trash2 } from 'lucide-react';
import type { PromoCodeDetail } from '../types/promoCode.types';
import { usePromoRedemptions } from '../hooks/usePromoCodes';
import { discountLabel, formatDay, productUnitsLabel, unitsLabel, usesLabel } from '../utils/promoCodeForm';
import { PromoDialog, PromoStatusChip } from './PromoUi';
import { PromoRedemptionList } from './PromoRedemptionList';
import { formatCurrency, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { SOLID_TONE } from '../../../components/ui/actionTones';

const totalLabel = (limit: number | null) => (limit === null ? 'No limit' : `${limit} in all`);
const usedLabel = (times: number) => `${times} ${times === 1 ? 'time' : 'times'}`;

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-[10px] text-gray-500">{label}</dt>
    <dd className="text-black dark:text-white font-medium">{children}</dd>
  </div>
);

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

/** What a Super Admin can do with a code from its detail. */
export interface PromoDetailActions {
  onEdit: (detail: PromoCodeDetail) => void;
  onToggle: (detail: PromoCodeDetail) => void;
  onDelete: (detail: PromoCodeDetail) => void;
  onRestore: (detail: PromoCodeDetail) => void;
}

const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium cursor-pointer';

// A deleted code is only restored; a live one is switched, deleted or edited
const ManageButtons: React.FC<{ detail: PromoCodeDetail } & PromoDetailActions> = ({ detail, onEdit, onToggle, onDelete, onRestore }) => (
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

const PromoDetailBody: React.FC<{ detail: PromoCodeDetail; canManage: boolean } & PromoDetailActions> = ({ detail, canManage, ...actions }) => {
  const changed = detail.updatedAt && detail.updatedBy ? ` · changed by ${detail.updatedBy} on ${formatDateTime(detail.updatedAt)}` : '';
  const deleted = detail.deletedAt ? ` · deleted by ${detail.deletedBy ?? '—'} on ${formatDateTime(detail.deletedAt)}` : '';
  const customers = detail.customerScope === 'ALL' ? null : detail.customers.map((c) => ({ id: c.id, label: c.name, detail: c.email }));
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

      <ScopeList title="Customers" all="Every signed-in customer." items={customers} />
      <ScopeList title="Products" all="Every product." items={products} />

      {canManage && <ManageButtons detail={detail} {...actions} />}
    </>
  );
};

/**
 * One code: who and what it is for, its limits and dates, and (once opened) the orders that used it. A Super Admin
 * edits it, switches it off or on, deletes or restores it from here.
 */
export const PromoCodeDetailDialog: React.FC<
  {
    id: number;
    detail: PromoCodeDetail | null;
    isLoading: boolean;
    canManage: boolean;
    onClose: () => void;
  } & PromoDetailActions
> = ({ id, detail, isLoading, canManage, onClose, ...actions }) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = usePromoRedemptions(id, historyOpen);

  return (
    <PromoDialog
      wide
      label={detail ? `Promo code ${detail.code}` : 'Promo code'}
      title={detail ? <span className="font-mono">{detail.code}</span> : 'Promo code'}
      subtitle={detail?.description}
      onClose={onClose}
    >
      {!detail ? (
        <p role="status" className="p-6 text-center text-gray-500">{isLoading ? 'Loading...' : 'This promo code could not be loaded.'}</p>
      ) : (
        <PromoDetailBody detail={detail} canManage={canManage} {...actions} />
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
