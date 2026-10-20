import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, PackageCheck, RefreshCw } from 'lucide-react';
import type { AdminOrderSummary } from '../../order-tracking/types/orderTracking.types';
import { formatCurrency, formatDateTime, summarizeItems } from '../../order-tracking/utils/orderTracking.utils';
import { formatPaymentStatus } from '../../order-tracking/utils/payment.utils';
import { getPaymentBlockReason } from '../../order-tracking/utils/statusWorkflow';
import { ORDER_TRACKING_LIST_PATH, orderDetailPath, type OrderDetailLocationState } from '../../order-tracking/utils/orderTrackingRoutes';

const BACK_STATE: OrderDetailLocationState = { backLabel: 'Back to approvals' };

interface Props {
  orders: AdminOrderSummary[];
  total: number;
  isLoading: boolean;
  onRefresh: () => void;
}

/**
 * The Approvals hub's Pre-orders tab: customer orders placed while out of stock, waiting for approval. Review opens the
 * order, where stock readiness and payment are checked and the pre-order is approved.
 */
export const PreOrderApprovalsPanel: React.FC<Props> = ({ orders, total, isLoading, onRefresh }) => (
  <section aria-label="Pre-orders awaiting approval" className="apple-card p-5 space-y-4 text-xs">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-[#0071e3]" /> Pre-orders awaiting approval
          <span className="text-xs text-gray-400">({total})</span>
        </h2>
        <p className="text-gray-500 dark:text-neutral-400 mt-1 max-w-2xl">
          Approving reserves the stock and confirms the order. It needs enough stock for every pre-order line and a fully
          paid order; the order page shows both.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh pre-orders"
        className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>

    {orders.length === 0 ? (
      <p className="text-sm text-gray-500">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'No pre-orders waiting.'}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left" aria-label="Pre-orders">
          <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="pb-2 pr-3 font-semibold">Order</th>
              <th className="pb-2 pr-3 font-semibold">Customer</th>
              <th className="pb-2 pr-3 font-semibold">Items</th>
              <th className="pb-2 pr-3 font-semibold text-right">Total</th>
              <th className="pb-2 pr-3 font-semibold">Payment</th>
              <th className="pb-2 pr-3 font-semibold">Placed</th>
              <th className="pb-2 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
            {orders.map((order) => {
              const paid = !getPaymentBlockReason(order.paymentStatus);
              return (
                <tr key={order.id}>
                  <td className="py-2.5 pr-3 font-mono font-semibold">{order.orderNumber}</td>
                  <td className="py-2.5 pr-3">{order.customer?.name || order.customer?.email || '—'}</td>
                  <td className="py-2.5 pr-3">{summarizeItems(order.items)}</td>
                  <td className="py-2.5 pr-3 text-right font-mono">{formatCurrency(order.totalAmount)}</td>
                  <td className={`py-2.5 pr-3 font-semibold ${paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {formatPaymentStatus(order.paymentStatus)}
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">{formatDateTime(order.createdAt)}</td>
                  <td className="py-2.5 text-right">
                    <Link
                      to={orderDetailPath(order.orderNumber)}
                      state={BACK_STATE}
                      aria-label={`Review pre-order ${order.orderNumber}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold"
                    >
                      Review <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}

    {total > orders.length && (
      <Link to={`${ORDER_TRACKING_LIST_PATH}?status=PRE_ORDER_PENDING`} className="inline-flex items-center gap-1 text-[#0071e3] font-semibold hover:underline">
        Showing the oldest {orders.length} of {total}. See all in Order tracking <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    )}
  </section>
);
