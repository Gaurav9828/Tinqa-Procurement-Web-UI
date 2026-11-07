import React, { useState } from 'react';
import { Wallet, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { todayLocalIsoDate } from '../validator/orderValidator';
import { useOrderPayments } from '../hooks/useOrderPayments';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, describePlan, type PaymentMethod } from '../utils/paymentPlan';
import {
  CLAIM_CAUSE_LABELS,
  MILESTONE_LABELS,
  PAYMENT_STATUS_LABELS,
  type SupplierPaymentEntry,
  type PaymentMilestone,
  type PaymentSummary,
  type RecordPaymentRequest,
  type RefundClaim,
} from '../types/supplierPayment.types';

const field = 'w-full px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-xs';
const smallButton = 'px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const STATUS_TONE: Record<SupplierPaymentEntry['status'], string> = {
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  APPROVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  WITHDRAWN: 'bg-black/5 dark:bg-white/10 text-gray-500',
};

const entryTitle = (entry: SupplierPaymentEntry) => {
  if (entry.kind === 'PAYMENT') return `${MILESTONE_LABELS[entry.milestone ?? 'ADVANCE']} payment`;
  if (entry.kind === 'REFUND') return 'Refund from the supplier';
  return entry.milestone ? `Reversal of a ${MILESTONE_LABELS[entry.milestone].toLowerCase()} payment` : 'Reversal of a refund';
};

interface FormState {
  kind: 'PAYMENT' | 'REFUND';
  milestone: PaymentMilestone | '';
  amount: string;
  method: PaymentMethod | '';
  paidOn: string;
  reference: string;
  note: string;
}

const formFor = (summary: PaymentSummary, entry?: SupplierPaymentEntry): FormState =>
  entry
    ? {
        kind: entry.kind === 'REFUND' ? 'REFUND' : 'PAYMENT',
        milestone: entry.milestone ?? '',
        amount: String(entry.amount),
        method: entry.method,
        paidOn: entry.paidOn,
        reference: entry.reference ?? '',
        note: entry.note ?? '',
      }
    : {
        kind: summary.claim?.status === 'OPEN' && summary.openMilestones.length === 0 ? 'REFUND' : 'PAYMENT',
        milestone: summary.openMilestones.at(-1) ?? '',
        amount: '',
        method: summary.expectedPaymentMethod ?? '',
        paidOn: todayLocalIsoDate(),
        reference: '',
        note: '',
      };

const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;

/** A payment to the supplier or a refund from them, as recorded (or corrected while it waits for confirmation). */
const PaymentForm: React.FC<{
  summary: PaymentSummary;
  entry?: SupplierPaymentEntry;
  busy: boolean;
  onSave: (payload: RecordPaymentRequest) => Promise<boolean>;
  onCancel: () => void;
}> = ({ summary, entry, busy, onSave, onCancel }) => {
  const [form, setForm] = useState<FormState>(() => formFor(summary, entry));
  const set = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const refundOpen = summary.claim?.status === 'OPEN';
  const limit = form.kind === 'REFUND' ? (summary.claim?.refundDue ?? 0) - summary.pendingRefunds : summary.payableNow;
  const ownAmount = entry && entry.status === 'PENDING_APPROVAL' ? entry.amount : 0;
  const max = limit + ownAmount;
  const amountValid = AMOUNT.test(form.amount.trim()) && Number(form.amount) > 0 && Number(form.amount) <= max + 1e-9;
  const valid = amountValid && !!form.method && !!form.paidOn && (form.kind === 'REFUND' || !!form.milestone);
  const milestones = entry?.milestone && !summary.openMilestones.includes(entry.milestone)
    ? [...summary.openMilestones, entry.milestone]
    : summary.openMilestones;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const ok = await onSave({
      kind: form.kind,
      ...(form.kind === 'PAYMENT' ? { milestone: form.milestone as PaymentMilestone } : {}),
      amount: Number(form.amount),
      method: form.method as PaymentMethod,
      paidOn: form.paidOn,
      reference: form.reference.trim() || undefined,
      note: form.note.trim() || undefined,
    });
    if (ok) onCancel();
  };

  return (
    <form onSubmit={submit} aria-label={entry ? 'Correct payment entry' : 'Record a payment'} className="space-y-2 p-3 rounded-xl border border-[#0071e3]/30 bg-[#0071e3]/[0.03]">
      {!entry && (
        <div role="radiogroup" aria-label="What was paid" className="flex gap-2">
          {(['PAYMENT', 'REFUND'] as const).map((kind) => (
            <label key={kind} className={`flex items-center gap-1.5 ${kind === 'REFUND' && !refundOpen ? 'opacity-40' : ''}`}>
              <input type="radio" name="payment-kind" checked={form.kind === kind} disabled={kind === 'REFUND' && !refundOpen}
                onChange={() => set({ kind })} />
              {kind === 'PAYMENT' ? 'Paid to the supplier' : 'Refund received from the supplier'}
            </label>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {form.kind === 'PAYMENT' && (
          <label className="space-y-0.5">
            <span className="text-gray-500">Part of the plan</span>
            <select aria-label="Part of the plan" className={field} value={form.milestone} onChange={(e) => set({ milestone: e.target.value as PaymentMilestone })}>
              <option value="" disabled>Choose</option>
              {milestones.map((m) => (
                <option key={m} value={m}>{MILESTONE_LABELS[m]}</option>
              ))}
            </select>
          </label>
        )}
        <label className="space-y-0.5">
          <span className="text-gray-500">Amount (₹)</span>
          <input aria-label="Amount" type="number" min="0.01" step="0.01" max={max} className={field} value={form.amount}
            onChange={(e) => set({ amount: e.target.value })} />
          <span className="block text-[10px] text-gray-400">At most {formatCurrency(Math.max(0, max))}</span>
        </label>
        <label className="space-y-0.5">
          <span className="text-gray-500">Method</span>
          <select aria-label="Method" className={field} value={form.method} onChange={(e) => set({ method: e.target.value as PaymentMethod })}>
            <option value="" disabled>Choose</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-gray-500">Paid on</span>
          <input aria-label="Paid on" type="date" max={todayLocalIsoDate()} className={field} value={form.paidOn} onChange={(e) => set({ paidOn: e.target.value })} />
        </label>
        <label className="space-y-0.5">
          <span className="text-gray-500">Reference (UTR, cheque no.)</span>
          <input aria-label="Reference" maxLength={100} className={field} value={form.reference} onChange={(e) => set({ reference: e.target.value })} />
        </label>
      </div>
      <label className="block space-y-0.5">
        <span className="text-gray-500">Note</span>
        <input aria-label="Note" maxLength={500} className={field} value={form.note} onChange={(e) => set({ note: e.target.value })} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`${smallButton} bg-black/5 dark:bg-white/10`}>Cancel</button>
        <button type="submit" disabled={!valid || busy} className={`${smallButton} ${SOLID_TONE.primary}`}>
          {entry ? 'Save correction' : 'Record for confirmation'}
        </button>
      </div>
    </form>
  );
};

/** A short reason, then the action (reject, reverse). */
const ReasonPrompt: React.FC<{ label: string; tone: 'danger' | 'warning'; busy: boolean; onConfirm: (reason: string) => void; onCancel: () => void }> = ({
  label, tone, busy, onConfirm, onCancel,
}) => {
  const [reason, setReason] = useState('');
  return (
    <div className="flex items-center gap-2 pt-1">
      <input aria-label={`Reason to ${label.toLowerCase()}`} placeholder="Reason" maxLength={500} className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
      <button type="button" disabled={!reason.trim() || busy} onClick={() => onConfirm(reason.trim())} className={`${smallButton} ${SOLID_TONE[tone]}`}>{label}</button>
      <button type="button" onClick={onCancel} className={`${smallButton} bg-black/5 dark:bg-white/10`}>Cancel</button>
    </div>
  );
};

const Figure: React.FC<{ label: string; value: number; testId: string; tone?: string }> = ({ label, value, testId, tone = 'text-black dark:text-white' }) => (
  <div>
    <span className="block text-gray-400">{label}</span>
    <span className={`font-bold text-sm ${tone}`} data-testid={testId}>{formatCurrency(value)}</span>
  </div>
);

/** What the order is worth, paid, refunded and still owed, and what waits for confirmation. */
const PaymentFigures: React.FC<{ summary: PaymentSummary }> = ({ summary }) => {
  const waiting = summary.pendingPayments > 0 || summary.pendingRefunds > 0;
  const failed = summary.unitsFailed > 0 ? `, ${Number(summary.unitsFailed)} failed` : '';
  const refundsWaiting = summary.pendingRefunds > 0 ? `, ${formatCurrency(summary.pendingRefunds)} refunded` : '';
  return (
    <>
      <div className="grid grid-cols-4 gap-2 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
        <Figure label={summary.tested ? 'Worth after testing' : 'Order value'} value={summary.payable} testId="payment-payable" />
        <Figure label="Paid (confirmed)" value={summary.paid} testId="payment-paid" tone="text-emerald-600 dark:text-emerald-400" />
        <Figure label="Refunded" value={summary.refunded} testId="payment-refunded" />
        <Figure label="Still to pay" value={summary.outstanding} testId="payment-outstanding" tone="text-amber-600 dark:text-amber-400" />
      </div>
      {summary.tested ? (
        <p className="text-gray-500" data-testid="payment-tested">
          Tested: {Number(summary.unitsPassed)} passed{failed}. The order is now worth what passed (with shipment and GST); the final part can be paid.
        </p>
      ) : (
        <p className="text-gray-500">The final part is paid only after the delivered units are tested (stock entry approved).</p>
      )}
      {waiting && (
        <p className="text-amber-700 dark:text-amber-400">
          Waiting for confirmation: {formatCurrency(summary.pendingPayments)} paid{refundsWaiting}.
        </p>
      )}
    </>
  );
};

const MilestoneTable: React.FC<{ summary: PaymentSummary }> = ({ summary }) => (
  <table className="w-full text-left" aria-label="Payment plan parts">
    <thead className="text-gray-400">
      <tr>
        <th className="font-medium py-1">Part</th>
        <th className="font-medium">Plan</th>
        <th className="font-medium text-right">Amount</th>
        <th className="font-medium text-right">Paid</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-black/5 dark:divide-white/5">
      {/* A plan without a midterm part shows only the advance and the final */}
      {summary.milestones.filter((m) => m.milestone !== 'MIDTERM' || m.percent !== 0 || m.paid !== 0).map((m) => (
        <tr key={m.milestone} data-testid={`milestone-${m.milestone}`}>
          <td className="py-1">
            {MILESTONE_LABELS[m.milestone]}
            {m.due && <span className="ml-1 text-[10px] text-[#0071e3]">due</span>}
          </td>
          <td>{m.percent == null ? '—' : `${Number(m.percent)}%`}</td>
          <td className="text-right tabular-nums">{formatCurrency(m.planned)}</td>
          <td className="text-right tabular-nums">
            {formatCurrency(m.paid)}
            {m.pending > 0 && <span className="block text-[10px] text-amber-600">+{formatCurrency(m.pending)} waiting</span>}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** The refund the supplier owes; a Level 2 may change its amount (at most what was overpaid) with a reason. */
const RefundClaimBox: React.FC<{
  claim: RefundClaim;
  canApprove: boolean;
  busy: boolean;
  onAdjust: (agreedAmount: number, reason: string) => Promise<boolean>;
}> = ({ claim, canApprove, busy, onAdjust }) => {
  const [adjusting, setAdjusting] = useState(false);
  const [agreed, setAgreed] = useState('');
  const [reason, setReason] = useState('');
  const open = claim.status === 'OPEN';
  const failed = claim.failedUnits > 0 ? ` (${Number(claim.failedUnits)} failed; they go back to the supplier)` : '';
  const valid = !!reason.trim() && AMOUNT.test(agreed.trim()) && Number(agreed) <= claim.claimedAmount;
  const tone = open
    ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400';
  return (
    <div role={open ? 'alert' : 'note'} data-testid="refund-claim" className={`p-3 rounded-xl border space-y-1 ${tone}`}>
      <p className="flex items-center gap-1.5 font-semibold">
        {open ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        {open ? `Refund due from the supplier: ${formatCurrency(claim.refundDue)}` : 'Refund claim settled'}
      </p>
      <p>
        {CLAIM_CAUSE_LABELS[claim.cause]}
        {failed}. Overpaid {formatCurrency(claim.claimedAmount)}, to be refunded {formatCurrency(claim.agreedAmount)}, refunded so far{' '}
        {formatCurrency(claim.refunded)}.
      </p>
      {claim.adjustReason && <p>Changed by Level 2: {claim.adjustReason}</p>}
      {canApprove && !adjusting && (
        <button
          type="button"
          onClick={() => {
            setAdjusting(true);
            setAgreed(String(claim.agreedAmount));
            setReason('');
          }}
          className={`${smallButton} ${SOLID_TONE.warning}`}
        >
          Change refund amount
        </button>
      )}
      {adjusting && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-black dark:text-white">
          <input aria-label="Amount to be refunded" type="number" min="0" step="0.01" max={claim.claimedAmount} className={`${field} w-28`}
            value={agreed} onChange={(e) => setAgreed(e.target.value)} />
          <input aria-label="Reason for the new refund amount" placeholder="Reason" maxLength={500} className={`${field} flex-1`}
            value={reason} onChange={(e) => setReason(e.target.value)} />
          <button
            type="button"
            disabled={busy || !valid}
            onClick={async () => {
              if (await onAdjust(Number(agreed), reason.trim())) setAdjusting(false);
            }}
            className={`${smallButton} ${SOLID_TONE.warning}`}
          >
            Save
          </button>
          <button type="button" onClick={() => setAdjusting(false)} className={`${smallButton} bg-black/5 dark:bg-white/10`}>Cancel</button>
        </div>
      )}
    </div>
  );
};

type Payments = ReturnType<typeof useOrderPayments>;

const entryFacts = (entry: SupplierPaymentEntry) =>
  [
    PAYMENT_METHOD_LABELS[entry.method],
    formatDate(entry.paidOn),
    entry.reference && `Ref ${entry.reference}`,
    entry.recordedByUsername && `recorded by ${entry.recordedByUsername}`,
    entry.decidedByUsername && entry.status !== 'WITHDRAWN' && `decided by ${entry.decidedByUsername}`,
  ]
    .filter(Boolean)
    .join(' · ');

/** What one person may do with one entry: confirm or reject someone else's, correct or withdraw their own, reverse a confirmed one. */
const EntryActions: React.FC<{ entry: SupplierPaymentEntry; mine: boolean; payments: Payments; canRecord: boolean; canApprove: boolean; onPrompt: (action: 'reject' | 'reverse') => void; onEdit: () => void }> = ({
  entry, mine, payments, canRecord, canApprove, onPrompt, onEdit,
}) => {
  const busy = payments.isSubmitting;
  const pending = entry.status === 'PENDING_APPROVAL';
  const decidable = pending && canApprove && !mine;
  const ownPending = pending && mine && canRecord;
  const reversible = entry.status === 'APPROVED' && entry.kind !== 'REVERSAL' && !entry.reversed && canRecord;
  return (
    <div className="flex flex-wrap gap-1.5">
      {decidable && (
        <>
          <button type="button" disabled={busy} onClick={() => payments.decide(entry.id, 'APPROVED')} className={`${smallButton} ${SOLID_TONE.approve}`}>
            Confirm
          </button>
          <button type="button" disabled={busy} onClick={() => onPrompt('reject')} className={`${smallButton} ${SOLID_TONE.danger}`}>
            Reject
          </button>
        </>
      )}
      {pending && mine && canApprove && <span className="text-[10px] text-gray-400">You recorded it: someone else confirms it.</span>}
      {ownPending && entry.kind !== 'REVERSAL' && (
        <button type="button" disabled={busy} onClick={onEdit} className={`${smallButton} ${SOLID_TONE.primary}`}>
          Correct
        </button>
      )}
      {ownPending && (
        <button type="button" disabled={busy} onClick={() => payments.withdraw(entry.id)} className={`${smallButton} ${SOLID_TONE.warning}`}>
          Withdraw
        </button>
      )}
      {reversible && (
        <button type="button" disabled={busy} onClick={() => onPrompt('reverse')} className={`${smallButton} ${SOLID_TONE.warning}`}>
          Reverse
        </button>
      )}
    </div>
  );
};

const PaymentEntryItem: React.FC<{
  entry: SupplierPaymentEntry;
  summary: PaymentSummary;
  payments: Payments;
  mine: boolean;
  actions: boolean;
  canRecord: boolean;
  canApprove: boolean;
}> = ({ entry, summary, payments, mine, actions, canRecord, canApprove }) => {
  const [prompt, setPrompt] = useState<'reject' | 'reverse' | null>(null);
  const [editing, setEditing] = useState(false);
  const busy = payments.isSubmitting;
  return (
    <li className="p-2 rounded-lg border border-black/5 dark:border-white/10 space-y-1" data-testid={`payment-entry-${entry.id}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-black dark:text-white">
          {entryTitle(entry)} · {formatCurrency(entry.amount)}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_TONE[entry.status]}`}>
          {entry.reversed ? 'Reversed' : PAYMENT_STATUS_LABELS[entry.status]}
        </span>
      </div>
      <p className="text-gray-500">{entryFacts(entry)}</p>
      {entry.note && <p className="text-gray-600 dark:text-gray-300">{entry.note}</p>}
      {entry.decisionReason && <p className="text-rose-600">Reason: {entry.decisionReason}</p>}
      {actions && !prompt && !editing && (
        <EntryActions entry={entry} mine={mine} payments={payments} canRecord={canRecord} canApprove={canApprove} onPrompt={setPrompt} onEdit={() => setEditing(true)} />
      )}
      {prompt && (
        <ReasonPrompt
          label={prompt === 'reject' ? 'Reject' : 'Reverse'}
          tone={prompt === 'reject' ? 'danger' : 'warning'}
          busy={busy}
          onCancel={() => setPrompt(null)}
          onConfirm={async (reason) => {
            const ok = prompt === 'reject' ? await payments.decide(entry.id, 'REJECTED', reason) : await payments.reverse(entry.id, reason);
            if (ok) setPrompt(null);
          }}
        />
      )}
      {editing && <PaymentForm summary={summary} entry={entry} busy={busy} onSave={(payload) => payments.update(entry.id, payload)} onCancel={() => setEditing(false)} />}
    </li>
  );
};

interface Props {
  orderId: number;
  /** Load only while shown. */
  enabled: boolean;
  /** The supplier's own view: confirmed entries only, nothing to record or decide. */
  view?: 'staff' | 'supplier';
  /** Figures and entries only, nothing to record or decide (e.g. inside another form). */
  readOnly?: boolean;
}

/**
 * An order's payments to its supplier against the quotation's payment plan: what each part is worth, what was paid and
 * confirmed, what is still owed and, when units failed testing or the order was cancelled, the refund the supplier owes.
 * Payment staff record entries; someone else confirms them.
 */
export const OrderPaymentsPanel: React.FC<Props> = ({ orderId, enabled, view = 'staff', readOnly = false }) => {
  const payments = useOrderPayments(orderId, enabled, view);
  const userId = useAuthStore((state) => state.user?.userId);
  const [recording, setRecording] = useState(false);
  const canRecord = payments.canRecord && !readOnly;
  const canApprove = payments.canApprove && !readOnly;

  if (!enabled) return null;
  if (payments.loading) {
    return (
      <p role="status" className="flex items-center gap-1.5 text-gray-500 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading payments…
      </p>
    );
  }
  if (!payments.data) return null;
  const { summary, entries } = payments.data;
  const claim = summary.claim;
  const canRecordNow = canRecord && (summary.openMilestones.length > 0 || claim?.status === 'OPEN');

  return (
    <section aria-label="Payments to the supplier" className="p-3 border border-black/10 dark:border-white/10 rounded-xl space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-medium text-gray-500">
          <Wallet className="w-3.5 h-3.5" /> Payments to the supplier
        </h3>
        {canRecordNow && !recording && (
          <button type="button" onClick={() => setRecording(true)} className={`${smallButton} ${SOLID_TONE.primary}`}>
            Record payment
          </button>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-300" data-testid="payment-plan">
        {describePlan(summary) ?? 'No payment plan (an order made before plans existed): it is paid after testing.'}
      </p>
      <PaymentFigures summary={summary} />
      <MilestoneTable summary={summary} />
      {claim && <RefundClaimBox claim={claim} canApprove={canApprove} busy={payments.isSubmitting} onAdjust={payments.adjustClaim} />}
      {recording && <PaymentForm summary={summary} busy={payments.isSubmitting} onSave={payments.record} onCancel={() => setRecording(false)} />}
      {entries.length === 0 ? (
        <p className="text-gray-400 italic">{view === 'supplier' ? 'No payment recorded yet.' : 'Nothing recorded yet.'}</p>
      ) : (
        <ul className="space-y-2" aria-label="Payment entries">
          {entries.map((entry) => (
            <PaymentEntryItem
              key={entry.id}
              entry={entry}
              summary={summary}
              payments={payments}
              mine={entry.recordedBy != null && entry.recordedBy === userId}
              actions={view === 'staff' && !readOnly}
              canRecord={canRecord}
              canApprove={canApprove}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
