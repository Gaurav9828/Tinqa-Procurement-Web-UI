import React, { useState } from 'react';
import { CheckCircle2, Clock, Loader2, PackageCheck } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import type { AdminOrderDetail } from '../types/orderTracking.types';
import { getPaymentBlockReason } from '../utils/statusWorkflow';

interface Props {
  order: AdminOrderDetail;
  /** The admin may act on orders (UX only; the backend authorizes the request). */
  canAct: boolean;
  isApproving: boolean;
  onApprove: () => Promise<boolean>;
}

/**
 * Pre-order review: readiness, requested quantity vs. current stock per pre-order line, and the
 * dedicated approval action. The button follows the server's `canApprovePreOrder`; the server
 * still rechecks stock on approval.
 */
export const PreOrderReviewCard: React.FC<Props> = ({ order, canAct, isApproving, onApprove }) => {
  const [confirming, setConfirming] = useState(false);

  const lines = (order.items ?? []).filter((item) => item.preOrder);
  const isWaiting = order.orderStatus === 'PRE_ORDER_PENDING';
  // Approval confirms the order, so it also needs a fully paid order (the backend enforces this too).
  const paymentBlockReason = getPaymentBlockReason(order.paymentStatus);
  const canApprove = !!order.canApprovePreOrder && !paymentBlockReason;
  const isApproved = !isWaiting && order.orderStatus !== 'PRE_ORDER_RECEIVED' && order.orderStatus !== 'CANCELLED';

  // Readiness is the server's decision (it sums quantities per product); per-line marks are a guide.
  const totalRequestedByProduct = lines.reduce<Record<number, number>>((acc, item) => {
    acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
    return acc;
  }, {});

  return (
    <section aria-label="Pre-order review" className="apple-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-[#0071e3]" /> Pre-order review
        </h2>
        {isWaiting ? (
          <span
            data-testid="pre-order-readiness"
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full border ${
              order.preOrderReady
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
          >
            {order.preOrderReady ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {order.preOrderReady ? 'Stock ready' : 'Waiting for stock'}
          </span>
        ) : isApproved ? (
          <span data-testid="pre-order-readiness" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved — stock reserved
          </span>
        ) : null}
      </div>

      {lines.length > 0 && (
        <table className="w-full text-left" aria-label="Pre-order lines">
          <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="pb-2 font-semibold">Product</th>
              <th className="pb-2 font-semibold text-right">Requested</th>
              {isWaiting && <th className="pb-2 font-semibold text-right">Available now</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
            {lines.map((item, index) => {
              const available = item.availableStock;
              const short = typeof available === 'number' && available < (totalRequestedByProduct[item.productId] ?? item.quantity);
              return (
                <tr key={`${item.productId}-${index}`} data-short={isWaiting && short ? 'true' : undefined}>
                  <td className="py-2 pr-2">{item.title}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  {isWaiting && (
                    <td className={`py-2 text-right font-semibold ${short ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {typeof available === 'number' ? available : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {isWaiting && canAct && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={!canApprove || isApproving}
            onClick={() => setConfirming(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isApproving ? 'Approving…' : 'Approve pre-order'}
          </button>
          <p className="text-[11px] text-gray-500 dark:text-neutral-400">
            {paymentBlockReason
              ? paymentBlockReason
              : order.canApprovePreOrder
                ? 'Approving reserves the stock and moves the order to Pre-order Confirmed. Stock is checked again at approval.'
                : 'Approval becomes available once every pre-order product has enough stock for its ordered quantity.'}
          </p>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirming}
        actionType="CONFIRM"
        title="Approve this pre-order?"
        description={`Stock for order ${order.orderNumber} will be reserved and the order moves to Pre-order Confirmed. Normal fulfilment can then continue.`}
        isSubmitting={isApproving}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await onApprove();
          setConfirming(false);
        }}
      />
    </section>
  );
};
