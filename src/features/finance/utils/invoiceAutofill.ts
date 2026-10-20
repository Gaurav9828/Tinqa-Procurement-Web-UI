import type { InvoiceAnalysis } from '../types/finance.types';
import { paiseToInput, toPaise, type GstForm } from './gst';

/** The voucher form fields an invoice can fill. */
export interface AutofillTarget extends Omit<GstForm, 'itcClaimable'> {
  amount: string;
  invoiceNumber: string;
  expenseDate: string;
}
export type AutofillField = keyof AutofillTarget;

export const AUTOFILL_LABELS: Record<AutofillField, string> = {
  amount: 'Amount',
  invoiceNumber: 'Invoice number',
  expenseDate: 'Date',
  taxTreatment: 'GST type',
  supplierGstin: 'Supplier GSTIN',
  hsnSac: 'HSN / SAC',
  taxable: 'Taxable value',
  gstRate: 'GST rate',
  cgst: 'CGST',
  sgst: 'SGST',
  igst: 'IGST',
  cess: 'Cess',
  otherCharges: 'Charges without GST',
  roundOff: 'Round off',
};

export interface AutofillConflict {
  field: AutofillField;
  label: string;
  current: string;
  fromBill: string;
}

export interface AutofillPlan {
  patch: Partial<AutofillTarget>;
  filled: AutofillField[];
  conflicts: AutofillConflict[];
}

const AMOUNT_FIELDS = new Set<AutofillField>(['amount', 'taxable', 'cgst', 'sgst', 'igst', 'cess', 'otherCharges', 'roundOff']);
const rupeeText = (rupees: number) => paiseToInput(Math.round(rupees * 100));
const paiseOf = (rupees: number | null) => (rupees === null ? 0 : Math.round(rupees * 100));

/** What the bill says, as the text each form field would hold. */
export const billValues = (fields: InvoiceAnalysis['fields'], today: string): Partial<AutofillTarget> => {
  const values: Partial<AutofillTarget> = {};
  if (fields.invoiceNumber) values.invoiceNumber = fields.invoiceNumber;
  if (fields.invoiceDate && fields.invoiceDate <= today) values.expenseDate = fields.invoiceDate;
  if (!fields.taxTreatment) {
    if (fields.total !== null) values.amount = rupeeText(fields.total);
    return values;
  }
  values.taxTreatment = fields.taxTreatment;
  if (fields.supplierGstin) values.supplierGstin = fields.supplierGstin;
  if (fields.hsnSac) values.hsnSac = fields.hsnSac;
  if (fields.taxableAmount !== null) values.taxable = rupeeText(fields.taxableAmount);
  if (fields.mixedRates) values.gstRate = '';
  else if (fields.gstRate !== null) values.gstRate = String(fields.gstRate);
  if (fields.taxTreatment === 'INTRA_STATE' && fields.cgst !== null) values.cgst = values.sgst = rupeeText(fields.cgst);
  if (fields.taxTreatment === 'INTER_STATE' && fields.igst !== null) values.igst = rupeeText(fields.igst);
  if (fields.cess !== null) values.cess = rupeeText(fields.cess);
  if (fields.roundOff !== null) values.roundOff = rupeeText(fields.roundOff);
  // Whatever the total holds beyond taxable value + GST is a charge without GST, so the voucher equals the bill
  if (fields.total !== null && fields.taxableAmount !== null) {
    const rest = paiseOf(fields.total) - paiseOf(fields.taxableAmount) - paiseOf(fields.cgst) - paiseOf(fields.sgst)
      - paiseOf(fields.igst) - paiseOf(fields.cess) - paiseOf(fields.roundOff);
    if (rest > 0) values.otherCharges = paiseToInput(rest);
  }
  return values;
};

const same = (field: AutofillField, a: string, b: string) =>
  AMOUNT_FIELDS.has(field) ? toPaise(a, { signed: true }) === toPaise(b, { signed: true }) : a.trim().toUpperCase() === b.trim().toUpperCase();

/**
 * Fills every field the user hasn't typed in themselves with what the bill says; a field they did type in is left alone
 * and listed as a conflict when the bill disagrees, so they choose. SGST always follows CGST.
 */
export const planAutofill = (
  form: AutofillTarget,
  touched: ReadonlySet<AutofillField>,
  fields: InvoiceAnalysis['fields'],
  today: string
): AutofillPlan => {
  const plan: AutofillPlan = { patch: {}, filled: [], conflicts: [] };
  for (const [field, value] of Object.entries(billValues(fields, today)) as [AutofillField, string][]) {
    if (field === 'sgst' || same(field, form[field], value)) continue;
    if (!touched.has(field)) {
      plan.patch[field] = value as never;
      plan.filled.push(field);
      if (field === 'cgst') plan.patch.sgst = value;
    } else {
      plan.conflicts.push({ field, label: AUTOFILL_LABELS[field], current: form[field], fromBill: value });
    }
  }
  return plan;
};
