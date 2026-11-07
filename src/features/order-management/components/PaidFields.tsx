import React from 'react';
import { todayLocalIsoDate } from '../validator/orderValidator';
import { PAYMENT_METHOD_LABELS, REFERENCE_LABELS, referenceRequired, type PaymentMethod } from '../utils/paymentPlan';

export const paidField = 'w-full px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-xs';

/**
 * The date and the reference (UTR, transaction ID, cheque number) of money that moved: a payment to the supplier, or
 * money the supplier pays back. The reference is required unless the method is cash.
 */
export const PaidFields: React.FC<{
  method: PaymentMethod | '';
  paidOn: string;
  reference: string;
  onChange: (patch: { paidOn?: string; reference?: string }) => void;
}> = ({ method, paidOn, reference, onChange }) => {
  const needsReference = referenceRequired(method);
  const label = method ? REFERENCE_LABELS[method] : 'Reference';
  return (
    <>
      <label className="space-y-0.5">
        <span className="text-gray-500">Paid on</span>
        <input aria-label="Paid on" type="date" max={todayLocalIsoDate()} className={paidField} value={paidOn} onChange={(e) => onChange({ paidOn: e.target.value })} />
      </label>
      <label className="space-y-0.5">
        <span className="text-gray-500">
          {label}
          {needsReference && <span className="text-rose-600"> *</span>}
        </span>
        <input aria-label={label} aria-required={needsReference} required={needsReference}
          maxLength={100} className={paidField} value={reference} onChange={(e) => onChange({ reference: e.target.value })} />
        {needsReference && !reference.trim() && (
          <span className="block text-[10px] text-rose-600">Required for {PAYMENT_METHOD_LABELS[method as PaymentMethod].toLowerCase()}.</span>
        )}
      </label>
    </>
  );
};
