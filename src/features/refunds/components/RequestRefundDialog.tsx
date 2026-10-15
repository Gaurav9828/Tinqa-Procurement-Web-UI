import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { CommonInput, CommonRadioGroup, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { formatPaise } from '../../order-tracking/utils/payment.utils';
import type { RefundablePayment, RefundRequestPayload, RefundSpeed } from '../types/refund.types';
import type { RefundMutationResult } from '../hooks/useRefundMutations';
import { REFUND_TEXT_MAX_LENGTH, paiseToRupeesInput, validateRefundAmount, validateRefundText } from '../utils/refund.utils';
import { RefundDialogShell } from './RefundDialogShell';

interface Props {
  orderNumber: string;
  /** Payments that can still be refunded (non-empty). */
  payments: RefundablePayment[];
  /** Send `paymentId` only when the order has more than one payment. */
  choosePayment: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: RefundRequestPayload) => Promise<RefundMutationResult>;
}

const SPEED_OPTIONS: { label: string; value: RefundSpeed }[] = [
  { label: 'Normal (5–7 working days)', value: 'normal' },
  { label: 'Instant (where Razorpay supports it)', value: 'optimum' },
];

/** L1: amount (₹, default = refundable), required reason and speed; confirmed before it is sent. */
export const RequestRefundDialog: React.FC<Props> = ({ orderNumber, payments, choosePayment, isSubmitting, onClose, onSubmit }) => {
  const [paymentId, setPaymentId] = useState(payments[0].paymentId);
  const payment = payments.find((p) => p.paymentId === paymentId) ?? payments[0];
  const [amount, setAmount] = useState(paiseToRupeesInput(payment.refundablePaise));
  const [reason, setReason] = useState('');
  const [speed, setSpeed] = useState<RefundSpeed>('normal');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<RefundRequestPayload | null>(null);

  const clearError = (field: string) => setErrors((prev) => ({ ...prev, [field]: '' }));
  const requiredFilled = !!amount.trim() && !!reason.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !requiredFilled) return;
    const checked = validateRefundAmount(amount, payment.refundablePaise, payment.currency);
    const reasonError = validateRefundText(reason, 'Reason');
    if (checked.error || reasonError) {
      setErrors({ amountPaise: checked.error ?? '', reason: reasonError ?? '' });
      return;
    }
    setPending({
      reason: reason.trim(),
      amountPaise: checked.paise!,
      speed,
      ...(choosePayment ? { paymentId: payment.paymentId } : {}),
    });
  };

  const send = async () => {
    if (!pending) return;
    const result = await onSubmit(pending);
    setPending(null);
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  };

  return (
    <>
      <RefundDialogShell title="Request refund" subtitle={`Order ${orderNumber}`} disabled={isSubmitting} onClose={onClose}>
        <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Request refund">
          {choosePayment && (
            <CommonSelect
              label="Payment"
              aria-label="Payment"
              value={String(paymentId)}
              disabled={isSubmitting}
              error={errors.paymentId}
              options={payments.map((p) => ({
                value: String(p.paymentId),
                label: `${p.razorpayPaymentId} · ${formatPaise(p.refundablePaise, p.currency)} refundable`,
              }))}
              onChange={(e) => {
                const next = payments.find((p) => String(p.paymentId) === e.target.value);
                if (!next) return;
                setPaymentId(next.paymentId);
                setAmount(paiseToRupeesInput(next.refundablePaise));
                clearError('paymentId');
              }}
            />
          )}

          <div>
            <CommonInput
              label="Amount (₹)"
              aria-label="Refund amount"
              inputMode="decimal"
              required
              value={amount}
              disabled={isSubmitting}
              error={errors.amountPaise}
              onChange={(e) => {
                setAmount(e.target.value);
                clearError('amountPaise');
              }}
            />
            <p className="text-[10px] text-gray-400 px-1 mt-1">
              Up to {formatPaise(payment.refundablePaise, payment.currency)} can be refunded on payment {payment.razorpayPaymentId}.
            </p>
          </div>

          <div>
            <CommonTextArea
              label="Reason"
              aria-label="Refund reason"
              required
              rows={3}
              maxLength={REFUND_TEXT_MAX_LENGTH}
              value={reason}
              disabled={isSubmitting}
              error={errors.reason}
              onChange={(e) => {
                setReason(e.target.value);
                clearError('reason');
              }}
            />
            <p className="text-[10px] text-gray-400 px-1 mt-1 flex justify-between gap-2">
              <span>Seen by the approving admin.</span>
              <span className="shrink-0">
                {reason.length}/{REFUND_TEXT_MAX_LENGTH}
              </span>
            </p>
          </div>

          <CommonRadioGroup
            label="Speed"
            name="refund-speed"
            options={SPEED_OPTIONS}
            value={speed}
            disabled={isSubmitting}
            error={errors.speed}
            onChange={(value) => {
              setSpeed(value as RefundSpeed);
              clearError('speed');
            }}
          />

          <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
            No money moves yet. The refund is sent to Razorpay only after a different approver approves it.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !requiredFilled}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Request refund
            </button>
          </div>
        </form>
      </RefundDialogShell>

      <ConfirmationModal
        isOpen={!!pending}
        actionType="SUBMIT"
        title="Request this refund?"
        description={
          pending
            ? `${formatPaise(pending.amountPaise ?? payment.refundablePaise, payment.currency)} (${
                speed === 'optimum' ? 'instant' : 'normal'
              } speed) will be refunded to the customer for order ${orderNumber} once an approver approves it.`
            : ''
        }
        isSubmitting={isSubmitting}
        onClose={() => setPending(null)}
        onConfirm={send}
      />
    </>
  );
};
