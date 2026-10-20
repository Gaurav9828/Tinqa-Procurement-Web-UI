import React from 'react';
import { GST_RATES, toGstFields, type ProductTaxForm } from '../utils/productTax';
import { ProductTaxBreakdown } from './ProductTaxBreakdown';

interface ProductTaxSectionProps {
  value: ProductTaxForm;
  onChange: (next: ProductTaxForm) => void;
  price: number | string;
  discountPercentage: number | string | null | undefined;
  /** From validateTaxForm (hsnSac, gstRate). */
  errors: Record<string, string>;
  disabled?: boolean;
}

const inputClass =
  'w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white disabled:opacity-50 disabled:cursor-not-allowed';
const borderClass = (error?: string) => (error ? 'border-rose-500' : 'border-black/10 dark:border-white/10');

/**
 * GST of a product: its HSN/SAC and one GST rate, both required. The price is what the customer pays; the
 * order's delivery state decides whether the rate is charged as CGST + SGST or IGST.
 */
export const ProductTaxSection: React.FC<ProductTaxSectionProps> = ({ value, onChange, price, discountPercentage, errors, disabled = false }) => (
  <fieldset className="space-y-3 pt-2 border-t border-black/10 dark:border-white/10" aria-label="GST" disabled={disabled}>
    <div>
      <legend className="block font-medium text-gray-700 dark:text-gray-300">GST (included in the price)</legend>
      <p className="text-[11px] text-gray-500 mt-0.5">
        Enter the price the customer pays. As GST law requires, an order delivered in our state is charged CGST + SGST
        (half the rate each) and one delivered to another state IGST (the full rate) — the invoice adds up to exactly the price.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label htmlFor="product-gst-rate" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">GST rate *</label>
        <select
          id="product-gst-rate"
          value={value.gstRate}
          onChange={(e) => onChange({ ...value, gstRate: e.target.value })}
          aria-invalid={!!errors.gstRate}
          className={`${inputClass} ${borderClass(errors.gstRate)}`}
        >
          <option value="">Choose the rate…</option>
          {GST_RATES.map((rate) => (
            <option key={rate.value} value={String(rate.value)}>{rate.label}</option>
          ))}
        </select>
        {errors.gstRate && <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">{errors.gstRate}</p>}
      </div>
      <div>
        <label htmlFor="product-hsn-sac" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">HSN / SAC code *</label>
        <input
          id="product-hsn-sac"
          type="text"
          inputMode="numeric"
          maxLength={8}
          value={value.hsnSac}
          onChange={(e) => onChange({ ...value, hsnSac: e.target.value.replace(/\D/g, '') })}
          placeholder="e.g. 9405"
          aria-invalid={!!errors.hsnSac}
          className={`${inputClass} ${borderClass(errors.hsnSac)}`}
        />
        {errors.hsnSac ? (
          <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">{errors.hsnSac}</p>
        ) : (
          <p className="mt-1 text-[10px] text-gray-400">Printed on every invoice. 4, 6 or 8 digits.</p>
        )}
      </div>
    </div>

    <ProductTaxBreakdown price={price} discountPercentage={discountPercentage} gst={toGstFields(value)} />
  </fieldset>
);
