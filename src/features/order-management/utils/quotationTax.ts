import { HSN_SAC_PATTERN } from '../../finance/utils/gst';
import { GST_RATES, isAllowedGstRate } from '../../products-management/utils/productTax';

/**
 * The optional GST breakup of a procurement quotation (Procurement BE QuotationTax; keep the two in step).
 *
 * Quoted prices are before GST, as on a B2B purchase. The taxable value is unit price × quantity + shipment (freight
 * billed with the goods is taxed at the goods' rate). One rate per item; a dealer in our state charges CGST + SGST at
 * half the rate each, a dealer in another state charges IGST, never both. Amounts may be typed to match the dealer's
 * rounding but must be within ₹1 of the rate; left empty they are worked out. The server stores the full breakup and
 * recalculates it at the same rate whenever quantity, price or shipment change.
 */

export type SupplyType = 'INTRA_STATE' | 'INTER_STATE';

export const SUPPLY_TYPE_LABELS: Record<SupplyType, string> = {
  INTRA_STATE: 'Dealer in our state — CGST + SGST',
  INTER_STATE: 'Dealer in another state — IGST',
};

/** As stored on the order (amounts in rupees). */
export interface TaxBreakup {
  supplyType: SupplyType;
  gstRate: number;
  hsnSac: string | null;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  grandTotal: number;
}

/** Form state: typed text; amounts left '' are worked out from the rate. */
export interface TaxForm {
  enabled: boolean;
  supplyType: SupplyType | '';
  gstRate: string;
  hsnSac: string;
  cgst: string;
  igst: string;
  cess: string;
}

/** Amounts in paise. */
export interface TaxAmounts {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  grandTotal: number;
}

/** What a typed amount may differ from the rate by, in paise. */
export const TAX_TOLERANCE_PAISE = 100;

export const QUOTATION_GST_RATES = GST_RATES;

const num = (value: unknown): number => (value === null || value === undefined || value === '' ? 0 : Number(value));

/** The stored breakup, or null when the order has none (an empty or legacy map). */
export const readTaxBreakup = (raw: Record<string, unknown> | null | undefined): TaxBreakup | null => {
  if (!raw || raw.gstRate === null || raw.gstRate === undefined || raw.gstRate === '') return null;
  const supplyType = raw.supplyType === 'INTER_STATE' ? 'INTER_STATE' : 'INTRA_STATE';
  return {
    supplyType,
    gstRate: num(raw.gstRate),
    hsnSac: typeof raw.hsnSac === 'string' && raw.hsnSac ? raw.hsnSac : null,
    taxableValue: num(raw.taxableValue),
    cgst: num(raw.cgst),
    sgst: num(raw.sgst),
    igst: num(raw.igst),
    cess: num(raw.cess),
    totalTax: num(raw.totalTax),
    grandTotal: num(raw.grandTotal),
  };
};

export const emptyTaxForm = (): TaxForm => ({ enabled: false, supplyType: '', gstRate: '', hsnSac: '', cgst: '', igst: '', cess: '' });

/** The form for an order's stored breakup. Amounts start empty, so they follow the rate when the price changes. */
export const taxFormFrom = (raw: Record<string, unknown> | null | undefined): TaxForm => {
  const breakup = readTaxBreakup(raw);
  if (!breakup) return emptyTaxForm();
  return {
    enabled: true,
    supplyType: breakup.supplyType,
    gstRate: String(breakup.gstRate),
    hsnSac: breakup.hsnSac ?? '',
    cgst: '',
    igst: '',
    cess: breakup.cess ? String(breakup.cess) : '',
  };
};

const toPaise = (text: string): number | null => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
};

/** a / b rounded half up, for a ≥ 0 and b > 0 (BigDecimal HALF_UP on the backend). */
const divideHalfUp = (a: number, b: number): number => Math.floor((2 * a + b) / (2 * b));

/** GST at the form's rate on a taxable value (paise); typed amounts replace the calculated ones. Null while incomplete. */
export const calculateTax = (taxablePaise: number | null, form: TaxForm): TaxAmounts | null => {
  if (!form.enabled || taxablePaise === null || !form.supplyType || form.gstRate === '') return null;
  const milli = Math.round(Number(form.gstRate) * 1000);
  const intra = form.supplyType === 'INTRA_STATE';
  const typedCgst = form.cgst.trim() ? toPaise(form.cgst) : null;
  const typedIgst = form.igst.trim() ? toPaise(form.igst) : null;
  const cess = toPaise(form.cess);
  if (cess === null) return null;
  const cgst = intra ? typedCgst ?? divideHalfUp(taxablePaise * milli, 200000) : 0;
  const igst = intra ? 0 : typedIgst ?? divideHalfUp(taxablePaise * milli, 100000);
  const totalTax = 2 * cgst + igst + cess;
  return { taxable: taxablePaise, cgst, sgst: cgst, igst, cess, totalTax, grandTotal: taxablePaise + totalTax };
};

/** Errors keyed like the backend's fields (taxBreakup.gstRate, …). Empty when the breakup can be sent. */
export const validateTaxForm = (form: TaxForm, taxablePaise: number | null): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!form.enabled) return errors;
  if (!form.supplyType) errors['taxBreakup.supplyType'] = 'Choose CGST + SGST or IGST.';
  if (form.gstRate === '') errors['taxBreakup.gstRate'] = 'Choose the GST rate.';
  else if (!isAllowedGstRate(Number(form.gstRate))) errors['taxBreakup.gstRate'] = 'Choose one of the GST rates in force.';
  const hsn = form.hsnSac.trim();
  if (hsn && !HSN_SAC_PATTERN.test(hsn)) errors['taxBreakup.hsnSac'] = 'HSN/SAC must be 4, 6 or 8 digits.';
  if (toPaise(form.cess) === null) errors['taxBreakup.cess'] = 'Enter cess in rupees with at most 2 decimals.';

  if (taxablePaise !== null && form.supplyType && form.gstRate !== '' && isAllowedGstRate(Number(form.gstRate))) {
    const calculated = calculateTax(taxablePaise, { ...form, cgst: '', igst: '', cess: '' });
    const key = form.supplyType === 'INTRA_STATE' ? 'cgst' : 'igst';
    const typed = form[key].trim();
    if (typed && calculated) {
      const paise = toPaise(typed);
      const expected = calculated[key];
      if (paise === null) errors[`taxBreakup.${key}`] = 'Enter an amount with at most 2 decimals.';
      else if (Math.abs(paise - expected) > TAX_TOLERANCE_PAISE) {
        errors[`taxBreakup.${key}`] = `At ${form.gstRate}% this is ₹${(expected / 100).toFixed(2)}; leave it empty or stay within ₹1.`;
      }
    }
  }
  return errors;
};

/** The request body part: {} when no breakup (removes one), otherwise the rate and anything typed. */
export const taxPayload = (form: TaxForm): Record<string, unknown> => {
  if (!form.enabled) return {};
  const payload: Record<string, unknown> = { supplyType: form.supplyType, gstRate: Number(form.gstRate) };
  if (form.hsnSac.trim()) payload.hsnSac = form.hsnSac.trim();
  if (form.cess.trim()) payload.cess = Number(form.cess);
  if (form.supplyType === 'INTRA_STATE' && form.cgst.trim()) {
    payload.cgst = Number(form.cgst);
    payload.sgst = Number(form.cgst);
  }
  if (form.supplyType === 'INTER_STATE' && form.igst.trim()) payload.igst = Number(form.igst);
  return payload;
};

/** Whether the form would store different GST terms than the order has (for change requests). */
export const taxFormChanged = (form: TaxForm, raw: Record<string, unknown> | null | undefined): boolean => {
  const current = taxFormFrom(raw);
  if (form.enabled !== current.enabled) return true;
  if (!form.enabled) return false;
  return (
    form.supplyType !== current.supplyType ||
    Number(form.gstRate) !== Number(current.gstRate) ||
    form.hsnSac.trim() !== current.hsnSac ||
    Number(form.cess || 0) !== Number(current.cess || 0) ||
    !!form.cgst.trim() ||
    !!form.igst.trim()
  );
};

/** "GST 18% · CGST + SGST · HSN 7408", for lists and diffs. */
export const describeTax = (raw: Record<string, unknown> | null | undefined): string => {
  const breakup = readTaxBreakup(raw);
  if (!breakup) return 'No GST breakup';
  const kind = breakup.supplyType === 'INTRA_STATE' ? 'CGST + SGST' : 'IGST';
  return `GST ${breakup.gstRate}% · ${kind}${breakup.hsnSac ? ` · HSN ${breakup.hsnSac}` : ''}`;
};
