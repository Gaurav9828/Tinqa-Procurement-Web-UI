import React from 'react';
import type { PromoRedemption } from '../types/promoCode.types';
import { formatCurrency, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { Pager } from '../../../components/ui/Pager';

/** One page of the orders that used a code, newest first. A cancelled order's use was given back. */
export const PromoRedemptionList: React.FC<{
  rows: PromoRedemption[];
  isLoading: boolean;
  hasLoaded: boolean;
  loadFailed: boolean;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}> = ({ rows, isLoading, hasLoaded, loadFailed, page, totalPages, onPage }) => {
  if (!hasLoaded) {
    if (isLoading) return <p role="status" className="p-3 text-center text-gray-500">Loading...</p>;
    return <p className="p-3 text-center text-gray-500">{loadFailed ? 'The use history could not be loaded.' : ''}</p>;
  }
  if (rows.length === 0) return <p className="p-3 text-center text-gray-500">Nobody has used this code yet.</p>;
  return (
    <div className="space-y-2">
      <ul aria-label="Orders that used the code" aria-busy={isLoading} className="divide-y divide-black/5 dark:divide-white/10 rounded-xl border border-black/10 dark:border-white/10">
        {rows.map((row) => (
          <li key={row.id} className={`p-3 flex flex-col sm:flex-row sm:items-center gap-2 ${row.counted ? '' : 'opacity-70'}`}>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-black dark:text-white">
                #{row.orderNumber} <span className="font-normal text-gray-500">· {row.orderStatus}</span>
                {!row.counted && (
                  <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400">
                    Cancelled, use given back
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {row.customerName} · {row.customerEmail} · {formatDateTime(row.redeemedAt)}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-right shrink-0">
              <div>
                <dt className="text-[10px] text-gray-500">Units</dt>
                <dd className="text-black dark:text-white">{row.unitsDiscounted}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-gray-500">Discount</dt>
                <dd className="text-black dark:text-white" title={`Before discount ${formatCurrency(row.amountBeforeDiscount)}`}>
                  {formatCurrency(row.discountAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-gray-500">Order total</dt>
                <dd className="text-black dark:text-white">{formatCurrency(row.orderTotal)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <Pager page={page} totalPages={totalPages} disabled={isLoading} onPage={onPage} />
    </div>
  );
};
