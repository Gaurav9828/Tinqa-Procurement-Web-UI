import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Wallet, Banknote } from 'lucide-react';
import { supplierPaymentApi } from '../../order-management/api/supplierPaymentApi';
import type { SupplierPaymentEntry } from '../../order-management/types/supplierPayment.types';
import { MILESTONE_LABELS, PAYMENT_STATUS_LABELS } from '../../order-management/types/supplierPayment.types';
import { PAYMENT_METHOD_LABELS } from '../../order-management/utils/paymentPlan';
import { OrderPaymentsPanel } from '../../order-management/components/OrderPaymentsPanel';
import { OrderTimeline } from '../../order-management/components/OrderTimeline';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { useApiAction } from '../../../hooks/useApiAction';
import { useAuthStore } from '../../../store/useAuthStore';

const what = (entry: SupplierPaymentEntry) => {
  if (entry.kind === 'PAYMENT') return `${MILESTONE_LABELS[entry.milestone ?? 'ADVANCE']} payment to the supplier`;
  if (entry.kind === 'REFUND') return 'Refund received from the supplier';
  return 'Reversal of a confirmed refund (paid back to the supplier)';
};

const button = 'px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * The whole order behind an entry, opened on demand: the plan's parts in rupees (planned, paid, waiting), every entry
 * with its history and the order's flow history. `actionable` lets the Finance Manager pay or re-send from here.
 */
const OrderReview: React.FC<{ entry: SupplierPaymentEntry; actionable: boolean; onChanged: () => void }> = ({ entry, actionable, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  const changed = useCallback(() => {
    setRound((n) => n + 1);
    onChanged();
  }, [onChanged]);
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-[11px] text-[#0071e3] cursor-pointer">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {open ? 'Hide order' : `Review order ${entry.orderNumber ?? ''}`}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <OrderPaymentsPanel orderId={entry.orderId} enabled readOnly={!actionable} onChanged={changed} />
          <OrderTimeline orderId={entry.orderId} round={round} />
        </div>
      )}
    </div>
  );
};

const EntryHeader: React.FC<{ entry: SupplierPaymentEntry }> = ({ entry }) => (
  <>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-semibold text-black dark:text-white">
        {entry.orderNumber} · {entry.supplierName}
      </span>
      <span className="font-bold text-sm">{formatCurrency(entry.amount)}</span>
    </div>
    <p className="text-gray-600 dark:text-gray-300">
      {what(entry)} · {PAYMENT_METHOD_LABELS[entry.method]}
      {entry.paidOn ? ` · ${formatDate(entry.paidOn)}` : ''}
      {entry.reference ? ` · Ref ${entry.reference}` : ''}
    </p>
    {entry.note && <p className="text-gray-500">{entry.note}</p>}
    {entry.supplierResponseReason && <p className="text-rose-600">Supplier: {entry.supplierResponseReason}</p>}
  </>
);

const WaitingEntry: React.FC<{
  entry: SupplierPaymentEntry;
  mine: boolean;
  busy: boolean;
  onDecide: (entry: SupplierPaymentEntry, decision: 'APPROVED' | 'REJECTED', reason?: string) => Promise<boolean>;
  onChanged: () => void;
}> = ({ entry, mine, busy, onDecide, onChanged }) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const isPayment = entry.kind === 'PAYMENT';
  // A later part of the plan waits until the earlier one is approved (the server answers 409 SUPPLIER_PAYMENT_OUT_OF_ORDER)
  const waitsFor = isPayment ? entry.waitsFor : null;
  return (
    <li className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-1.5 text-xs" data-testid={`waiting-payment-${entry.id}`}>
      <EntryHeader entry={entry} />
      {isPayment && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Nothing is paid yet. Approve it and the Finance Manager pays it and enters the reference; the supplier then confirms they received it.
        </p>
      )}
      <p className="text-[10px] text-gray-400">{isPayment ? 'Requested' : 'Recorded'} by {entry.recordedByUsername ?? 'someone'}</p>
      <OrderReview entry={entry} actionable={false} onChanged={onChanged} />
      {mine ? (
        <p className="text-[11px] text-gray-400">You {isPayment ? 'requested' : 'recorded'} it: someone else decides it.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy || !!waitsFor} onClick={() => onDecide(entry, 'APPROVED')} className={`${button} ${SOLID_TONE.approve}`}>
            {isPayment ? 'Approve payment' : 'Confirm'}
          </button>
          {waitsFor && (
            <span className="text-[11px] text-amber-700 dark:text-amber-400">
              Approve the {MILESTONE_LABELS[waitsFor].toLowerCase()} first: parts are approved and paid in plan order.
            </span>
          )}
          {rejecting ? (
            <>
              <input
                aria-label={`Reason to reject ${entry.orderNumber}`}
                placeholder="Reason"
                maxLength={500}
                className="flex-1 min-w-40 px-2.5 py-1 rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !reason.trim()}
                onClick={async () => {
                  if (await onDecide(entry, 'REJECTED', reason.trim())) setRejecting(false);
                }}
                className={`${button} ${SOLID_TONE.danger}`}
              >
                Reject
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={`${button} ${SOLID_TONE.danger}`}>
              Reject
            </button>
          )}
        </div>
      )}
    </li>
  );
};

const toMakeHint = (entry: SupplierPaymentEntry): string => {
  if (entry.status !== 'TO_PAY') return ': check it with the bank and send it again (you may attach a proof).';
  const by = entry.decidedByUsername ? ` by ${entry.decidedByUsername}` : '';
  return `: approved${by}. Pay it, then record the reference.`;
};

const decisionMessage = (entry: SupplierPaymentEntry, decision: 'APPROVED' | 'REJECTED'): string => {
  if (entry.kind !== 'PAYMENT') return decision === 'APPROVED' ? 'Entry confirmed.' : 'Entry rejected.';
  return decision === 'APPROVED' ? 'Payment approved: the Finance Manager pays it now.' : 'Payment request rejected.';
};

const ToMakeEntry: React.FC<{ entry: SupplierPaymentEntry; onChanged: () => void }> = ({ entry, onChanged }) => (
  <li className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-1.5 text-xs" data-testid={`payment-to-make-${entry.id}`}>
    <EntryHeader entry={entry} />
    <p className={`text-[11px] ${entry.status === 'NOT_RECEIVED' ? 'text-rose-600' : 'text-sky-700 dark:text-sky-400'}`}>
      {PAYMENT_STATUS_LABELS[entry.status]}
      {toMakeHint(entry)}
    </p>
    <OrderReview entry={entry} actionable onChanged={onChanged} />
  </li>
);

/** Loads one list while `enabled`; `round` reloads it. */
const useEntries = (enabled: boolean, round: number, load: () => Promise<{ success: boolean; data?: SupplierPaymentEntry[] | null }>, failure: string) => {
  const notify = useNotify();
  const [entries, setEntries] = useState<SupplierPaymentEntry[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    load()
      .then((res) => {
        if (current) setEntries(res.success ? res.data ?? [] : []);
      })
      .catch((err: unknown) => {
        if (!current) return;
        setEntries([]);
        notify.error(err, failure);
      });
    return () => {
      current = false;
    };
    // load and failure are fixed per caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, round, notify]);
  return enabled ? entries : null;
};

const List: React.FC<{ entries: SupplierPaymentEntry[] | null; empty: string; children: (entry: SupplierPaymentEntry) => React.ReactNode }> = ({ entries, empty, children }) => (
  <>
    {entries === null && (
      <p role="status" className="flex items-center gap-1.5 text-xs text-gray-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
      </p>
    )}
    {entries?.length === 0 && <p className="text-xs text-gray-400 italic">{empty}</p>}
    {entries && entries.length > 0 && <ul className="space-y-2">{entries.map(children)}</ul>}
  </>
);

/**
 * Approvals Hub › Supplier payments. The Super Admin (SUPPLIER_PAYMENT_APPROVE) approves or rejects payment requests
 * (in plan order: `waitsFor` disables Approve) and reversals of refunds, with the whole order open beside each one. The Finance Manager (SUPPLIER_PAYMENT_RECORD) sees
 * the payments to make: approved requests to pay, and payments the supplier said they did not receive. Each list loads
 * only while the tab is open; each change refreshes the lists and the hub's badges.
 */
export const SupplierPaymentApprovalsPanel: React.FC<{ enabled: boolean; onChanged: () => void }> = ({ enabled, onChanged }) => {
  const { canAll } = useAccess();
  const userId = useAuthStore((state) => state.user?.userId);
  const canDecide = enabled && canAll('SUPPLIER_PAYMENT_APPROVE', 'PROCUREMENT_ORDER_VIEW');
  const canPay = enabled && canAll('SUPPLIER_PAYMENT_RECORD', 'PROCUREMENT_ORDER_VIEW');
  const [round, setRound] = useState(0);
  const reload = useCallback(() => setRound((n) => n + 1), []);
  const changed = useCallback(() => {
    reload();
    onChanged();
  }, [reload, onChanged]);
  const { run, isSubmitting } = useApiAction(changed);
  const waiting = useEntries(canDecide, round, supplierPaymentApi.waiting, "Couldn't load the supplier payments waiting for approval.");
  const toMake = useEntries(canPay, round, supplierPaymentApi.toMake, "Couldn't load the payments to make.");

  if (!canDecide && !canPay) return null;
  const decide = (entry: SupplierPaymentEntry, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    run(() => supplierPaymentApi.decide(entry.id, decision, reason), {
      success: decisionMessage(entry, decision),
      failure: "Couldn't decide the entry.",
    });

  return (
    <div className="space-y-6">
      {canDecide && (
        <section aria-label="Supplier payments awaiting approval" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white">
                <Wallet className="w-4 h-4 text-[#0071e3]" /> Payment requests awaiting approval
              </h2>
              <p className="text-xs text-gray-500">
                The Finance Manager asks before paying a supplier: approve or reject each request after reviewing the order, in plan order (advance, then midterm, then final). Reversals of refunds are here too; money the supplier pays back is checked by a Finance Manager.
              </p>
            </div>
            <button type="button" onClick={reload} aria-label="Refresh supplier payments" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <List entries={waiting} empty="Nothing waiting.">
            {(entry) => <WaitingEntry key={entry.id} entry={entry} mine={entry.recordedBy === userId} busy={isSubmitting} onDecide={decide} onChanged={changed} />}
          </List>
        </section>
      )}
      {canPay && (
        <section aria-label="Payments to make" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white">
                <Banknote className="w-4 h-4 text-emerald-600" /> Payments to make
              </h2>
              <p className="text-xs text-gray-500">
                Approved by the Super Admin and not paid yet, or not received by the supplier. Open the order to record the payment or send it again.
              </p>
            </div>
            {!canDecide && (
              <button type="button" onClick={reload} aria-label="Refresh payments to make" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
          <List entries={toMake} empty="Nothing to pay.">
            {(entry) => <ToMakeEntry key={entry.id} entry={entry} onChanged={changed} />}
          </List>
        </section>
      )}
    </div>
  );
};
