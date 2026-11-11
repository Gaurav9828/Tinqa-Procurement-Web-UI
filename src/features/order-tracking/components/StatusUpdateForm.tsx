import React, { useMemo, useState } from 'react';
import { CreditCard, KeyRound, Loader2, Lock, Mail, RefreshCw, Send, Truck, Undo2 } from 'lucide-react';
import { CommonInput, CommonTextArea } from '../../../components/ui/FormInputs';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { NextStepPicker } from '../../../components/ui/NextStepPicker';
import type { TrackingStatusOption } from '../types/orderTracking.types';
import { formatStatusLabel } from '../utils/orderTracking.utils';
import {
  DELIVERY_CODE_LENGTH,
  DELIVERY_CODE_PATTERN,
  SHIPPING_COST_REQUIRED,
  SHIPPING_COST_STATUSES,
  STATUS_NOTES_MAX_LENGTH,
  type ShippingCostInput,
  type StatusUpdateResult,
} from '../hooks/useStatusUpdate';
import {
  FINAL_STATUSES,
  STATUS_INFO,
  getAllowedStatuses,
  getDeliveryOutcomes,
  getLockReason,
  getPaymentBlockReason,
  getRefundHint,
  isConfirmBlockedByPayment,
  needsConfirmation,
  type WorkflowContext,
} from '../utils/statusWorkflow';

interface Props {
  orderNumber: string;
  /** From GET /admin/orders/tracking-statuses. */
  statuses: TrackingStatusOption[];
  statusesLoading: boolean;
  statusesError: boolean;
  onRetryStatuses: () => void;
  /** Current status and payment, which decide the allowed next steps. */
  workflow: WorkflowContext;
  isSubmitting: boolean;
  onSubmit: (
    orderNumber: string,
    status: string,
    notes: string,
    shipping?: ShippingCostInput,
    deliveryCode?: string
  ) => Promise<StatusUpdateResult>;
  /** Emails the customer a new delivery code (useDeliveryCodeResend); offered with Delivered. */
  deliveryCodeResend?: { resend: () => Promise<boolean>; isSending: boolean; waitSeconds: number };
  /** Delivery riders: only delivery outcomes are offered; payment and refund guidance is not theirs to act on. */
  deliveryOnly?: boolean;
}

/**
 * Moves the order one step forward. Only the steps that may follow the current status are offered
 * (as cards, never a list of every status); there is no undo. Final, exceptional and delivery steps
 * ask for confirmation, and closed orders are locked. Delivery riders see only the delivery outcomes.
 */
export const StatusUpdateForm: React.FC<Props> = ({
  orderNumber,
  statuses,
  statusesLoading,
  statusesError,
  onRetryStatuses,
  workflow,
  isSubmitting,
  onSubmit,
  deliveryOnly = false,
  deliveryCodeResend,
}) => {
  const [status, setStatus] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [notes, setNotes] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [shippingPartner, setShippingPartner] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lockReason = getLockReason(workflow);
  // The cost of the leg this move starts, entered here and sent for approval as an expense
  const asksShippingCost = !deliveryOnly && SHIPPING_COST_STATUSES.has(status);
  const shippingCostRequired = SHIPPING_COST_REQUIRED.has(status);
  // Delivered needs the code the customer gives once the device is set up and working
  const asksDeliveryCode = status === 'DELIVERED';

  // Workflow rules ∩ statuses the server knows (a step the backend doesn't support yet is never offered).
  const options = useMemo(() => {
    const known = new Set(statuses.map((option) => option.status));
    return (deliveryOnly ? getDeliveryOutcomes(workflow) : getAllowedStatuses(workflow))
      .filter((next) => known.has(next))
      .map((next) => ({
        value: next,
        label: STATUS_INFO[next]?.action ?? formatStatusLabel(next),
        description: STATUS_INFO[next]?.description,
        tone: STATUS_INFO[next]?.tone,
      }));
  }, [statuses, workflow, deliveryOnly]);

  const noOptions = !statusesLoading && !statusesError && options.length === 0;
  const controlsDisabled = isSubmitting || statusesLoading || statusesError || noOptions;
  // Confirming would be the next step, but the order isn't fully paid: explain why it's missing.
  const paymentBlockReason = !deliveryOnly && isConfirmBlockedByPayment(workflow) ? getPaymentBlockReason(workflow.paymentStatus) : null;
  // Refunds never go through this form (e.g. a paid return after inspection is refunded from the Refunds section).
  const refundHint = deliveryOnly ? null : getRefundHint(workflow);

  const send = async () => {
    const result = await onSubmit(
      orderNumber,
      status,
      notes,
      asksShippingCost ? { cost: shippingCost, partner: shippingPartner } : undefined,
      asksDeliveryCode ? deliveryCode : undefined
    );
    setConfirmOpen(false);
    setFieldErrors(result.fieldErrors);
    if (result.ok) {
      setStatus('');
      setNotes('');
      setShippingCost('');
      setShippingPartner('');
      setDeliveryCode('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (controlsDisabled || !status) return;
    if (asksShippingCost && shippingCostRequired && !shippingCost.trim()) {
      setFieldErrors((prev) => ({ ...prev, shippingCost: 'Enter what this shipment costs (0 if nothing).' }));
      return;
    }
    if (asksDeliveryCode && !DELIVERY_CODE_PATTERN.test(deliveryCode.trim())) {
      setFieldErrors((prev) => ({
        ...prev,
        deliveryCode: `Enter the ${DELIVERY_CODE_LENGTH}-character code the customer gives you (letters and digits).`,
      }));
      return;
    }
    if (status && needsConfirmation(status)) {
      setConfirmOpen(true);
      return;
    }
    await send();
  };

  const statusLabel = formatStatusLabel(status);
  const confirmDescription = (() => {
    if (status === 'CANCELLED') {
      return `Order ${orderNumber} will be cancelled. It can never move forward to fulfilment afterwards${
        workflow.paymentStatus && workflow.paymentStatus.toUpperCase() === 'PAID' ? '; the payment will then be refunded' : ''
      }.`;
    }
    if (status === 'DELIVERED') {
      return `Order ${orderNumber} will be marked Delivered with the customer's delivery code, which confirms the device was set up and works. After this, only a return can be requested.`;
    }
    if (status === 'CUSTOMER_CANCELLED_DELIVERY') {
      return `Order ${orderNumber} will be recorded as refused by the customer. It can't be delivered again and goes back to the warehouse.`;
    }
    if (FINAL_STATUSES.has(status)) return `Order ${orderNumber} will be closed as "${statusLabel}". This is final: no further status changes will be possible.`;
    return `Order ${orderNumber} will move to "${statusLabel}". Status changes can't be undone.`;
  })();

  // A rider has nothing to record until the order is on its delivery leg; say so instead of locking the order.
  if (deliveryOnly && !lockReason && !statusesLoading && !statusesError && options.length === 0) {
    return (
      <div role="status" aria-label="No delivery update" className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-[11px] text-gray-600 dark:text-gray-300 space-y-1">
        <p className="flex items-center gap-1.5 font-semibold text-black dark:text-white">
          <Truck className="w-3.5 h-3.5" /> Nothing to record yet
        </p>
        <p>
          Delivery updates open once the order has shipped. Until then, and for returns, cancellations and refunds, the
          store team updates this order.
        </p>
      </div>
    );
  }

  if (lockReason) {
    return (
      <div role="status" aria-label="Status locked" className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-[11px] text-gray-600 dark:text-gray-300 space-y-1">
        <p className="flex items-center gap-1.5 font-semibold text-black dark:text-white">
          <Lock className="w-3.5 h-3.5" /> Status locked
        </p>
        <p>{lockReason}</p>
      </div>
    );
  }

  return (
    <>
      {paymentBlockReason && (
        <p
          role="note"
          aria-label="Payment required"
          className="flex items-start gap-1.5 p-3 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400"
        >
          <CreditCard className="w-3.5 h-3.5 mt-px shrink-0" />
          <span>{paymentBlockReason} Confirmed is not offered until then.</span>
        </p>
      )}

      {refundHint && (
        <p
          role="note"
          aria-label="Refund handled separately"
          className="flex items-start gap-1.5 p-3 mb-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-700 dark:text-purple-300"
        >
          <Undo2 className="w-3.5 h-3.5 mt-px shrink-0" />
          <span>{refundHint}</span>
        </p>
      )}

      <p className="text-[11px] text-gray-500 dark:text-neutral-400 mb-3">
        {deliveryOnly
          ? 'Record what happened with this delivery. Only delivery updates are shown; other changes are made by the store team.'
          : "Choose the next step in the order's journey. Only steps that can follow the current status are shown, and a step can't be undone."}
      </p>

      {statusesError ? (
        <div role="alert" className="mb-3 p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] flex items-center justify-between gap-2">
          <span>Status options could not be loaded.</span>
          <button type="button" onClick={onRetryStatuses} className="flex items-center gap-1 font-semibold cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} aria-label="Update order status" className="space-y-3" noValidate>
        {statusesLoading ? (
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5" role="status">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading next steps…
          </p>
        ) : noOptions ? (
          <p className="text-[11px] text-gray-500" role="status">
            No status change is available right now.
          </p>
        ) : (
          <NextStepPicker
            options={options}
            value={status}
            disabled={isSubmitting || statusesError}
            error={fieldErrors.status}
            onChange={(value) => {
              setStatus(value);
              setFieldErrors((prev) => ({ ...prev, status: '' }));
            }}
          />
        )}
        {asksShippingCost && (
          <div className="space-y-2 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]" role="group" aria-label="Shipping cost of this leg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <CommonInput
                label={shippingCostRequired ? 'Shipping cost (₹)' : 'Shipping cost (₹, optional)'}
                aria-label="Shipping cost"
                required={shippingCostRequired}
                inputMode="decimal"
                placeholder="0.00"
                value={shippingCost}
                error={fieldErrors.shippingCost}
                disabled={controlsDisabled}
                onChange={(e) => {
                  setShippingCost(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, shippingCost: '' }));
                }}
              />
              <CommonInput
                label="Courier / partner (optional)"
                aria-label="Shipping partner"
                maxLength={100}
                value={shippingPartner}
                error={fieldErrors.shippingPartner}
                disabled={controlsDisabled}
                onChange={(e) => setShippingPartner(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-gray-500 dark:text-neutral-400 px-1">
              What the company pays for this leg, even when the customer paid no shipping. It goes to an approver as an
              expense and is posted to the company account once approved. Enter 0 if nothing was spent.
            </p>
          </div>
        )}
        {asksDeliveryCode && (
          <div className="space-y-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20" role="group" aria-label="Customer's delivery code">
            <p className="flex items-start gap-1.5 text-[11px] text-gray-700 dark:text-gray-300">
              <KeyRound className="w-3.5 h-3.5 mt-px shrink-0 text-emerald-600" />
              <span>
                Unpack the device, set it up and show the customer how it works. Once they have checked it is OK and working,
                they give you the {DELIVERY_CODE_LENGTH}-character code from their &ldquo;out for delivery&rdquo; email. That code is
                their confirmation; never ask for it before.
              </span>
            </p>
            <CommonInput
              label="Delivery code"
              aria-label="Delivery code"
              required
              maxLength={DELIVERY_CODE_LENGTH}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="e.g. aB3kP9x"
              className="font-mono tracking-[0.3em]"
              value={deliveryCode}
              error={fieldErrors.deliveryCode}
              disabled={controlsDisabled}
              onChange={(e) => {
                setDeliveryCode(e.target.value.replace(/[^A-Za-z0-9]/g, ''));
                setFieldErrors((prev) => ({ ...prev, deliveryCode: '' }));
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-[10px] text-gray-500 dark:text-neutral-400">
                Capital and small letters differ. After 5 wrong tries the code stops working.
              </span>
              {deliveryCodeResend && (
                <button
                  type="button"
                  onClick={() => void deliveryCodeResend.resend()}
                  disabled={controlsDisabled || deliveryCodeResend.isSending || deliveryCodeResend.waitSeconds > 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#0071e3]/40 bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/20 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {deliveryCodeResend.isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                  {deliveryCodeResend.waitSeconds > 0 ? `Resend code in ${deliveryCodeResend.waitSeconds}s` : 'Resend code to customer'}
                </button>
              )}
            </div>
          </div>
        )}
        <div>
          <CommonTextArea
            label="Notes (optional)"
            aria-label="Notes"
            rows={3}
            maxLength={STATUS_NOTES_MAX_LENGTH}
            value={notes}
            error={fieldErrors.notes}
            disabled={controlsDisabled}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-[10px] text-gray-400 px-1 mt-1 flex justify-between gap-2">
            <span>Shown in the tracking history.</span>
            <span className="shrink-0">
              {notes.length}/{STATUS_NOTES_MAX_LENGTH}
            </span>
          </p>
        </div>
        <button
          type="submit"
          disabled={controlsDisabled || !status || (asksDeliveryCode && deliveryCode.length !== DELIVERY_CODE_LENGTH)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed ${
            !status ? 'bg-[#0071e3] hover:bg-[#0077ed]' : STATUS_INFO[status]?.tone === 'exception' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isSubmitting ? 'Saving…' : 'Update status'}
        </button>
      </form>

      <ConfirmationModal
        isOpen={confirmOpen}
        actionType={status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRM'}
        requestId={orderNumber}
        title={`Move order to "${statusLabel}"?`}
        description={confirmDescription}
        isSubmitting={isSubmitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={send}
      />
    </>
  );
};
