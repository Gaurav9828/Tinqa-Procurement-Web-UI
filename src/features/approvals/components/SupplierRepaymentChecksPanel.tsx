import React, { useCallback } from 'react';
import { Loader2, Paperclip, RefreshCw, Undo2 } from 'lucide-react';
import { supplierPaymentApi } from '../../order-management/api/supplierPaymentApi';
import { PAYMENT_EVENT_LABELS, type PaymentEvent, type SupplierPaymentEntry } from '../../order-management/types/supplierPayment.types';
import { PAYMENT_METHOD_LABELS } from '../../order-management/utils/paymentPlan';
import { RepaymentCheck } from '../../order-management/components/RepaymentForms';
import { OrderTimeline } from '../../order-management/components/OrderTimeline';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { downloadBlob } from '../../finance/export/chartImage';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useNotify } from '../../../hooks/useNotify';
import { useQueueList } from '../hooks/useQueueList';

const what = (entry: SupplierPaymentEntry) => {
  if (entry.returnId != null) return 'Repayment for returned pieces';
  if (entry.kind === 'REFUND') return 'Refund paid by the supplier';
  return 'Reversal paid back by the supplier';
};

const RepaymentToCheck: React.FC<{
  entry: SupplierPaymentEntry;
  busy: boolean;
  onCheck: (entry: SupplierPaymentEntry, received: boolean, reason?: string) => Promise<boolean>;
  onReceipt: (entry: SupplierPaymentEntry, event: PaymentEvent) => void;
}> = ({ entry, busy, onCheck, onReceipt }) => {
  const charge = entry.chargeAmount ?? 0;
  const receipts = (entry.events ?? []).filter((event) => event.proofDocumentId != null);
  return (
    <li className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-1.5 text-xs" data-testid={`repayment-to-check-${entry.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-black dark:text-white">
          {entry.orderNumber} · {entry.supplierName}
        </span>
        <span className="font-bold text-sm">{formatCurrency(entry.amount + charge)}</span>
      </div>
      <p className="text-gray-600 dark:text-gray-300">
        {what(entry)} · {PAYMENT_METHOD_LABELS[entry.method]}
        {entry.reference ? ` · Ref ${entry.reference}` : ''}
        {entry.paidOn ? ` · paid on ${formatDate(entry.paidOn)}` : ''}
      </p>
      {charge > 0 && (
        <p className="text-gray-500">Pieces {formatCurrency(entry.amount)} + return shipping {formatCurrency(charge)}</p>
      )}
      {entry.note && <p className="text-gray-500">{entry.note}</p>}
      {receipts.length > 0 ? (
        receipts.map((event, index) => (
          <button key={`${event.proofDocumentId}-${index}`} type="button" onClick={() => onReceipt(entry, event)} className="flex items-center gap-1 text-[11px] text-[#0071e3] cursor-pointer">
            <Paperclip className="w-3 h-3" /> Receipt: {event.proofFileName ?? 'file'}
          </button>
        ))
      ) : (
        <p className="text-[11px] text-gray-400">No receipt attached.</p>
      )}
      {(entry.events ?? []).length > 0 && (
        <ol aria-label="Repayment history" className="ml-1.5 pl-3 border-l border-black/10 dark:border-white/10 space-y-0.5">
          {(entry.events ?? []).map((event, index) => (
            <li key={`${event.type}-${event.at}-${index}`}>
              <span className="font-medium text-black dark:text-white">{PAYMENT_EVENT_LABELS[event.type]}</span>
              <span className="text-gray-400"> · {new Date(event.at).toLocaleString()}{event.actorRole ? ` · ${[event.actorName, event.actorRole].filter(Boolean).join(', ')}` : ''}</span>
              {event.note && <span className="block text-gray-600 dark:text-gray-300">{event.note}</span>}
            </li>
          ))}
        </ol>
      )}
      <OrderTimeline orderId={entry.orderId} />
      <RepaymentCheck label={`Check repayment ${entry.id}`} busy={busy} onCheck={(received, reason) => onCheck(entry, received, reason)} />
    </li>
  );
};

/**
 * Approvals Hub › Supplier repayments (Finance Manager, SUPPLIER_PAYMENT_RECORD): money suppliers say they paid back
 * (reversal asks, returns of failed pieces, refunds due), oldest first, with the method, reference, date, receipt and
 * every step. Received counts it (and posts it to Finance › Supplier money); not received sends it back to the supplier
 * with the reason. Loads only while its tab is open; a check reloads this list and the hub's badges.
 */
export const SupplierRepaymentChecksPanel: React.FC<{ enabled: boolean; onChanged: () => void }> = ({ enabled, onChanged }) => {
  const { canAll } = useAccess();
  const notify = useNotify();
  const allowed = enabled && canAll('SUPPLIER_PAYMENT_RECORD', 'PROCUREMENT_ORDER_VIEW');
  const { items, reload } = useQueueList(allowed, supplierPaymentApi.repaymentsToCheck, "Couldn't load the repayments to check.");
  const changed = useCallback(() => {
    reload();
    onChanged();
  }, [reload, onChanged]);
  const { run, isSubmitting } = useApiAction(changed);
  if (!allowed) return null;
  const check = (entry: SupplierPaymentEntry, received: boolean, reason?: string) =>
    run(() => supplierPaymentApi.checkRepayment(entry.id, received, reason), {
      success: received ? 'Repayment confirmed: it now counts.' : 'Sent back to the supplier: they pay it again with a receipt.',
      failure: "Couldn't save the check.",
    });
  const receipt = async (entry: SupplierPaymentEntry, event: PaymentEvent) => {
    try {
      downloadBlob(await supplierPaymentApi.downloadProof(entry.id, event.proofDocumentId as number, 'staff'), event.proofFileName || `repayment-${entry.id}-receipt`);
    } catch (err) {
      notify.error(err, "Couldn't download the receipt.");
    }
  };
  return (
    <section aria-label="Supplier repayments to check" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white">
            <Undo2 className="w-4 h-4 text-emerald-600" /> Repayments to check
          </h2>
          <p className="text-xs text-gray-500">
            Money suppliers paid back to TinQa. Check each one against the bank statement: it counts only once you confirm it arrived.
          </p>
        </div>
        <button type="button" onClick={reload} aria-label="Refresh supplier repayments" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {items === null && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </p>
      )}
      {items?.length === 0 && <p className="text-xs text-gray-400 italic">Nothing to check.</p>}
      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((entry) => (
            <RepaymentToCheck key={entry.id} entry={entry} busy={isSubmitting} onCheck={check} onReceipt={(e, ev) => void receipt(e, ev)} />
          ))}
        </ul>
      )}
    </section>
  );
};
