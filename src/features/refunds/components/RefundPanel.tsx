import React, { useState } from 'react';
import { Loader2, RefreshCw, Undo2 } from 'lucide-react';
import { formatDateTime, formatUpdater } from '../../order-tracking/utils/orderTracking.utils';
import { formatPaise, formatPaymentMethod } from '../../order-tracking/utils/payment.utils';
import { CopyableId } from '../../order-tracking/components/CopyableId';
import type { OrderRefundsState } from '../hooks/useOrderRefunds';
import type { Refund, RefundablePayment } from '../types/refund.types';
import { useRefundAccess } from '../hooks/useRefundAccess';
import { useRequestRefund } from '../hooks/useRefundMutations';
import { formatRefundSpeed } from '../utils/refund.utils';
import { RefundStatusBadge } from './RefundStatusBadge';
import { RefundReviewControls } from './RefundReviewControls';
import { RequestRefundDialog } from './RequestRefundDialog';

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-gray-400">{children}</span>;

const Field: React.FC<{ label: string; children: React.ReactNode; testId?: string }> = ({ label, children, testId }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="mt-1 text-black dark:text-white break-words" data-testid={testId}>
      {children}
    </dd>
  </div>
);

const PaymentRow: React.FC<{ payment: RefundablePayment }> = ({ payment }) => (
  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]" aria-label={`Payment ${payment.razorpayPaymentId}`}>
    <div className="col-span-2 sm:col-span-3">
      <Field label="Razorpay payment ID">
        <CopyableId value={payment.razorpayPaymentId} label="Payment ID" />
      </Field>
    </div>
    <Field label="Paid" testId="refund-paid">{formatPaise(payment.amountPaise, payment.currency)}</Field>
    <Field label="Refunded" testId="refund-refunded">{formatPaise(payment.amountRefundedPaise, payment.currency)}</Field>
    <Field label="Refundable" testId="refund-refundable">
      <span className="font-semibold">{formatPaise(payment.refundablePaise, payment.currency)}</span>
    </Field>
    <Field label="Method">{payment.paymentInstrument ? formatPaymentMethod(payment.paymentInstrument) : <Muted>Not recorded</Muted>}</Field>
    <Field label="Paid at">{formatDateTime(payment.paidAt)}</Field>
    <Field label="Refund window ends">
      {formatDateTime(payment.refundWindowEndsAt)}
      {!payment.refundWindowOpen && <span className="ml-1 text-rose-600 dark:text-rose-400 font-semibold">(closed)</span>}
    </Field>
    {payment.refundInProgress && (
      <p className="col-span-2 sm:col-span-3 text-amber-700 dark:text-amber-400">A refund on this payment is in progress.</p>
    )}
  </dl>
);

/** What is happening right now, for statuses that need explaining. */
const StatusNote: React.FC<{ refund: Refund }> = ({ refund }) => {
  if (refund.status === 'PENDING') return <p className="text-purple-700 dark:text-purple-300">Waiting for Razorpay to complete the refund.</p>;
  if (refund.status === 'APPROVED') {
    return refund.failureReason ? (
      <p className="text-rose-600 dark:text-rose-400" data-testid="refund-failure">
        Razorpay couldn't be reached: {refund.failureReason} The refund is still approved and can be retried.
      </p>
    ) : (
      <p className="text-blue-700 dark:text-blue-300">Approved — sending to Razorpay.</p>
    );
  }
  if (refund.status === 'FAILED' && refund.failureReason) {
    return (
      <p className="text-rose-600 dark:text-rose-400" data-testid="refund-failure">
        Failed: {refund.failureReason}
      </p>
    );
  }
  return null;
};

const RefundHistoryItem: React.FC<{ refund: Refund; onChanged: () => void }> = ({ refund, onChanged }) => (
  <li className="p-4 rounded-xl border border-black/5 dark:border-white/10 space-y-3" aria-label={`Refund ${refund.id}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <RefundStatusBadge status={refund.status} />
        <span className="text-sm font-semibold text-black dark:text-white">{formatPaise(refund.amountPaise, refund.currency)}</span>
        <span className="text-gray-500">· {formatRefundSpeed(refund.speedProcessed ?? refund.speed)}</span>
      </div>
      <span className="text-gray-400">#{refund.id}</span>
    </div>

    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line break-words">
      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mr-1.5">Reason</span>
      {refund.reason}
    </p>

    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Requested">
        {formatDateTime(refund.requestedAt)} by <span className="font-semibold">{formatUpdater(refund.requestedBy)}</span>
      </Field>
      {refund.approvedBy && (
        <Field label="Approved">
          {formatDateTime(refund.approvedAt)} by <span className="font-semibold">{refund.approvedBy}</span>
        </Field>
      )}
      {refund.rejectedBy && (
        <Field label="Rejected">
          {formatDateTime(refund.rejectedAt)} by <span className="font-semibold">{refund.rejectedBy}</span>
        </Field>
      )}
      {refund.razorpayRefundId && (
        <Field label="Razorpay refund ID">
          <CopyableId value={refund.razorpayRefundId} label="Refund ID" />
        </Field>
      )}
      {refund.processedAt && <Field label="Processed">{formatDateTime(refund.processedAt)}</Field>}
    </dl>

    {refund.reviewComment && (
      <p className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 whitespace-pre-line break-words" data-testid="refund-review-comment">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mr-1.5">Review comment</span>
        {refund.reviewComment}
      </p>
    )}
    <StatusNote refund={refund} />
    <RefundReviewControls refund={refund} onChanged={onChanged} />
  </li>
);

/**
 * Refunds for one order: its Razorpay payments (paid / refunded / refundable), the refund history and the
 * maker-checker actions. Hidden for orders with nothing paid and no refunds.
 */
export const RefundPanel: React.FC<{ orderNumber: string; refunds: OrderRefundsState; onChanged: () => void }> = ({
  orderNumber,
  refunds,
  onChanged,
}) => {
  const access = useRefundAccess();
  const { requestRefund, isSubmitting } = useRequestRefund(orderNumber, onChanged);
  const [requestOpen, setRequestOpen] = useState(false);
  const { summary } = refunds;

  if (!summary) {
    if (refunds.isLoading) {
      return (
        <section aria-label="Refunds" className="apple-card p-5 flex items-center gap-2 text-gray-400" role="status">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading refunds…
        </section>
      );
    }
    if (!refunds.loadFailed) return null;
    return (
      <section aria-label="Refunds" className="apple-card p-5 flex items-center justify-between gap-2 text-gray-500">
        <span>Refund details couldn't be loaded.</span>
        <button type="button" onClick={refunds.retry} className="flex items-center gap-1 font-semibold text-black dark:text-white cursor-pointer">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </section>
    );
  }

  if (!summary.payments.length && !summary.refunds.length) return null;

  // Prefer payments that can be refunded right now; the server re-checks everything.
  const open = summary.payments.filter((p) => p.refundablePaise > 0 && p.refundWindowOpen && !p.refundInProgress);
  const eligible = open.length ? open : summary.payments.filter((p) => p.refundablePaise > 0);

  return (
    <section aria-label="Refunds" className="apple-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-black dark:text-white">Refunds</h2>
        {access.canRequest && summary.canRequestRefund && eligible.length > 0 && (
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] cursor-pointer disabled:opacity-60"
          >
            <Undo2 className="w-3.5 h-3.5" /> Request refund
          </button>
        )}
      </div>

      {access.canRequest && !summary.canRequestRefund && summary.refundBlockedReason && (
        <p role="note" aria-label="Refund not available" className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-gray-600 dark:text-gray-300">
          {summary.refundBlockedReason}
        </p>
      )}

      {summary.payments.map((payment) => (
        <PaymentRow key={payment.paymentId} payment={payment} />
      ))}

      {summary.refunds.length > 0 ? (
        <ul className="space-y-3" aria-label="Refund history">
          {summary.refunds.map((refund) => (
            <RefundHistoryItem key={refund.id} refund={refund} onChanged={onChanged} />
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 dark:text-neutral-400">No refunds have been requested for this order.</p>
      )}

      {requestOpen && eligible.length > 0 && (
        <RequestRefundDialog
          orderNumber={orderNumber}
          payments={eligible}
          choosePayment={summary.payments.length > 1}
          isSubmitting={isSubmitting}
          onClose={() => setRequestOpen(false)}
          onSubmit={requestRefund}
        />
      )}
    </section>
  );
};
