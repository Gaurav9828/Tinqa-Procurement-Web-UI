import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { formatDateTime, formatUpdater } from '../../order-tracking/utils/orderTracking.utils';
import { formatPaise } from '../../order-tracking/utils/payment.utils';
import { orderDetailPath, type OrderDetailLocationState } from '../../order-tracking/utils/orderTrackingRoutes';
import type { RefundStatus } from '../types/refund.types';
import { useRefundList } from '../hooks/useRefundList';
import { REFUND_STATUSES, REFUND_STATUS_LABELS, formatRefundSpeed } from '../utils/refund.utils';
import { RefundStatusBadge } from './RefundStatusBadge';
import { RefundReviewControls } from './RefundReviewControls';

const PAGE_SIZE = 20;
const ALL = 'ALL';
const BACK_STATE: OrderDetailLocationState = { backLabel: 'Back to refunds' };

/** Refund approvals queue (GET /admin/refunds): awaiting approval by default, with a status filter, paging and inline actions. */
export const RefundsQueue: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const [status, setStatus] = useState<RefundStatus | typeof ALL>('REQUESTED');
  const [page, setPage] = useState(0);
  const { data, isLoading, loadFailed, refresh } = useRefundList({ status: status === ALL ? undefined : status, page, size: PAGE_SIZE });
  // After an approve / reject / sync, reload the list and let the hub update its pending count.
  const handleChanged = useCallback(() => {
    refresh();
    onChanged?.();
  }, [refresh, onChanged]);

  const rows = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <section aria-label="Refund approvals" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white">Refunds</h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-0.5">
            Refunds are requested from the order page; a different refund approver approves them here. Approval sends the money via Razorpay.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Refund status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RefundStatus | typeof ALL);
              setPage(0);
            }}
            className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-black dark:text-white cursor-pointer"
          >
            {REFUND_STATUSES.map((value) => (
              <option key={value} value={value} className="bg-white dark:bg-[#1c1c1e]">
                {REFUND_STATUS_LABELS[value]}
              </option>
            ))}
            <option value={ALL} className="bg-white dark:bg-[#1c1c1e]">
              All refunds
            </option>
          </select>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh refunds"
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-10 text-gray-400" role="status" aria-label="Loading refunds">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : loadFailed && !data ? (
        <div className="py-10 text-center text-gray-500 space-y-2">
          <p>Refunds couldn't be loaded.</p>
          <button type="button" onClick={refresh} className="font-semibold text-black dark:text-white cursor-pointer">
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-gray-500" role="status">
          {status === 'REQUESTED' ? 'No refunds are awaiting approval.' : 'No refunds match this status.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Refunds">
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="pb-2 pr-3 font-semibold">Order</th>
                <th className="pb-2 pr-3 font-semibold text-right">Amount</th>
                <th className="pb-2 pr-3 font-semibold">Status</th>
                <th className="pb-2 pr-3 font-semibold">Reason</th>
                <th className="pb-2 pr-3 font-semibold">Requested</th>
                <th className="pb-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
              {rows.map((refund) => (
                <tr key={refund.id}>
                  <td className="py-3 pr-3">
                    <Link to={orderDetailPath(refund.orderNumber)} state={BACK_STATE} className="font-mono font-semibold text-[#0071e3] hover:underline">
                      {refund.orderNumber}
                    </Link>
                    <div className="text-gray-400">#{refund.id}</div>
                  </td>
                  <td className="py-3 pr-3 text-right whitespace-nowrap">
                    <div className="font-semibold text-black dark:text-white">{formatPaise(refund.amountPaise, refund.currency)}</div>
                    <div className="text-gray-400">{formatRefundSpeed(refund.speedProcessed ?? refund.speed)}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <RefundStatusBadge status={refund.status} />
                    {refund.failureReason && <div className="mt-1 text-rose-600 dark:text-rose-400 max-w-[14rem] break-words">{refund.failureReason}</div>}
                  </td>
                  <td className="py-3 pr-3 max-w-xs break-words whitespace-pre-line">{refund.reason}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <div className="font-semibold">{formatUpdater(refund.requestedBy)}</div>
                    <div className="text-gray-400">{formatDateTime(refund.requestedAt)}</div>
                  </td>
                  <td className="py-3">
                    <RefundReviewControls refund={refund} onChanged={handleChanged} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-gray-500">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 0 || isLoading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={page + 1 >= totalPages || isLoading}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
