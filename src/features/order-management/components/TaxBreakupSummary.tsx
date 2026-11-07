import React from 'react';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { describeTax, readTaxBreakup } from '../utils/quotationTax';

interface Props {
  taxBreakup: Record<string, unknown> | null | undefined;
  /** The order total before GST, shown as the taxable value when there is no breakup. */
  totalPrice: number;
}

/** The quoted price with its GST, as the supplier's invoice is expected to show it. */
export const TaxBreakupSummary: React.FC<Props> = ({ taxBreakup, totalPrice }) => {
  const breakup = readTaxBreakup(taxBreakup);
  if (!breakup) {
    return (
      <p className="text-[11px] text-gray-500" aria-label="GST breakup">
        No GST breakup quoted — the invoice is expected to total {formatCurrency(totalPrice)}.
      </p>
    );
  }
  const intra = breakup.supplyType === 'INTRA_STATE';
  const row = (label: string, amount: number) => (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right">{formatCurrency(amount)}</dd>
    </>
  );
  return (
    <div className="space-y-1" aria-label="GST breakup">
      <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{describeTax(taxBreakup)}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-[11px] tabular-nums">
        {row('Taxable value', breakup.taxableValue)}
        {intra ? (
          <>
            {row(`CGST @ ${breakup.gstRate / 2}%`, breakup.cgst)}
            {row(`SGST @ ${breakup.gstRate / 2}%`, breakup.sgst)}
          </>
        ) : (
          row(`IGST @ ${breakup.gstRate}%`, breakup.igst)
        )}
        {breakup.cess > 0 && row('Cess', breakup.cess)}
        <dt className="font-semibold text-black dark:text-white">Total incl. GST</dt>
        <dd className="font-semibold text-black dark:text-white text-right">{formatCurrency(breakup.grandTotal)}</dd>
      </dl>
    </div>
  );
};
