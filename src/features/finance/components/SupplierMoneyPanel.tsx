import React, { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { SupplierReceipt } from '../types/finance.types';
import { useSupplierReceipts } from '../hooks/useFinanceData';
import { formatDate } from '../utils/period';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../../order-management/utils/paymentPlan';
import { CLAIM_CAUSE_LABELS, MILESTONE_LABELS, type PaymentMilestone, type RefundClaimCause } from '../../order-management/types/supplierPayment.types';
import { Pager } from '../../../components/ui/Pager';

const PAGE_SIZE = 20;

const REASON_LABELS: Record<SupplierReceipt['reason'], string> = {
  FAILED_PIECES_RETURN: 'Failed pieces returned',
  REFUND_CLAIM: 'Refund claim',
  PAYMENT_REVERSAL: 'Payment reversed',
  REFUND_REVERSAL: 'Refund reversed (paid back to the supplier)',
};

const methodLabel = (method: string) => PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;

const reasonDetail = (receipt: SupplierReceipt): string | null => {
  const parts = [
    receipt.claimCause && (CLAIM_CAUSE_LABELS[receipt.claimCause as RefundClaimCause] ?? receipt.claimCause),
    receipt.milestone && `${MILESTONE_LABELS[receipt.milestone as PaymentMilestone] ?? receipt.milestone} payment`,
    receipt.returnId != null && `return #${receipt.returnId}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
};

/** A receipt's sign: money in from the supplier, or out to them (a reversed refund). */
const signed = (receipt: SupplierReceipt, value: number) => `${receipt.direction === 'OUT' ? '−' : '+'}${formatCurrency(value)}`;

const ReceiptTable: React.FC<{ rows: SupplierReceipt[] }> = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left" aria-label="Supplier repayments">
      <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
        <tr>
          <th className="pb-2 pr-3 font-semibold">Order</th>
          <th className="pb-2 pr-3 font-semibold">Supplier</th>
          <th className="pb-2 pr-3 font-semibold">Reason</th>
          <th className="pb-2 pr-3 font-semibold">Method</th>
          <th className="pb-2 pr-3 font-semibold">Reference</th>
          <th className="pb-2 pr-3 font-semibold">Paid on</th>
          <th className="pb-2 pr-3 font-semibold text-right">Amount</th>
          <th className="pb-2 pr-3 font-semibold text-right">Charge</th>
          <th className="pb-2 pr-3 font-semibold">Receipt</th>
          <th className="pb-2 font-semibold">Confirmed</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
        {rows.map((receipt) => (
          <tr key={receipt.id} data-testid={`supplier-receipt-${receipt.id}`}>
            <td className="py-3 pr-3 whitespace-nowrap font-mono">{receipt.orderNumber}</td>
            <td className="py-3 pr-3">{receipt.supplierName}</td>
            <td className="py-3 pr-3 max-w-xs">
              <div className="font-semibold text-black dark:text-white">{REASON_LABELS[receipt.reason] ?? receipt.reason}</div>
              {reasonDetail(receipt) && <div className="text-gray-500">{reasonDetail(receipt)}</div>}
              {receipt.note && <div className="text-gray-400 break-words">{receipt.note}</div>}
            </td>
            <td className="py-3 pr-3 whitespace-nowrap">{methodLabel(receipt.method)}</td>
            <td className="py-3 pr-3 whitespace-nowrap">{receipt.reference ?? '—'}</td>
            <td className="py-3 pr-3 whitespace-nowrap">{formatDate(receipt.paidOn)}</td>
            <td className="py-3 pr-3 text-right whitespace-nowrap tabular-nums">{signed(receipt, receipt.amount)}</td>
            <td className="py-3 pr-3 text-right whitespace-nowrap tabular-nums">
              {receipt.chargeAmount > 0 ? signed(receipt, receipt.chargeAmount) : '—'}
              {receipt.ledgerEntryId != null && <div className="text-[10px] text-gray-400">ledger #{receipt.ledgerEntryId}</div>}
            </td>
            <td className="py-3 pr-3 whitespace-nowrap">{receipt.receiptFileName ?? '—'}</td>
            <td className="py-3 whitespace-nowrap">
              {receipt.confirmedBy}
              <div className="text-gray-400">{new Date(receipt.confirmedAt).toLocaleString()}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Finance › Supplier money: every repayment a Finance Manager confirmed in Procurement (failed pieces returned, refund
 * claims, reversals), with its order, reason, method, UTR / transaction ID, receipt and who confirmed it. Only the
 * return shipping charge moved the company balance; the pieces were never booked as a cost. Loads only while its tab
 * is open (the page renders it only then), one page at a time.
 */
export const SupplierMoneyPanel: React.FC = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading, loadFailed, refresh } = useSupplierReceipts({ page, size: PAGE_SIZE });
  const rows = data?.content ?? [];
  let content: React.ReactNode;
  if (isLoading && !data) {
    content = <div className="flex justify-center py-10 text-gray-400" role="status" aria-label="Loading supplier money"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  } else if (loadFailed && !data) {
    content = (
      <div className="py-10 text-center text-gray-500 space-y-2">
        <p>The supplier money history couldn't be loaded.</p>
        <button type="button" onClick={() => void refresh()} className="font-semibold text-black dark:text-white cursor-pointer">Try again</button>
      </div>
    );
  } else if (rows.length === 0) {
    content = <p className="py-10 text-center text-gray-500" role="status">No supplier repayments confirmed yet.</p>;
  } else {
    content = <ReceiptTable rows={rows} />;
  }
  return (
    <section aria-label="Supplier money" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white">Supplier money</h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-0.5 max-w-2xl">
            Money suppliers paid back to TinQa, once a Finance Manager confirmed it arrived: failed pieces returned, refund claims and
            reversed payments.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={isLoading} aria-label="Refresh supplier money"
          className="self-start p-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p role="note" className="p-3 rounded-xl bg-sky-500/10 text-sky-800 dark:text-sky-300">
        Only the return shipping charge moves the company balance (posted as "Return shipping recovered from suppliers"). The pieces'
        amount and reversals are recorded here but not posted: purchases are booked only for the units that passed testing, and
        payments to suppliers are never posted, so posting them would count them twice.
      </p>

      {content}
      <Pager page={page} totalPages={data?.totalPages ?? 0} disabled={isLoading} onPage={setPage} />
    </section>
  );
};
