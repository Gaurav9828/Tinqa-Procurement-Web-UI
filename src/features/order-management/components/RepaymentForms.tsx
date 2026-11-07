import React, { useState } from 'react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { todayLocalIsoDate } from '../validator/orderValidator';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, referenceRequired, type PaymentMethod } from '../utils/paymentPlan';
import { RECEIPT_ACCEPT, receiptProblem } from '../utils/receiptFile';
import type { RepaymentRequest } from '../types/supplierPayment.types';
import { PaidFields, paidField } from './PaidFields';

const smallButton = 'px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;

/**
 * The supplier pays money back: an ask (a reversal, or a return's pieces and shipping), or a refund due on the order's
 * claim (`maxAmount` set: the amount is typed, at most what is due). The method and the date, the UTR / transaction ID
 * / cheque number (not needed for cash), a note, and the bank's receipt (optional, PDF / PNG / JPG / WEBP up to 5 MB).
 */
export const RepaymentForm: React.FC<{
  title: string;
  /** What is asked (an ask's amount plus its charge), shown above the fields */
  owed?: number;
  /** A refund due: the most that may be paid now */
  maxAmount?: number;
  defaultMethod: PaymentMethod | null;
  /** After a "not received": the Finance Manager's reason, and an encouragement to attach the receipt */
  missingReason?: string | null;
  busy: boolean;
  onSave: (payload: RepaymentRequest & { amount?: number }) => Promise<boolean>;
  onCancel: () => void;
}> = ({ title, owed, maxAmount, defaultMethod, missingReason, busy, onSave, onCancel }) => {
  const [method, setMethod] = useState<PaymentMethod | ''>(defaultMethod ?? '');
  const [paidOn, setPaidOn] = useState(todayLocalIsoDate());
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(maxAmount !== undefined ? String(maxAmount) : '');
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileProblem = receiptProblem(receipt);
  const amountValid = maxAmount === undefined || (AMOUNT.test(amount.trim()) && Number(amount) > 0 && Number(amount) <= maxAmount + 1e-9);
  const valid = !!method && !!paidOn && (!referenceRequired(method) || !!reference.trim()) && !fileProblem && amountValid;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const ok = await onSave({
      method: method as PaymentMethod,
      reference: reference.trim() || undefined,
      paidOn,
      note: note.trim() || undefined,
      receipt,
      ...(maxAmount !== undefined ? { amount: Number(amount) } : {}),
    });
    if (ok) onCancel();
  };

  return (
    <form onSubmit={submit} aria-label={title} className="space-y-2 p-3 rounded-xl border border-[#0071e3]/30 bg-[#0071e3]/[0.03]">
      {owed !== undefined && <p className="font-semibold text-black dark:text-white">To pay back: {formatCurrency(owed)}</p>}
      {missingReason !== undefined && (
        <p role="alert" className="p-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400">
          TinQa's Finance Manager did not find this money{missingReason ? `: ${missingReason}` : '.'} Check it with your bank and send
          it again. Attach the bank's receipt this time so it can be found quickly.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {maxAmount !== undefined && (
          <label className="space-y-0.5">
            <span className="text-gray-500">Amount (₹)</span>
            <input aria-label="Amount" type="number" min="0.01" step="0.01" max={maxAmount} className={paidField} value={amount}
              onChange={(e) => setAmount(e.target.value)} />
            <span className="block text-[10px] text-gray-400">At most {formatCurrency(maxAmount)}</span>
          </label>
        )}
        <label className="space-y-0.5">
          <span className="text-gray-500">Method</span>
          <select aria-label="Method" className={paidField} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="" disabled>Choose</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </label>
        <PaidFields method={method} paidOn={paidOn} reference={reference}
          onChange={(patch) => {
            if (patch.paidOn !== undefined) setPaidOn(patch.paidOn);
            if (patch.reference !== undefined) setReference(patch.reference);
          }} />
      </div>
      <label className="block space-y-0.5">
        <span className="text-gray-500">Note</span>
        <input aria-label="Note" maxLength={500} className={paidField} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label className="block space-y-0.5">
        <span className="text-gray-500">Receipt ({missingReason !== undefined ? 'recommended' : 'optional'}: PDF, PNG, JPG or WEBP, up to 5 MB)</span>
        <input aria-label="Receipt file" type="file" accept={RECEIPT_ACCEPT} className="block text-[11px]"
          onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
        {fileProblem && <span role="alert" className="block text-[10px] text-rose-600">{fileProblem}</span>}
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`${smallButton} bg-black/5 dark:bg-white/10`}>Cancel</button>
        <button type="submit" disabled={!valid || busy} className={`${smallButton} ${SOLID_TONE.approve}`}>
          Send repayment
        </button>
      </div>
    </form>
  );
};

/**
 * The Finance Manager checks money a supplier says they paid back, against the bank: received (it counts), or not
 * received, with the reason the supplier will see (they then send it again with a receipt).
 */
export const RepaymentCheck: React.FC<{
  label: string;
  busy: boolean;
  onCheck: (received: boolean, reason?: string) => Promise<boolean>;
  onCancel?: () => void;
}> = ({ label, busy, onCheck, onCancel }) => {
  const [missing, setMissing] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <div role="group" aria-label={label} className="space-y-1.5 pt-1">
      <p className="text-gray-600 dark:text-gray-300">Check the bank statement for this amount and reference. It counts only once you confirm it arrived.</p>
      {missing ? (
        <div className="flex items-center gap-2">
          <input aria-label="Why it was not received" placeholder="Reason" maxLength={500} className={paidField} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" disabled={!reason.trim() || busy}
            onClick={async () => {
              if (await onCheck(false, reason.trim())) setMissing(false);
            }}
            className={`${smallButton} ${SOLID_TONE.danger}`}>
            Send: not received
          </button>
          <button type="button" onClick={() => setMissing(false)} className={`${smallButton} bg-black/5 dark:bg-white/10`}>Back</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={busy} onClick={() => void onCheck(true)} className={`${smallButton} ${SOLID_TONE.approve}`}>
            Received
          </button>
          <button type="button" disabled={busy} onClick={() => setMissing(true)} className={`${smallButton} ${SOLID_TONE.danger}`}>
            Not received
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className={`${smallButton} bg-black/5 dark:bg-white/10`}>Cancel</button>
          )}
        </div>
      )}
    </div>
  );
};
