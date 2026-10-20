import { HSN_SAC_PATTERN } from '../../finance/utils/gst';
import type { ProductGstFields } from '../types/product.types';

/**
 * GST on a product, as the law applies it:
 *  - The price the admin enters is what the customer pays (GST included).
 *  - A product has one GST rate. How it is charged depends on each order's place of supply (IGST Act s.10):
 *    delivered in our state → CGST + SGST, each at half the rate; delivered to another state → IGST at the full rate.
 *  - Delivery charged with the goods is taxed at the goods' rate (composite supply, CGST Act s.8).
 *
 * Ecommerce BE (InclusiveGst) splits every order line the same way for the invoice:
 *   base     = amount × 100 / (100 + rate)                  (rounded to paise)
 *   in state : CGST = SGST = base × (rate / 2) / 100        (rounded to paise, half up)
 *   inter    : IGST = base × rate / 100
 *   taxable  = amount − tax                                 (so the parts always add up to the amount exactly)
 * Keep the two in step.
 */

export type SupplyType = 'INTRA_STATE' | 'INTER_STATE';

/**
 * Rates in force since 22 Sep 2025 (nil, 5, 18, 40) plus the special rates. Same list as Ecommerce BE GstRates;
 * change both when the law changes.
 */
export const GST_RATES: { value: number; label: string }[] = [
  { value: 0, label: '0% — nil rated / exempt' },
  { value: 0.25, label: '0.25% — precious and semi-precious stones' },
  { value: 1.5, label: '1.5% — cut and polished diamonds' },
  { value: 3, label: '3% — gold, silver, jewellery' },
  { value: 5, label: '5% — merit rate' },
  { value: 18, label: '18% — standard rate' },
  { value: 40, label: '40% — luxury and sin goods' },
];

export const isAllowedGstRate = (rate: number | null | undefined): boolean =>
  rate !== null && rate !== undefined && GST_RATES.some((r) => r.value === Number(rate));

/** Form state: typed text until saved; '' = not chosen yet. */
export interface ProductTaxForm {
  hsnSac: string;
  gstRate: string;
}

export const emptyTaxForm = (): ProductTaxForm => ({ hsnSac: '', gstRate: '' });

export const toTaxForm = (product: Partial<ProductGstFields> | null | undefined): ProductTaxForm => ({
  hsnSac: product?.hsnSac ?? '',
  gstRate: product?.gstRate === null || product?.gstRate === undefined ? '' : String(Number(product.gstRate)),
});

/** Field errors keyed like the backend's (hsnSac, gstRate). Empty when the form can be saved. */
export const validateTaxForm = (form: ProductTaxForm): Record<string, string> => {
  const errors: Record<string, string> = {};
  const hsn = form.hsnSac.trim();
  if (!hsn) errors.hsnSac = 'HSN/SAC is required on GST invoices.';
  else if (!HSN_SAC_PATTERN.test(hsn)) errors.hsnSac = 'HSN/SAC must be 4, 6 or 8 digits.';
  if (form.gstRate === '') errors.gstRate = 'Choose the GST rate.';
  else if (!isAllowedGstRate(Number(form.gstRate))) errors.gstRate = 'Choose one of the GST rates in force.';
  return errors;
};

export const toGstFields = (form: ProductTaxForm): ProductGstFields => ({
  hsnSac: form.hsnSac.trim() || null,
  gstRate: form.gstRate === '' ? null : Number(form.gstRate),
});

export const hasGst = (fields: Partial<ProductGstFields> | null | undefined): boolean =>
  fields?.gstRate !== null && fields?.gstRate !== undefined;

// ---- Money (integer paise, so the split matches the backend's BigDecimal to the paisa) ----

/** a / b rounded half up, for a ≥ 0 and b > 0. */
const divideHalfUp = (a: number, b: number): number => Math.floor((2 * a + b) / (2 * b));

export const toPaise = (rupees: number | string | null | undefined): number => {
  const n = Number(rupees);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

/** What the customer pays per unit: the price less the discount (Ecommerce BE OrderPricing.unitPrice). */
export const sellingPricePaise = (price: number | string | null | undefined, discountPercentage: number | string | null | undefined): number => {
  const pricePaise = toPaise(price);
  const discount = Number(discountPercentage) || 0;
  if (discount <= 0 || discount >= 100) return pricePaise;
  // Rounded as a whole (not price − rounded discount), like the backend
  return divideHalfUp(pricePaise * (10000 - Math.round(discount * 100)), 10000);
};

export interface GstSplit {
  /** Amounts in paise; the taxes that do not apply are null. Rates in percent. */
  taxable: number;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  cgstRate: number | null;
  igstRate: number | null;
  total: number;
}

/** Splits a GST-inclusive amount into taxable value + tax that add up to it exactly. */
export const splitInclusive = (amountPaise: number, rate: number, supplyType: SupplyType): GstSplit => {
  // Rate in thousandths of a percent, so half of 0.25 % (0.125 %) stays a whole number
  const milli = Math.round(rate * 1000);
  const base = divideHalfUp(amountPaise * 100000, 100000 + milli);
  if (supplyType === 'INTRA_STATE') {
    const half = divideHalfUp(base * (milli / 2), 100000);
    return { taxable: amountPaise - 2 * half, cgst: half, sgst: half, igst: null, cgstRate: rate / 2, igstRate: null, total: amountPaise };
  }
  const igst = divideHalfUp(base * milli, 100000);
  return { taxable: amountPaise - igst, cgst: null, sgst: null, igst, cgstRate: null, igstRate: rate, total: amountPaise };
};

/** "GST 18% · HSN/SAC 9405", "GST not set". */
export const describeGst = (fields: Partial<ProductGstFields> | null | undefined): string => {
  const hsn = fields?.hsnSac ? ` · HSN/SAC ${fields.hsnSac}` : '';
  return hasGst(fields) ? `GST ${Number(fields?.gstRate)}%${hsn}` : `GST not set${hsn}`;
};

export const gstChanged = (before: Partial<ProductGstFields> | null | undefined, after: Partial<ProductGstFields> | null | undefined): boolean =>
  describeGst(before) !== describeGst(after);
