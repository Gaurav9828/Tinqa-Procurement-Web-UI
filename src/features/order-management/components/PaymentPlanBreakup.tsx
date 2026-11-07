import React from 'react';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { readTaxBreakup } from '../utils/quotationTax';
import { PAYMENT_METHOD_LABELS, planBreakup, type PaymentPlanFields } from '../utils/paymentPlan';

interface Props {
  plan: PaymentPlanFields | null | undefined;
  /** The order total before GST; the breakup's grand total is used when GST is quoted */
  totalPrice: number;
  taxBreakup: Record<string, unknown> | null | undefined;
}

/**
 * How the supplier asked to be paid, as they entered it: each part in % and in rupees on the quoted total (GST
 * included), and the payment method they expect.
 */
export const PaymentPlanBreakup: React.FC<Props> = ({ plan, totalPrice, taxBreakup }) => {
  const grandTotal = readTaxBreakup(taxBreakup)?.grandTotal ?? totalPrice;
  const parts = planBreakup(plan, grandTotal);
  if (parts.length === 0) {
    return <p className="text-[11px] text-gray-500" data-testid="plan-breakup">No payment plan: paid after the delivered units are tested.</p>;
  }
  return (
    <div className="space-y-1" data-testid="plan-breakup">
      <table className="w-full text-[11px] tabular-nums" aria-label="Payment plan breakup">
        <thead className="text-gray-400">
          <tr>
            <th className="text-left font-medium">Part</th>
            <th className="text-right font-medium">%</th>
            <th className="text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr key={part.key}>
              <td className="text-gray-600 dark:text-gray-300">{part.label}</td>
              <td className="text-right">{Number(part.percent.toFixed(2))}%</td>
              <td className="text-right font-medium">{formatCurrency(part.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-gray-500">
        Total with GST {formatCurrency(grandTotal)} · Expected method:{' '}
        <span className="font-medium text-black dark:text-white">{plan?.expectedPaymentMethod ? PAYMENT_METHOD_LABELS[plan.expectedPaymentMethod] : 'not given'}</span>
      </p>
    </div>
  );
};
