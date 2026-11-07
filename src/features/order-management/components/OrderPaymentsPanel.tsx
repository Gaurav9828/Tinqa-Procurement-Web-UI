import React, { useState } from 'react';
import { Wallet, Loader2, AlertTriangle, CheckCircle2, History, Paperclip } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { todayLocalIsoDate } from '../validator/orderValidator';
import { useOrderPayments } from '../hooks/useOrderPayments';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, REFERENCE_LABELS, describePlan, referenceRequired, type PaymentMethod } from '../utils/paymentPlan';
import { nextMilestone, payableMilestones, paymentAmountDue } from '../utils/paymentDue';
import { PaidFields } from './PaidFields';
import { RepaymentCheck, RepaymentForm } from './RepaymentForms';
import { SettlementBreakdown } from './SettlementBreakdown';
import {
  CLAIM_CAUSE_LABELS,
  MILESTONE_LABELS,
  PAYMENT_EVENT_LABELS,
  PAYMENT_STATUS_LABELS,
  REPAYMENT_STATUSES,
  SUPPLIER_TO_REPAY,
  type MarkPaidRequest,
  type PaymentEvent,
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
  TO_PAY: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  AWAITING_SUPPLIER: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  NOT_RECEIVED: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  APPROVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  WITHDRAWN: 'bg-black/5 dark:bg-white/10 text-gray-500',
  REPAYMENT_DUE: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  REPAYMENT_SENT: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  REPAYMENT_MISSING: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
};

const entryTitle = (entry: SupplierPaymentEntry) => {
  if (entry.kind === 'PAYMENT') return `${MILESTONE_LABELS[entry.milestone ?? 'ADVANCE']} payment`;
  if (entry.returnId != null) return 'Repayment for returned pieces';
  if (entry.kind === 'REFUND') return 'Refund from the supplier';
  return entry.milestone ? `Reversal of a ${MILESTONE_LABELS[entry.milestone].toLowerCase()} payment` : 'Reversal of a refund';
};

interface FormState {
  milestone: PaymentMilestone | '';
  method: PaymentMethod | '';
  note: string;
}

// Pre-filled as the supplier likes it: the next part due, at the plan's amount, by the quotation's expected method
const formFor = (summary: PaymentSummary, entry?: SupplierPaymentEntry): FormState =>
  entry
    ? { milestone: entry.milestone ?? '', method: entry.method, note: entry.note ?? '' }
    : { milestone: nextMilestone(summary), method: summary.expectedPaymentMethod ?? '', note: '' };

const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;

/** "UTR number", "transaction ID"...: what the Finance Manager enters once the request is paid. */
const referenceName = (method: PaymentMethod | ''): string => (method ? REFERENCE_LABELS[method].replace(' (optional)', '').toLowerCase() : 'reference');

/**
 * A payment request to the Super Admin (or its correction while it waits). Its amount is what is left of the chosen
 * part of the plan: shown, not typed; it has no date or reference yet, because nothing is paid before the Super Admin
 * approves. Refunds are no longer recorded here: the supplier pays them in their portal.
 */
const PaymentForm: React.FC<{
  summary: PaymentSummary;
  entry?: SupplierPaymentEntry;
  busy: boolean;
  onSave: (payload: RecordPaymentRequest) => Promise<boolean>;
  onCancel: () => void;
}> = ({ summary, entry, busy, onSave, onCancel }) => {
  const [form, setForm] = useState<FormState>(() => formFor(summary, entry));
  const set = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const milestones = payableMilestones(summary, entry);
  const amount = form.milestone ? paymentAmountDue(summary, form.milestone, entry) : 0;
  const valid = amount > 0 && !!form.method && !!form.milestone;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const ok = await onSave({
      kind: 'PAYMENT',
      milestone: form.milestone as PaymentMilestone,
      amount,
      method: form.method as PaymentMethod,
      note: form.note.trim() || undefined,
    });
    if (ok) onCancel();
  };

  return (
    <form onSubmit={submit} aria-label={entry ? 'Correct payment entry' : 'Request a payment'} className="space-y-2 p-3 rounded-xl border border-[#0071e3]/30 bg-[#0071e3]/[0.03]">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-0.5">
          <span className="text-gray-500">Part of the plan</span>
          <select aria-label="Part of the plan" className={field} value={form.milestone} onChange={(e) => set({ milestone: e.target.value as PaymentMilestone })}>
            <option value="" disabled>Choose</option>
            {milestones.map((m) => (
              <option key={m} value={m}>{MILESTONE_LABELS[m]}</option>
            ))}
          </select>
        </label>
        <label className="space-y-0.5">
          <span className="text-gray-500">Amount (₹)</span>
          <input aria-label="Amount" readOnly aria-readonly="true" tabIndex={-1} className={`${field} bg-black/[0.03] dark:bg-white/[0.04] cursor-not-allowed font-semibold`}
            value={form.milestone ? formatCurrency(amount) : ''} />
          <span className="block text-[10px] text-gray-400">
            {form.milestone ? `Set by the payment plan: what is left of the ${MILESTONE_LABELS[form.milestone].toLowerCase()} part.` : 'Choose the part of the plan.'}
          </span>
        </label>
        <label className="space-y-0.5">
          <span className="text-gray-500">Method</span>
          <select aria-label="Method" className={field} value={form.method} onChange={(e) => set({ method: e.target.value as PaymentMethod })}>
            <option value="" disabled>Choose</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
                {m === summary.expectedPaymentMethod ? ' (supplier’s choice)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="note" className="p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
        Nothing is paid yet: the Super Admin approves this request first. Then you pay it and enter the {referenceName(form.method)},
        and the supplier confirms they received it. It counts as paid only then.
      </p>
      <label className="block space-y-0.5">
        <span className="text-gray-500">Note</span>
        <input aria-label="Note" maxLength={500} className={field} value={form.note} onChange={(e) => set({ note: e.target.value })} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`${smallButton} bg-black/5 dark:bg-white/10`}>Cancel</button>
        <button type="submit" disabled={!valid || busy} className={`${smallButton} ${SOLID_TONE.primary}`}>
          {entry ? 'Save correction' : 'Send for Super Admin approval'}
        </button>
      </div>
    </form>
  );
};

const PROOF_TYPES = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

/**
 * Paying an approved request (`resend` false), or sending it again after the supplier said it did not reach them
 * (`resend` true: say what was checked, and optionally attach a proof such as the bank's confirmation).
 */
const PaidForm: React.FC<{
  entry: SupplierPaymentEntry;
  resend: boolean;
  busy: boolean;
  onSave: (payload: MarkPaidRequest & { proof?: File | null }) => Promise<boolean>;
  onCancel: () => void;
}> = ({ entry, resend, busy, onSave, onCancel }) => {
  const [paidOn, setPaidOn] = useState(entry.paidOn ?? todayLocalIsoDate());
  const [reference, setReference] = useState(entry.reference ?? '');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const valid = !!paidOn && (!referenceRequired(entry.method) || !!reference.trim()) && (!resend || !!note.trim());
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const ok = await onSave({ paidOn, reference: reference.trim() || undefined, note: note.trim() || undefined, ...(resend ? { proof } : {}) });
    if (ok) onCancel();
  };
  return (
    <form onSubmit={submit} aria-label={resend ? 'Send the payment again' : 'Record the payment made'} className="space-y-2 p-3 rounded-xl border border-[#0071e3]/30 bg-[#0071e3]/[0.03]">
      <p className="text-gray-600 dark:text-gray-300">
        {resend
          ? 'The supplier said this payment did not reach them. Check it with the bank, correct the details if needed, and send it again.'
          : `Approved by the Super Admin. Pay ${formatCurrency(entry.amount)} by ${PAYMENT_METHOD_LABELS[entry.method].toLowerCase()}, then enter the details.`}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <PaidFields method={entry.method} paidOn={paidOn} reference={reference}
          onChange={(patch) => {
            if (patch.paidOn !== undefined) setPaidOn(patch.paidOn);
            if (patch.reference !== undefined) setReference(patch.reference);
          }} />
      </div>
      <label className="block space-y-0.5">
        <span className="text-gray-500">{resend ? 'What you checked' : 'Note'}{resend && <span className="text-rose-600"> *</span>}</span>
        <input aria-label={resend ? 'What you checked' : 'Note'} required={resend} maxLength={500} className={field} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {resend && (
        <label className="block space-y-0.5">
          <span className="text-gray-500">Proof (optional: PDF, JPG or PNG)</span>
          <input aria-label="Proof file" type="file" accept={PROOF_TYPES} className="block text-[11px]"
            onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
        </label>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`${smallButton} bg-black/5 dark:bg-white/10`}>Cancel</button>
        <button type="submit" disabled={!valid || busy} className={`${smallButton} ${SOLID_TONE.approve}`}>
          {resend ? 'Send again to the supplier' : 'Paid: send to the supplier'}
        </button>
      </div>
    </form>
  );
};

/** One entry's steps, oldest first: who did what and when, the references given and any proof attached. */
const EntryHistory: React.FC<{ entry: SupplierPaymentEntry; onProof: (event: PaymentEvent) => void }> = ({ entry, onProof }) => {
  const [open, setOpen] = useState(false);
  const events = entry.events ?? [];
  if (events.length === 0) return null;
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-[11px] text-[#0071e3] cursor-pointer">
        <History className="w-3 h-3" /> {open ? 'Hide history' : `History (${events.length})`}
      </button>
      {open && (
        <ol aria-label="Payment history" className="mt-1 ml-1.5 pl-3 border-l border-black/10 dark:border-white/10 space-y-1">
          {events.map((event, index) => (
            <li key={`${event.type}-${event.at}-${index}`} className="relative">
              <span aria-hidden className="absolute -left-[16.5px] top-1 w-2 h-2 rounded-full bg-[#0071e3]/60" />
              <span className="font-medium text-black dark:text-white">{PAYMENT_EVENT_LABELS[event.type]}</span>
              <span className="text-gray-400">
                {' · '}{new Date(event.at).toLocaleString()}
                {(event.actorRole || event.actorName) && ` · ${[event.actorName, event.actorRole].filter(Boolean).join(', ')}`}
              </span>
              {(event.reference || event.paidOn) && (
                <span className="block text-gray-500">
                  {[event.paidOn && `paid on ${formatDate(event.paidOn)}`, event.reference && `ref ${event.reference}`].filter(Boolean).join(' · ')}
                </span>
              )}
              {event.note && <span className="block text-gray-600 dark:text-gray-300">{event.note}</span>}
              {event.proofDocumentId != null && (
                <button type="button" onClick={() => onProof(event)} className="flex items-center gap-1 text-[11px] text-[#0071e3] cursor-pointer">
                  <Paperclip className="w-3 h-3" /> {event.proofFileName ?? 'Proof'}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

/** A short reason, then the action (reject, reverse); `note` says what the action leads to. */
const ReasonPrompt: React.FC<{ label: string; reasonLabel?: string; note?: string; tone: 'danger' | 'warning'; busy: boolean; onConfirm: (reason: string) => void; onCancel: () => void }> = ({
  label, reasonLabel, note, tone, busy, onConfirm, onCancel,
}) => {
  const [reason, setReason] = useState('');
  return (
    <div className="space-y-1 pt-1">
      {note && <p role="note" className="text-amber-700 dark:text-amber-400">{note}</p>}
      <div className="flex items-center gap-2">
      <input aria-label={reasonLabel ?? `Reason to ${label.toLowerCase()}`} placeholder="Reason" maxLength={500} className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
      <button type="button" disabled={!reason.trim() || busy} onClick={() => onConfirm(reason.trim())} className={`${smallButton} ${SOLID_TONE[tone]}`}>{label}</button>
      <button type="button" onClick={onCancel} className={`${smallButton} bg-black/5 dark:bg-white/10`}>Cancel</button>
      </div>
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
  const supplierWaiting = summary.awaitingSupplier > 0 ? ` (${formatCurrency(summary.awaitingSupplier)} waiting for the supplier to confirm receipt)` : '';
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
          Waiting (requested, approved to pay, or with the supplier): {formatCurrency(summary.pendingPayments)}{supplierWaiting}{refundsWaiting}.
        </p>
      )}
      {summary.reversalClosed && (
        <p className="text-emerald-700 dark:text-emerald-400" data-testid="payment-reversal-closed">
          Payments are final: the order is delivered and tested, fully paid, and the supplier confirmed every payment. Nothing
          on this order can be reversed any more.
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
            {/* A part paid in full is no longer due */}
            {m.due && m.paid < m.planned && <span className="ml-1 text-[10px] text-[#0071e3]">due</span>}
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
  /** Who pays it and how (staff: the supplier pays in their portal; the supplier: Pay refund due) */
  footer?: React.ReactNode;
}> = ({ claim, canApprove, busy, onAdjust, footer }) => {
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
      {footer}
    </div>
  );
};


type Payments = ReturnType<typeof useOrderPayments>;

const isRepayment = (entry: SupplierPaymentEntry) => entry.kind !== 'PAYMENT' && (REPAYMENT_STATUSES.has(entry.status) || entry.returnId != null);

const notPaidYet = (entry: SupplierPaymentEntry) => (isRepayment(entry) ? 'not paid back yet' : 'not paid yet');

const entryFacts = (entry: SupplierPaymentEntry) =>
  [
    PAYMENT_METHOD_LABELS[entry.method],
    entry.paidOn ? `paid on ${formatDate(entry.paidOn)}` : notPaidYet(entry),
    entry.reference && `Ref ${entry.reference}`,
    entry.recordedByUsername && `${entry.kind === 'PAYMENT' ? 'requested' : 'asked'} by ${entry.recordedByUsername}`,
    entry.decidedByUsername && entry.status !== 'WITHDRAWN' && `${entry.kind === 'PAYMENT' ? 'approved' : 'checked'} by ${entry.decidedByUsername}`,
    entry.paidByUsername && `paid by ${entry.paidByUsername}`,
    (entry.sendCount ?? 0) > 1 && `sent ${entry.sendCount} times`,
  ]
    .filter(Boolean)
    .join(' · ');

/** The latest event of a type, e.g. the Finance Manager's "not received" with its reason. */
const lastEvent = (entry: SupplierPaymentEntry, ...types: PaymentEvent['type'][]): PaymentEvent | undefined =>
  [...(entry.events ?? [])].reverse().find((event) => types.includes(event.type));

/** The supplier's latest receipt file on a repayment, if they attached one. */
const latestReceipt = (entry: SupplierPaymentEntry): PaymentEvent | undefined =>
  [...(entry.events ?? [])].reverse().find((event) => event.proofDocumentId != null);

/** Why the Finance Manager said a repayment did not arrive. */
// The server puts it in decisionReason (also in the supplier's view); the event's note is the fallback
const missingReasonOf = (entry: SupplierPaymentEntry): string | null => entry.decisionReason ?? lastEvent(entry, 'REPAYMENT_MISSING')?.note ?? null;

type Form = 'edit' | 'paid' | 'resend' | 'check' | 'repay';

/**
 * What one person may do with one entry. Waiting for the Super Admin: approve or reject someone else's (approvers;
 * a later part waits until the earlier one is approved), correct or withdraw your own. Approved request: pay it. Not
 * received by the supplier: check and send it again. Confirmed: reverse it (the supplier pays it back), until the
 * order's reversal window closes (delivered, tested, fully paid, every payment received). Paid back by the supplier: the
 * Finance Manager checks it arrived.
 */
const EntryActions: React.FC<{ entry: SupplierPaymentEntry; mine: boolean; payments: Payments; canRecord: boolean; canApprove: boolean; reversalClosed: boolean; onPrompt: (action: 'reject' | 'reverse') => void; onForm: (form: Form) => void }> = ({
  entry, mine, payments, canRecord, canApprove, reversalClosed, onPrompt, onForm,
}) => {
  const busy = payments.isSubmitting;
  const isPayment = entry.kind === 'PAYMENT';
  const pending = entry.status === 'PENDING_APPROVAL';
  const decidable = pending && canApprove && !mine;
  const ownPending = pending && mine && canRecord;
  const toPay = entry.status === 'TO_PAY' && canRecord;
  const notReceived = entry.status === 'NOT_RECEIVED' && canRecord;
  // Withdrawn by its requester before the money moves: waiting, approved and not yet paid, not received, or a reversal
  // ask the supplier has not paid yet
  const withdrawable = mine && canRecord && (pending || entry.status === 'TO_PAY' || entry.status === 'NOT_RECEIVED' || entry.status === 'REPAYMENT_DUE');
  const reversible = entry.status === 'APPROVED' && entry.kind !== 'REVERSAL' && !entry.reversed && canRecord && !reversalClosed;
  const checkable = entry.status === 'REPAYMENT_SENT' && canRecord;
  const waitsFor = isPayment && pending ? entry.waitsFor : null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {decidable && (
        <>
          <button type="button" disabled={busy || !!waitsFor} onClick={() => payments.decide(entry.id, 'APPROVED')} className={`${smallButton} ${SOLID_TONE.approve}`}>
            {isPayment ? 'Approve payment' : 'Confirm'}
          </button>
          <button type="button" disabled={busy} onClick={() => onPrompt('reject')} className={`${smallButton} ${SOLID_TONE.danger}`}>
            Reject
          </button>
        </>
      )}
      {decidable && waitsFor && (
        <span className="text-[10px] text-amber-700 dark:text-amber-400">Approve the {MILESTONE_LABELS[waitsFor].toLowerCase()} first.</span>
      )}
      {pending && mine && canApprove && <span className="text-[10px] text-gray-400">You {isPayment ? 'requested' : 'recorded'} it: someone else decides it.</span>}
      {decidable && isPayment && !waitsFor && (
        <span className="text-[10px] text-gray-400">Once approved, the Finance Manager pays it and enters the reference.</span>
      )}
      {pending && isPayment && !canApprove && <span className="text-[10px] text-gray-400">Waiting for the Super Admin to approve it.</span>}
      {ownPending && entry.kind !== 'REVERSAL' && (
        <button type="button" disabled={busy} onClick={() => onForm('edit')} className={`${smallButton} ${SOLID_TONE.primary}`}>
          Correct
        </button>
      )}
      {toPay && (
        <button type="button" disabled={busy} onClick={() => onForm('paid')} className={`${smallButton} ${SOLID_TONE.approve}`}>
          Record payment made
        </button>
      )}
      {notReceived && (
        <button type="button" disabled={busy} onClick={() => onForm('resend')} className={`${smallButton} ${SOLID_TONE.warning}`}>
          Check and send again
        </button>
      )}
      {checkable && (
        <button type="button" disabled={busy} onClick={() => onForm('check')} className={`${smallButton} ${SOLID_TONE.primary}`}>
          Check repayment
        </button>
      )}
      {withdrawable && (
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

/** The supplier's answer to a payment waiting for them (any method): received it, or not (with a reason). */
const ReceiptActions: React.FC<{ entry: SupplierPaymentEntry; payments: Payments; onNotReceived: () => void }> = ({ entry, payments, onNotReceived }) => (
  <div className="space-y-1">
    <p className="text-amber-700 dark:text-amber-400">Did you receive this payment? Check it against the method and reference above. It counts as paid only once you confirm.</p>
    <div className="flex flex-wrap gap-1.5">
      <button type="button" disabled={payments.isSubmitting} onClick={() => payments.confirmReceipt(entry.id, true)} className={`${smallButton} ${SOLID_TONE.approve}`}>
        I received it
      </button>
      <button type="button" disabled={payments.isSubmitting} onClick={onNotReceived} className={`${smallButton} ${SOLID_TONE.danger}`}>
        Not received
      </button>
    </div>
  </div>
);

type Prompt = 'reject' | 'reverse' | 'not-received';

/** Each action that needs a reason: its button, its tone, what it leads to and what it sends. */
const PROMPTS: Record<Prompt, {
  label: string;
  reasonLabel?: string;
  note?: (entry: SupplierPaymentEntry) => string;
  tone: 'danger' | 'warning';
  send: (payments: Payments, id: number, reason: string) => Promise<boolean>;
}> = {
  reject: { label: 'Reject', tone: 'danger', send: (payments, id, reason) => payments.decide(id, 'REJECTED', reason) },
  reverse: {
    label: 'Reverse',
    tone: 'warning',
    // A payment's reversal is money coming back: the supplier pays it; a refund's reversal is money going out
    note: (entry) =>
      entry.kind === 'PAYMENT'
        ? 'This asks the supplier to pay the money back. They pay it in their portal with the UTR / transaction ID, and a Finance Manager checks it arrived. No Super Admin approval is needed.'
        : 'This pays the refund back to the supplier, so the Super Admin approves it first.',
    send: (payments, id, reason) => payments.reverse(id, reason),
  },
  'not-received': {
    label: 'Send',
    reasonLabel: 'What went wrong with this payment',
    tone: 'danger',
    send: (payments, id, reason) => payments.confirmReceipt(id, false, reason),
  },
};

/** What a repayment asks and how it was paid back: amount, the return's shipping charge, and the supplier's receipt. */
const RepaymentDetails: React.FC<{ entry: SupplierPaymentEntry; onReceipt: (event: PaymentEvent) => void }> = ({ entry, onReceipt }) => {
  const receipt = latestReceipt(entry);
  const charge = entry.chargeAmount ?? 0;
  return (
    <div className="space-y-0.5" data-testid={`repayment-details-${entry.id}`}>
      {charge > 0 && (
        <p className="text-gray-600 dark:text-gray-300">
          Pieces {formatCurrency(entry.amount)} + return shipping {formatCurrency(charge)} = {formatCurrency(entry.amount + charge)}
        </p>
      )}
      {receipt && (
        <button type="button" onClick={() => onReceipt(receipt)} className="flex items-center gap-1 text-[11px] text-[#0071e3] cursor-pointer">
          <Paperclip className="w-3 h-3" /> Receipt: {receipt.proofFileName ?? 'file'}
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
  /** The supplier's own view, answering payments waiting for them */
  canConfirmReceipt: boolean;
  /** The supplier's own view, paying back what is asked of them */
  canRepay: boolean;
}> = ({ entry, summary, payments, mine, actions, canRecord, canApprove, canConfirmReceipt, canRepay }) => {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const awaitingReceipt = canConfirmReceipt && entry.status === 'AWAITING_SUPPLIER';
  const toRepay = canRepay && SUPPLIER_TO_REPAY.has(entry.status);
  const [form, setForm] = useState<Form | null>(null);
  const busy = payments.isSubmitting;
  const close = () => setForm(null);
  const charge = entry.chargeAmount ?? 0;
  const proof = (event: PaymentEvent) => void payments.downloadProof(entry.id, event.proofDocumentId as number, event.proofFileName);
  const missing = entry.status === 'REPAYMENT_MISSING';
  return (
    <li className="p-2 rounded-lg border border-black/5 dark:border-white/10 space-y-1" data-testid={`payment-entry-${entry.id}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-black dark:text-white">
          {entryTitle(entry)} · {formatCurrency(entry.amount + charge)}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_TONE[entry.status]}`}>
          {entry.reversed ? 'Reversed' : PAYMENT_STATUS_LABELS[entry.status]}
        </span>
      </div>
      <p className="text-gray-500">{entryFacts(entry)}</p>
      {entry.note && <p className="text-gray-600 dark:text-gray-300">{entry.note}</p>}
      {isRepayment(entry) && <RepaymentDetails entry={entry} onReceipt={proof} />}
      {entry.decisionReason && !missing && <p className="text-rose-600">Reason: {entry.decisionReason}</p>}
      {missing && <p className="text-rose-600">Finance Manager: {missingReasonOf(entry) ?? 'not received'}</p>}
      {entry.supplierResponseReason && <p className="text-rose-600">Supplier: {entry.supplierResponseReason}</p>}
      {canConfirmReceipt && entry.status === 'NOT_RECEIVED' && (
        <p className="text-amber-700 dark:text-amber-400">You said you did not receive it. TinQa's Finance Manager is checking it and will send it again.</p>
      )}
      {canRepay && entry.status === 'REPAYMENT_SENT' && (
        <p className="text-sky-700 dark:text-sky-400">Thank you. TinQa's Finance Manager is checking it arrived.</p>
      )}
      <EntryHistory entry={entry} onProof={proof} />
      {awaitingReceipt && !prompt && <ReceiptActions entry={entry} payments={payments} onNotReceived={() => setPrompt('not-received')} />}
      {toRepay && !form && (
        <div className="space-y-1">
          <p className="text-amber-700 dark:text-amber-400">
            {missing ? 'Please pay it back again, with the bank’s receipt.' : 'TinQa asks you to pay this back. Pay it, then send the details here.'}
          </p>
          <button type="button" disabled={busy} onClick={() => setForm('repay')} className={`${smallButton} ${SOLID_TONE.approve}`}>
            Pay back
          </button>
        </div>
      )}
      {actions && !prompt && !form && (
        <EntryActions entry={entry} mine={mine} payments={payments} canRecord={canRecord} canApprove={canApprove} reversalClosed={summary.reversalClosed} onPrompt={setPrompt} onForm={setForm} />
      )}
      {prompt && (
        <ReasonPrompt
          label={PROMPTS[prompt].label}
          reasonLabel={PROMPTS[prompt].reasonLabel}
          note={PROMPTS[prompt].note?.(entry)}
          tone={PROMPTS[prompt].tone}
          busy={busy}
          onCancel={() => setPrompt(null)}
          onConfirm={async (reason) => {
            if (await PROMPTS[prompt].send(payments, entry.id, reason)) setPrompt(null);
          }}
        />
      )}
      {form === 'edit' && <PaymentForm summary={summary} entry={entry} busy={busy} onSave={(payload) => payments.update(entry.id, payload)} onCancel={close} />}
      {form === 'paid' && <PaidForm entry={entry} resend={false} busy={busy} onSave={({ paidOn, reference, note }) => payments.markPaid(entry.id, { paidOn, reference, note })} onCancel={close} />}
      {form === 'resend' && (
        <PaidForm entry={entry} resend busy={busy} onSave={(payload) => payments.resend(entry.id, { ...payload, note: payload.note ?? '' })} onCancel={close} />
      )}
      {form === 'check' && (
        <RepaymentCheck label={`Check repayment ${entry.id}`} busy={busy} onCancel={close}
          onCheck={async (received, reason) => {
            const ok = await payments.checkRepayment(entry.id, received, reason);
            if (ok) close();
            return ok;
          }} />
      )}
      {form === 'repay' && (
        <RepaymentForm
          title="Pay back"
          owed={entry.amount + charge}
          defaultMethod={entry.method}
          missingReason={missing ? missingReasonOf(entry) : undefined}
          busy={busy}
          onSave={(payload) => payments.submitRepayment(entry.id, payload)}
          onCancel={close}
        />
      )}
    </li>
  );
};

interface Props {
  orderId: number;
  /** Load only while shown. */
  enabled: boolean;
  /** The supplier's own view: confirmed entries, payments for them to confirm receipt of, and money to pay back. */
  view?: 'staff' | 'supplier';
  /** Figures and entries only, nothing to record or decide (e.g. inside another form). */
  readOnly?: boolean;
  /** Called after each saved change, for what the caller shows from these payments. */
  onChanged?: () => void;
}

/** What the supplier may still pay as a refund now: the claim's refund due less refunds in flight. */
const refundLeft = (summary: PaymentSummary) => Math.max(0, Math.round(((summary.claim?.refundDue ?? 0) - summary.pendingRefunds) * 100) / 100);

/**
 * An order's payments to its supplier against the quotation's payment plan: what each part is worth, what was paid and
 * confirmed, what is still owed and, when units failed testing or the order was cancelled, the refund the supplier owes.
 * The Finance Manager requests each payment; the Super Admin approves it (in plan order); the Finance Manager pays it
 * and enters the reference; the supplier confirms they received it (or it is checked and sent again). Money back from
 * the supplier is paid by them in their portal and checked by a Finance Manager.
 */
export const OrderPaymentsPanel: React.FC<Props> = ({ orderId, enabled, view = 'staff', readOnly = false, onChanged }) => {
  const payments = useOrderPayments(orderId, enabled, view, onChanged);
  const userId = useAuthStore((state) => state.user?.userId);
  const [recording, setRecording] = useState(false);
  const [payingRefund, setPayingRefund] = useState(false);
  const canRecord = payments.canRecord && !readOnly;
  const canApprove = payments.canApprove && !readOnly;
  const canRepay = payments.canRepay && !readOnly;

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
  const canRequestNow = canRecord && payableMilestones(summary).length > 0;
  const refundNow = claim?.status === 'OPEN' ? refundLeft(summary) : 0;
  const claimFooter = claim?.status === 'OPEN' && (
    view === 'supplier' ? (
      canRepay && refundNow > 0 && !payingRefund && (
        <button type="button" onClick={() => setPayingRefund(true)} className={`${smallButton} ${SOLID_TONE.approve}`}>
          Pay refund due
        </button>
      )
    ) : (
      <p className="text-gray-600 dark:text-gray-300">
        The supplier pays this refund in their portal, with the UTR / transaction ID and a receipt; a Finance Manager checks it arrived
        (Approvals Hub › Supplier repayments). Staff no longer record refunds.
      </p>
    )
  );

  return (
    <section aria-label="Payments to the supplier" className="p-3 border border-black/10 dark:border-white/10 rounded-xl space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-medium text-gray-500">
          <Wallet className="w-3.5 h-3.5" /> Payments to the supplier
        </h3>
        {canRequestNow && !recording && (
          <button type="button" onClick={() => setRecording(true)} className={`${smallButton} ${SOLID_TONE.primary}`}>
            Request payment
          </button>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-300" data-testid="payment-plan">
        {describePlan(summary) ?? 'No payment plan (an order made before plans existed): it is paid after testing.'}
      </p>
      <PaymentFigures summary={summary} />
      <SettlementBreakdown summary={summary} />
      <MilestoneTable summary={summary} />
      {claim && <RefundClaimBox claim={claim} canApprove={canApprove} busy={payments.isSubmitting} onAdjust={payments.adjustClaim} footer={claimFooter || null} />}
      {payingRefund && (
        <RepaymentForm
          title="Pay refund due"
          maxAmount={refundNow}
          defaultMethod={summary.expectedPaymentMethod}
          busy={payments.isSubmitting}
          onSave={({ amount, ...payload }) => payments.payRefundDue({ ...payload, amount: amount ?? refundNow })}
          onCancel={() => setPayingRefund(false)}
        />
      )}
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
              canConfirmReceipt={payments.canConfirmReceipt && !readOnly}
              canRepay={canRepay}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
