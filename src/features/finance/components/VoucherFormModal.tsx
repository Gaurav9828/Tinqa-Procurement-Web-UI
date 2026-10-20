import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, FileCheck2, Info, Loader2 } from 'lucide-react';
import { CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { DialogShell } from './DialogShell';
import type { FinanceCategory, InvoiceAnalysis, PnlSection, Voucher, VoucherDocumentKind, VoucherPayload } from '../types/finance.types';
import type { DocumentChanges, StagedDocument, VoucherActionResult } from '../hooks/useVoucherActions';
import { useCompanyGstin } from '../hooks/useCompanyGstin';
import { PAYMENT_MODES, SECTION_ORDER } from '../utils/metrics';
import { isoDate } from '../utils/period';
import { GSTIN_PATTERN, HSN_SAC_PATTERN, billTotal, gstParts, paiseToInput, type GstForm } from '../utils/gst';
import { GstBreakdownFields } from './GstBreakdownFields';
import { VoucherDocumentsField } from './VoucherDocumentsField';
import { AUTOFILL_LABELS, planAutofill, type AutofillConflict, type AutofillField } from '../utils/invoiceAutofill';
import { hasFormChanges } from '../../../utils/formChanges';

interface Props {
  categories: FinanceCategory[];
  /** Editing an existing voucher (only its maker, while it awaits approval). */
  voucher?: Voucher | null;
  isSubmitting: boolean;
  onClose: () => void;
  /** payload is null when only the documents changed. */
  onSubmit: (payload: VoucherPayload | null, documents: DocumentChanges) => Promise<VoucherActionResult>;
}

const gstFormOf = (voucher: Voucher | null | undefined): GstForm => ({
  taxTreatment: voucher?.taxTreatment ?? 'NONE',
  supplierGstin: voucher?.supplierGstin ?? '',
  hsnSac: voucher?.hsnSac ?? '',
  taxable: paiseToInput(voucher?.taxablePaise),
  gstRate: !voucher || voucher.taxTreatment === 'NONE' ? '18' : voucher.gstRate === null ? '' : String(voucher.gstRate),
  cgst: paiseToInput(voucher?.cgstPaise, true),
  sgst: paiseToInput(voucher?.sgstPaise, true),
  igst: paiseToInput(voucher?.igstPaise, true),
  cess: paiseToInput(voucher?.cessPaise, true),
  otherCharges: paiseToInput(voucher?.otherChargesPaise, true),
  roundOff: paiseToInput(voucher?.roundOffPaise, true),
  itcClaimable: voucher?.itcClaimable ?? true,
});

const SECTION_GROUP_LABELS: Record<PnlSection, string> = {
  REVENUE: 'Revenue',
  DIRECT_COSTS: 'Direct costs — making or buying what is sold',
  OPERATING_EXPENSES: 'Operating expenses — running the business',
  DEPRECIATION_AMORTIZATION: 'Non-cash — depreciation & amortization',
  OTHER_INCOME: 'Other income',
  INTEREST: 'Interest',
  TAX: 'Tax',
  NONE: 'Assets, capital & loans (not profit or loss)',
};

const effectOf = (category: FinanceCategory | undefined) => {
  if (!category) return null;
  if (!category.cashImpact) return 'Non-cash: lowers profit (EBIT and below) but does not change the account balance.';
  if (category.section === 'NONE') {
    return category.direction === 'IN'
      ? 'Adds money to the account without counting as profit.'
      : 'Takes money out of the account without counting as a cost in profit & loss.';
  }
  return category.direction === 'IN' ? 'Adds money to the account and to profit.' : 'Takes money out of the account and counts as a cost.';
};

const AUTOFILL_FIELDS = Object.keys(AUTOFILL_LABELS) as AutofillField[];
const BILL_FIELDS: AutofillField[] = ['amount', 'invoiceNumber', 'expenseDate'];

interface Autofill {
  fileName: string;
  filled: AutofillField[];
  conflicts: AutofillConflict[];
}

/**
 * Raise or edit a voucher. Nothing is posted until a different approver approves it. Attaching an invoice reads it and
 * fills in every field the user hasn't typed in themselves; where they have and the bill disagrees, they choose.
 */
export const VoucherFormModal: React.FC<Props> = ({ categories, voucher, isSubmitting, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => ({
    category: voucher?.category ?? '',
    amount: voucher ? String(voucher.amountPaise / 100) : '',
    title: voucher?.title ?? '',
    description: voucher?.description ?? '',
    payee: voucher?.payee ?? '',
    reference: voucher?.reference ?? '',
    invoiceNumber: voucher?.invoiceNumber ?? '',
    paymentMode: voucher?.paymentMode ?? 'BANK_TRANSFER',
    expenseDate: voucher?.expenseDate ?? isoDate(new Date()),
    ...gstFormOf(voucher),
  }));
  // What the form opened with; submit stays disabled until something differs from it.
  const [initialForm] = useState(form);
  const formChanged = hasFormChanges(form, initialForm);
  const [staged, setStaged] = useState<StagedDocument[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const hasChanges = formChanged || staged.length > 0 || removed.length > 0;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const companyGstin = useCompanyGstin();
  // Fields the user typed in (or that were saved before): an invoice never overwrites them
  const [touched, setTouched] = useState<Set<AutofillField>>(() => {
    if (!voucher) return new Set();
    const saved = voucher.taxTreatment === 'NONE' ? BILL_FIELDS : AUTOFILL_FIELDS;
    return new Set(saved.filter((field) => form[field] !== ''));
  });
  const [autofill, setAutofill] = useState<Autofill | null>(null);
  // An invoice is read asynchronously: it must fill the form as it is when the reading finishes
  const latest = useRef({ form, touched });
  useEffect(() => {
    latest.current = { form, touched };
  }, [form, touched]);
  const touch = (fields: string[]) => {
    const relevant = fields.filter((field): field is AutofillField => (AUTOFILL_FIELDS as string[]).includes(field));
    if (relevant.length) setTouched((prev) => new Set([...prev, ...relevant]));
  };
  const isGstBill = form.taxTreatment !== 'NONE';
  const parts = isGstBill ? gstParts(form) : null;

  const choosable = useMemo(() => categories.filter((c) => !c.system), [categories]);
  const selected = choosable.find((c) => c.code === form.category);
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    touch([field]);
  };

  const onInvoiceRead = (analysis: InvoiceAnalysis, fileName: string) => {
    const plan = planAutofill(latest.current.form, latest.current.touched, analysis.fields, isoDate(new Date()));
    setForm((prev) => ({ ...prev, ...plan.patch }));
    setErrors((prev) => {
      const cleared: Record<string, string> = { ...prev, amount: '' };
      plan.filled.forEach((field) => (cleared[field === 'taxable' ? 'taxableAmount' : field] = ''));
      return cleared;
    });
    setAutofill({ fileName, filled: plan.filled, conflicts: plan.conflicts });
  };

  const applyBillValue = (conflict: AutofillConflict) => {
    setForm((prev) => ({ ...prev, [conflict.field]: conflict.fromBill, ...(conflict.field === 'cgst' ? { sgst: conflict.fromBill } : {}) }));
    setAutofill((prev) => prev && {
      ...prev,
      filled: [...prev.filled, conflict.field],
      conflicts: prev.conflicts.filter((other) => other.field !== conflict.field),
    });
  };

  const onGstChange = (next: GstForm, changed: (keyof GstForm)[]) => {
    setForm((prev) => ({ ...prev, ...next }));
    touch(changed);
    setErrors((prev) => {
      const cleared: Record<string, string> = { ...prev, amount: '' };
      changed.forEach((field) => (cleared[field === 'taxable' ? 'taxableAmount' : field] = ''));
      return cleared;
    });
  };

  const validateGst = (next: Record<string, string>) => {
    const gstin = form.supplierGstin.trim();
    if (!gstin) next.supplierGstin = "Enter the supplier's GSTIN from the bill.";
    else if (!GSTIN_PATTERN.test(gstin)) next.supplierGstin = 'GSTIN must be 15 characters in the format 22AAAAA0000A1Z5.';
    if (form.hsnSac.trim() && !HSN_SAC_PATTERN.test(form.hsnSac.trim())) next.hsnSac = 'HSN / SAC must be 4, 6 or 8 digits.';
    if (!form.taxable.trim()) next.taxableAmount = 'Enter the taxable value (the price before GST).';
    if (!parts) next.amount = 'Each amount needs at most 2 decimals; round off can be negative.';
    else if (Math.abs(parts.roundOff) >= 100) next.roundOff = 'Round off must be less than ₹1 either way.';
    else if (billTotal(parts) <= 0) next.amount = 'The bill total must be greater than zero.';
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.category) next.category = 'Choose what this is for.';
    const amount = Number(form.amount);
    if (isGstBill) validateGst(next);
    else if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) next.amount = 'Enter an amount greater than zero.';
    else if (!/^\d+(\.\d{1,2})?$/.test(form.amount.trim())) next.amount = 'Use at most 2 decimals (paise).';
    if (!form.title.trim()) next.title = 'A short title is required.';
    if (!form.expenseDate) next.expenseDate = 'Date is required.';
    else if (form.expenseDate > isoDate(new Date())) next.expenseDate = "The date can't be in the future.";
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !hasChanges) return;
    const invalid = validate();
    if (Object.keys(invalid).length) {
      setErrors(invalid);
      return;
    }
    const rupeesOf = (paise: number) => paise / 100;
    const gst: Partial<VoucherPayload> = parts
      ? {
          taxTreatment: form.taxTreatment,
          supplierGstin: form.supplierGstin.trim(),
          hsnSac: form.hsnSac.trim() || null,
          taxableAmount: rupeesOf(parts.taxable),
          gstRate: form.gstRate === '' ? null : Number(form.gstRate),
          cgst: rupeesOf(parts.cgst),
          sgst: rupeesOf(parts.sgst),
          igst: rupeesOf(parts.igst),
          cess: rupeesOf(parts.cess),
          otherCharges: rupeesOf(parts.other),
          roundOff: rupeesOf(parts.roundOff),
          itcClaimable: form.itcClaimable,
        }
      : { taxTreatment: 'NONE' };
    const payload: VoucherPayload | null = !voucher || formChanged
      ? {
          category: form.category,
          amount: parts ? rupeesOf(billTotal(parts)) : Number(form.amount),
          title: form.title.trim(),
          description: form.description.trim() || null,
          payee: form.payee.trim() || null,
          reference: form.reference.trim() || null,
          invoiceNumber: form.invoiceNumber.trim() || null,
          paymentMode: form.paymentMode || null,
          expenseDate: form.expenseDate,
          ...gst,
        }
      : null;
    const result = await onSubmit(payload, { add: staged, remove: removed });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  };

  const effect = effectOf(selected);

  return (
    <DialogShell
      wide
      title={voucher ? `Edit ${voucher.voucherNumber}` : 'New expense or voucher'}
      subtitle="Raised for approval. A different approver must approve it before any money is posted to the company account."
      disabled={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Voucher">
        <div>
          <label className="block">
            <span className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 px-1">
              What is it for? <span className="text-rose-500">*</span>
            </span>
            <select
              aria-label="Category"
              value={form.category}
              onChange={set('category')}
              disabled={isSubmitting}
              className="w-full px-3.5 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-sm text-black dark:text-white cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-[#1c1c1e]">Choose a category…</option>
              {SECTION_ORDER.map((section) => {
                const options = choosable.filter((c) => c.section === section);
                return options.length ? (
                  <optgroup key={section} label={SECTION_GROUP_LABELS[section]} className="bg-white dark:bg-[#1c1c1e]">
                    {options.map((c) => (
                      <option key={c.code} value={c.code} className="bg-white dark:bg-[#1c1c1e]">
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </label>
          {errors.category && <p className="text-[11px] text-rose-500 mt-1 px-1">{errors.category}</p>}
          {effect && selected && (
            <p className="mt-2 flex items-start gap-1.5 px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-[11px] text-gray-600 dark:text-gray-300">
              {selected.direction === 'IN' ? (
                <ArrowDownLeft className="w-3.5 h-3.5 mt-px shrink-0" aria-label="Money in" />
              ) : selected.cashImpact ? (
                <ArrowUpRight className="w-3.5 h-3.5 mt-px shrink-0" aria-label="Money out" />
              ) : (
                <Info className="w-3.5 h-3.5 mt-px shrink-0" aria-label="Non-cash" />
              )}
              <span>{effect}</span>
            </p>
          )}
        </div>

        <VoucherDocumentsField
          voucherId={voucher?.id ?? null}
          voucherNumber={voucher?.voucherNumber ?? null}
          invoiceNumber={form.invoiceNumber}
          expenseDate={form.expenseDate}
          attached={voucher?.documents ?? []}
          removed={removed}
          staged={staged}
          disabled={isSubmitting}
          onStage={(added) => setStaged((prev) => [...prev, ...added])}
          onUnstage={(key) => setStaged((prev) => prev.filter((doc) => doc.key !== key))}
          onKindChange={(key, kind: VoucherDocumentKind) => setStaged((prev) => prev.map((doc) => (doc.key === key ? { ...doc, kind } : doc)))}
          onToggleRemove={(id) => setRemoved((prev) => (prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id]))}
          onInvoiceRead={onInvoiceRead}
        />
        {autofill && (
          <div role="status" aria-label="Filled from the invoice" className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] px-3 py-2 text-[11px] space-y-1.5">
            <p className="flex items-start gap-1.5 text-gray-700 dark:text-gray-200">
              <FileCheck2 className="w-3.5 h-3.5 mt-px shrink-0 text-emerald-600" aria-hidden />
              <span>
                {autofill.filled.length
                  ? <>Filled from {autofill.fileName}: {autofill.filled.map((field) => AUTOFILL_LABELS[field]).join(', ')}. Check them; you can change anything.</>
                  : <>{autofill.fileName} was read{autofill.conflicts.length ? '' : ' and matches what is entered'}.</>}
              </span>
            </p>
            {autofill.conflicts.map((conflict) => (
              <div key={conflict.field} className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-5 text-amber-700 dark:text-amber-300">
                <span>
                  {conflict.label}: the bill says <strong>{conflict.fromBill || '—'}</strong>, you entered <strong>{conflict.current || '—'}</strong>.
                </span>
                <button type="button" onClick={() => applyBillValue(conflict)}
                  className="px-2 py-0.5 rounded-md bg-amber-500/15 font-semibold cursor-pointer">Use bill value</button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isGstBill ? (
            <CommonInput label="Amount (₹) — bill total" aria-label="Amount" readOnly value={parts ? (billTotal(parts) / 100).toFixed(2) : ''}
              error={errors.amount} title="Taxable value + GST + cess + other charges + round off" />
          ) : (
            <CommonInput label="Amount (₹)" aria-label="Amount" required inputMode="decimal" value={form.amount} onChange={set('amount')}
              error={errors.amount} disabled={isSubmitting} placeholder="0.00" />
          )}
          <CommonInput label="Date spent / received" aria-label="Date" required type="date" max={isoDate(new Date())} value={form.expenseDate}
            onChange={set('expenseDate')} error={errors.expenseDate} disabled={isSubmitting} />
        </div>
        <CommonInput label="Title" aria-label="Title" required maxLength={200} value={form.title} onChange={set('title')} error={errors.title}
          disabled={isSubmitting} placeholder="e.g. Copper wire for batch 12, office AC repair" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CommonInput label="Paid to / received from" aria-label="Payee" maxLength={200} value={form.payee} onChange={set('payee')}
            error={errors.payee} disabled={isSubmitting} />
          <CommonSelect label="Payment mode" aria-label="Payment mode" value={form.paymentMode} onChange={set('paymentMode')} error={errors.paymentMode}
            disabled={isSubmitting} options={PAYMENT_MODES.map((m) => ({ value: m.value, label: m.label }))} />
          <CommonInput label="Bill / invoice number" aria-label="Invoice number" maxLength={100} value={form.invoiceNumber} onChange={set('invoiceNumber')}
            error={errors.invoiceNumber} disabled={isSubmitting} />
          <CommonInput label="Reference (order number…)" aria-label="Reference" maxLength={100} value={form.reference} onChange={set('reference')}
            error={errors.reference} disabled={isSubmitting} />
        </div>
        <GstBreakdownFields value={form} companyGstin={companyGstin} errors={errors} disabled={isSubmitting} onChange={onGstChange} />
        <CommonTextArea label="Details" aria-label="Details" rows={3} maxLength={1000} value={form.description} onChange={set('description')}
          error={errors.description} disabled={isSubmitting} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white font-semibold cursor-pointer disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || !hasChanges} title={!hasChanges ? 'No changes to save.' : undefined}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold cursor-pointer disabled:opacity-60">
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {voucher ? 'Save changes' : 'Raise for approval'}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
