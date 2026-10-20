import type { TaxTreatment, VoucherDocumentKind } from '../types/finance.types';

/** Same format the backend checks (CompanyProfileValidator.GSTIN). */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const HSN_SAC_PATTERN = /^[0-9]{4}([0-9]{2}){0,2}$/;

/** '' means a bill with mixed rates: the GST amounts are typed in, not calculated. */
export const GST_RATES = [
  { value: '', label: 'Mixed rates — enter amounts' },
  { value: '0', label: '0% (nil / exempt)' },
  { value: '0.25', label: '0.25%' },
  { value: '3', label: '3%' },
  { value: '5', label: '5%' },
  { value: '12', label: '12% (bills before 22 Sep 2025)' },
  { value: '18', label: '18%' },
  { value: '28', label: '28% (bills before 22 Sep 2025)' },
  { value: '40', label: '40%' },
] as const;

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  NONE: 'No GST bill',
  INTRA_STATE: 'Same state — CGST + SGST',
  INTER_STATE: 'Other state — IGST',
};

export const DOCUMENT_KIND_LABELS: Record<VoucherDocumentKind, string> = {
  INVOICE: 'Tax invoice / bill',
  RECEIPT: 'Receipt',
  PAYMENT_PROOF: 'Payment proof',
  OTHER: 'Other',
};

/** GST state codes (first two digits of a GSTIN). */
const STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
  '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana',
  '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other territory',
};

export const stateOfGstin = (gstin: string | null | undefined): { code: string; name: string } | null => {
  if (!gstin || !GSTIN_PATTERN.test(gstin)) return null;
  const code = gstin.slice(0, 2);
  return { code, name: STATES[code] ?? `State ${code}` };
};

/** Same state → CGST + SGST, different state → IGST; null when either GSTIN is missing or invalid. */
export const suggestTreatment = (supplierGstin: string, companyGstin: string | null): TaxTreatment | null => {
  const supplier = stateOfGstin(supplierGstin);
  const company = stateOfGstin(companyGstin);
  if (!supplier || !company) return null;
  return supplier.code === company.code ? 'INTRA_STATE' : 'INTER_STATE';
};

/** Rupees typed by the user → paise; '' → 0; null when not a number with at most 2 decimals. */
export const toPaise = (value: string, { signed = false } = {}): number | null => {
  const text = value.trim();
  if (!text) return 0;
  if (!(signed ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/).test(text)) return null;
  return Math.round(Number(text) * 100);
};

/** Paise → the rupee text an input shows ('' for zero when blankZero). */
export const paiseToInput = (paise: number | null | undefined, blankZero = false): string => {
  if (paise === null || paise === undefined || (blankZero && paise === 0)) return '';
  return (paise / 100).toFixed(2).replace(/\.00$/, '');
};

/**
 * GST on the taxable value at a rate, in paise. Inside the state it is two equal halves, each rounded, so CGST and
 * SGST always match (the backend accepts up to ₹1 of rounding difference from the exact rate).
 */
export const gstAtRate = (taxablePaise: number, ratePercent: number, treatment: TaxTreatment) => {
  if (treatment === 'INTRA_STATE') {
    const half = Math.round((taxablePaise * ratePercent) / 200);
    return { cgst: half, sgst: half, igst: 0 };
  }
  if (treatment === 'INTER_STATE') return { cgst: 0, sgst: 0, igst: Math.round((taxablePaise * ratePercent) / 100) };
  return { cgst: 0, sgst: 0, igst: 0 };
};

export interface BillParts {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  other: number;
  roundOff: number;
}

export const billTotal = (parts: BillParts) =>
  parts.taxable + parts.cgst + parts.sgst + parts.igst + parts.cess + parts.other + parts.roundOff;

/** The bill number reduced to letters, digits and dashes, as the backend puts it in stored file names. */
export const billPart = (invoiceNumber: string | null | undefined): string =>
  (invoiceNumber ?? '')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
    .toUpperCase();

/**
 * The name the backend will store a document under: {voucher}_{KIND}_{bill number}_{date}_{nn}.{ext}. A preview only;
 * the server decides (and picks the next free number).
 */
export const storedNamePreview = (
  voucherNumber: string | null,
  kind: VoucherDocumentKind,
  invoiceNumber: string,
  expenseDate: string,
  sequence: number,
  extension: string
) =>
  [voucherNumber ?? 'EXP-…', kind, billPart(invoiceNumber), expenseDate || '…', String(sequence).padStart(2, '0')]
    .filter(Boolean)
    .join('_') + `.${extension}`;

/** The GST part of the voucher form; amounts are the rupee text the user typed. */
export interface GstForm {
  taxTreatment: TaxTreatment;
  supplierGstin: string;
  hsnSac: string;
  taxable: string;
  gstRate: string;
  cgst: string;
  sgst: string;
  igst: string;
  cess: string;
  otherCharges: string;
  roundOff: string;
  /** Claim the GST as input tax credit; false for blocked credit (CGST Act s.17(5)). */
  itcClaimable: boolean;
}

/** The bill's parts in paise, or null while any of them is not a valid amount. */
export const gstParts = (form: GstForm): BillParts | null => {
  const parts = {
    taxable: toPaise(form.taxable),
    cgst: form.taxTreatment === 'INTRA_STATE' ? toPaise(form.cgst) : 0,
    sgst: form.taxTreatment === 'INTRA_STATE' ? toPaise(form.cgst) : 0, // always equal to CGST
    igst: form.taxTreatment === 'INTER_STATE' ? toPaise(form.igst) : 0,
    cess: toPaise(form.cess),
    other: toPaise(form.otherCharges),
    roundOff: toPaise(form.roundOff, { signed: true }),
  };
  return Object.values(parts).some((value) => value === null) ? null : (parts as BillParts);
};

const fixed = (paise: number) => (paise / 100).toFixed(2);

/** Taxable value, rate or supply type changed: recalculate the GST, unless the bill mixes rates. */
export const withCalculatedGst = (form: GstForm): GstForm => {
  const taxable = toPaise(form.taxable);
  if (form.gstRate === '' || taxable === null || form.taxTreatment === 'NONE') return form;
  const { cgst, sgst, igst } = gstAtRate(taxable, Number(form.gstRate), form.taxTreatment);
  return { ...form, cgst: fixed(cgst), sgst: fixed(sgst), igst: fixed(igst) };
};
