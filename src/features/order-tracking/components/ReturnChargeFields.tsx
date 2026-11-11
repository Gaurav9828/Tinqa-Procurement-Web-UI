import React from 'react';
import { CommonInput, CommonTextArea } from '../../../components/ui/FormInputs';
import { DecencyHint } from '../../../components/ui/DecencyHint';
import { decencyError } from '../../../utils/decency';
import { formatCurrency } from '../utils/orderTracking.utils';
import { RETURN_TEXT_MAX_LENGTH, chargeSettlementHint, type ReturnChargeInput } from '../utils/returnForms';

interface Props {
  input: ReturnChargeInput;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (field: keyof ReturnChargeInput, value: string) => void;
  /** The order's subtotal (what a return can refund); shipping is never part of it. */
  orderAmount: number | null;
  shippingFee: number | null;
}

/** What the customer will be able to do with this charge, in words (null while the charge can't be read). */
const settlementHintText = (hint: ReturnType<typeof chargeSettlementHint>, charge: number, orderAmount: number | null): string | null => {
  if (hint === 'free') return 'Free return: nothing to settle. The customer gets the order amount back.';
  if (hint === 'pay-only') return `No deduction: ${formatCurrency(charge)} is not less than the order amount, so the customer must pay it before the return starts.`;
  if (hint === 'deduct-or-pay' && orderAmount !== null) {
    return `Deduction possible: the customer may have ${formatCurrency(charge)} taken off the refund (refund ${formatCurrency(orderAmount - charge)}) or pay it now (refund ${formatCurrency(orderAmount)}).`;
  }
  return null;
};

/** The order amount vs shipping, the charge rule, and the charge with its reason; shared by every charge dialog. */
export const ReturnChargeFields: React.FC<Props> = ({ input, errors, disabled, onChange, orderAmount, shippingFee }) => {
  const charged = Number(input.charge) > 0;
  const hint = chargeSettlementHint(input.charge, orderAmount);
  const charge = Number(input.charge.trim() || '0');
  const hintText = settlementHintText(hint, charge, orderAmount);

  return (
    <>
      <dl aria-label="Order amount and shipping" className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Order amount (excl. shipping)</dt>
          <dd className="mt-0.5 text-black dark:text-white font-semibold" data-testid="charge-order-amount">
            {formatCurrency(orderAmount)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Shipping (not refunded)</dt>
          <dd className="mt-0.5 text-black dark:text-white" data-testid="charge-shipping">
            {formatCurrency(shippingFee)}
          </dd>
        </div>
      </dl>
      <p className="text-gray-600 dark:text-gray-300">
        If the charge is less than the order amount the customer may have it deducted; otherwise they must pay it before the return starts.
      </p>
      <div>
        <CommonInput
          label="Return charge (₹)"
          aria-label="Return charge"
          inputMode="decimal"
          required
          value={input.charge}
          error={errors.chargeAmount}
          disabled={disabled}
          onChange={(e) => onChange('charge', e.target.value)}
        />
        <p className="text-[10px] text-gray-400 px-1 mt-1">0 for a free return.</p>
        {hintText && (
          <p
            role="status"
            data-testid="charge-hint"
            className={`px-1 mt-1 font-medium ${hint === 'pay-only' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}
          >
            {hintText}
          </p>
        )}
      </div>
      <div>
        <CommonTextArea
          label={charged ? 'What the charge is for' : 'What the charge is for (only when charging)'}
          aria-label="Charge reason"
          required={charged}
          rows={2}
          maxLength={RETURN_TEXT_MAX_LENGTH}
          value={input.chargeReason}
          error={errors.chargeReason || decencyError(input.chargeReason)}
          disabled={disabled}
          onChange={(e) => onChange('chargeReason', e.target.value)}
        />
        <DecencyHint />
      </div>
    </>
  );
};
