import React from 'react';
import type { AdminOrderDetail } from '../types/orderTracking.types';
import { formatDateTime } from '../utils/orderTracking.utils';
import {
  findSuccessfulAttempt,
  formatPaise,
  formatPaymentMethod,
  formatPaymentStatus,
  paymentStatusTone,
  type PaymentTone,
} from '../utils/payment.utils';

const TONES: Record<PaymentTone, string> = {
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
};

const PaymentBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold rounded-full border whitespace-nowrap ${TONES[paymentStatusTone(status)]}`}>
    {formatPaymentStatus(status)}
  </span>
);

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-gray-400">{children}</span>;

const Field: React.FC<{ label: string; children: React.ReactNode; testId: string }> = ({ label, children, testId }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="mt-1 text-black dark:text-white break-all" data-testid={testId}>
      {children}
    </dd>
  </div>
);

type PaymentOrder = Pick<AdminOrderDetail, 'paymentStatus' | 'paymentMethod' | 'payments'>;

/**
 * Read-only payment summary from GET /admin/orders/{orderNumber}: the order-level status/method
 * plus each Razorpay attempt. Amounts arrive in paise. No payment actions are offered here.
 */
export const PaymentDetailsCard: React.FC<{ order: PaymentOrder }> = ({ order }) => {
  // `undefined` = backend predates the field; [] = no attempt was ever created.
  const attempts = order.payments === undefined ? null : order.payments ?? [];
  const paid = attempts ? findSuccessfulAttempt(attempts) : null;

  return (
    <section aria-label="Payment" className="apple-card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-black dark:text-white">Payment</h2>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Status" testId="payment-status">
          {order.paymentStatus?.trim() ? <PaymentBadge status={order.paymentStatus} /> : <Muted>Not recorded</Muted>}
        </Field>
        <Field label="Method" testId="payment-method">
          {order.paymentMethod?.trim() ? formatPaymentMethod(order.paymentMethod) : <Muted>Not recorded</Muted>}
          {paid?.paymentInstrument && <span className="text-gray-500"> · {formatPaymentMethod(paid.paymentInstrument)}</span>}
        </Field>
        {attempts && (
          <>
            <Field label="Transaction ID" testId="payment-transaction-id">
              {paid?.transactionId ? <span className="font-mono select-all">{paid.transactionId}</span> : <Muted>Not paid yet</Muted>}
            </Field>
            <Field label="Payment date" testId="payment-date">
              {paid?.paidAt ? formatDateTime(paid.paidAt) : <Muted>Not paid yet</Muted>}
            </Field>
            <Field label="Amount paid" testId="payment-amount">
              {paid ? formatPaise(paid.amountPaise, paid.currency) : <Muted>—</Muted>}
            </Field>
          </>
        )}
      </dl>

      {attempts === null ? (
        <p className="text-gray-500 dark:text-neutral-400">Transaction details aren't available from the server yet.</p>
      ) : attempts.length === 0 ? (
        <p className="text-gray-500 dark:text-neutral-400">No payment attempts recorded for this order.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Payment attempts">
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="pb-2 pr-3 font-semibold">#</th>
                <th className="pb-2 pr-3 font-semibold">Status</th>
                <th className="pb-2 pr-3 font-semibold text-right">Amount</th>
                <th className="pb-2 pr-3 font-semibold">Transaction ID</th>
                <th className="pb-2 pr-3 font-semibold">Started</th>
                <th className="pb-2 font-semibold">Paid at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
              {attempts.map((attempt, index) => (
                <tr key={`${index}-${attempt.createdAt ?? ''}`}>
                  <td className="py-2 pr-3 text-gray-400">{index + 1}</td>
                  <td className="py-2 pr-3">
                    <PaymentBadge status={attempt.status} />
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{formatPaise(attempt.amountPaise, attempt.currency)}</td>
                  <td className="py-2 pr-3 font-mono break-all">{attempt.transactionId || <Muted>—</Muted>}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(attempt.createdAt)}</td>
                  <td className="py-2 whitespace-nowrap">{attempt.paidAt ? formatDateTime(attempt.paidAt) : <Muted>—</Muted>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
