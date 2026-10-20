import React from 'react';
import { rupees } from '../../finance/utils/money';
import type { ProductGstFields } from '../types/product.types';
import { hasGst, sellingPricePaise, splitInclusive, toPaise, type SupplyType } from '../utils/productTax';

interface ProductTaxBreakdownProps {
  price: number | string | null | undefined;
  discountPercentage?: number | string | null;
  gst: Partial<ProductGstFields> | null | undefined;
  title?: string;
}

const CASES: { supplyType: SupplyType; label: string; testId: string }[] = [
  { supplyType: 'INTRA_STATE', label: 'Delivered in our state', testId: 'intra' },
  { supplyType: 'INTER_STATE', label: 'Delivered to another state', testId: 'inter' },
];

/**
 * How one unit's price splits on the invoice. The delivery address decides which applies, so both are shown:
 * CGST + SGST (equal halves) in our state, IGST across states. Either way the parts add up to the price.
 */
export const ProductTaxBreakdown: React.FC<ProductTaxBreakdownProps> = ({ price, discountPercentage, gst, title = 'Invoice split per unit' }) => {
  const selling = sellingPricePaise(price, discountPercentage);
  const discounted = selling !== toPaise(price);
  const rate = hasGst(gst) ? Number(gst?.gstRate) : null;

  return (
    <section aria-label={title} className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-gray-700 dark:text-gray-300">{title}</span>
        {gst?.hsnSac && <span className="text-[10px] text-gray-500">HSN/SAC {gst.hsnSac}</span>}
      </div>
      {selling === 0 || rate === null ? (
        <p className="text-gray-500">{rate === null ? 'Choose the GST rate to see how the price splits.' : 'Enter the price to see how it splits.'}</p>
      ) : (
        <>
          <p className="text-gray-500 tabular-nums">
            Customer pays <strong className="text-black dark:text-white">{rupees(selling)}</strong> (GST included)
            {discounted && <> — {rupees(toPaise(price))} less {Number(discountPercentage)}% discount</>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CASES.map(({ supplyType, label, testId }) => {
              const split = splitInclusive(selling, rate, supplyType);
              return (
                <dl key={supplyType} data-testid={`split-${testId}`}
                  className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums rounded-lg bg-white/60 dark:bg-black/20 px-2 py-1.5">
                  <dt className="col-span-2 font-medium text-gray-700 dark:text-gray-300">{label}</dt>
                  <dt className="text-gray-500">Taxable value</dt>
                  <dd className="text-right" data-testid={`${testId}-taxable`}>{rupees(split.taxable)}</dd>
                  {split.igst === null ? (
                    <>
                      <dt className="text-gray-500">CGST @ {split.cgstRate}%</dt>
                      <dd className="text-right" data-testid={`${testId}-cgst`}>{rupees(split.cgst)}</dd>
                      <dt className="text-gray-500">SGST @ {split.cgstRate}%</dt>
                      <dd className="text-right" data-testid={`${testId}-sgst`}>{rupees(split.sgst)}</dd>
                    </>
                  ) : (
                    <>
                      <dt className="text-gray-500">IGST @ {split.igstRate}%</dt>
                      <dd className="text-right" data-testid={`${testId}-igst`}>{rupees(split.igst)}</dd>
                    </>
                  )}
                  <dt className="font-semibold text-black dark:text-white border-t border-black/10 dark:border-white/10 pt-0.5">Total</dt>
                  <dd className="font-semibold text-black dark:text-white text-right border-t border-black/10 dark:border-white/10 pt-0.5" data-testid={`${testId}-total`}>
                    {rupees(split.total)}
                  </dd>
                </dl>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400">The delivery address decides which applies. Delivery charges are taxed at the same rate.</p>
        </>
      )}
    </section>
  );
};
