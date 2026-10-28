import React, { useState } from 'react';
import { BedDouble, Bus, Loader2, Paperclip, Receipt, Utensils } from 'lucide-react';
import { CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { DialogShell } from '../../finance/components/DialogShell';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import type { DemoDetail, DemoExpense, ExpenseKind, ExpensePayload, MealType, TravelMode } from '../types/clientDemo.types';
import { EXPENSE_KINDS, EXPENSE_KIND_LABELS, MEAL_LABELS, PATTERNS, TRAVEL_MODE_LABELS, changeNeedsReason, dayDate, formatDay, inrAmount } from '../utils/clientDemo';
import { billFormOf, invoicePickerLabel, toExpensePayload, validateBill, type BillErrors, type BillForm } from '../utils/billForm';

const KIND_ICONS: Record<ExpenseKind, React.ReactNode> = {
  STAY: <BedDouble className="w-3.5 h-3.5" />,
  FOOD: <Utensils className="w-3.5 h-3.5" />,
  TRAVEL: <Bus className="w-3.5 h-3.5" />,
  OTHER: <Receipt className="w-3.5 h-3.5" />,
};

const FILE_TYPES = '.pdf,.png,.jpg,.jpeg,.webp';

/**
 * Adds or changes one bill of a demo: a night's stay (hotel, its location and GST details), a meal (which one, the
 * restaurant), a leg of travel (from, to, how, the ticket) or another cost (what and why). The invoice or ticket can be
 * attached now or later. Once the quotation is approved, changing a bill asks for the reason.
 */
export const BillDialog: React.FC<{
  demo: DemoDetail;
  expense: DemoExpense | null;
  initialKind?: ExpenseKind;
  initialDay?: number | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (payload: ExpensePayload, file: File | null) => Promise<boolean>;
}> = ({ demo, expense, initialKind = 'STAY', initialDay = null, isSubmitting, onClose, onSave }) => {
  const [form, setForm] = useState<BillForm>(() => billFormOf(expense, initialKind, initialDay));
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<BillErrors>({});
  const askReason = expense !== null && changeNeedsReason(demo.status);
  const { kind } = form;

  const set = <K extends keyof BillForm>(key: K, value: BillForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };
  const textField = (key: keyof BillForm, label: string, required = false, extra: Partial<React.ComponentProps<typeof CommonInput>> = {}) => (
    <CommonInput label={label} required={required} value={form[key]} error={errors[key]} onChange={(e) => set(key, e.target.value as never)} {...extra} />
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const invalid = validateBill(form, askReason, file);
    if (Object.values(invalid).some(Boolean)) {
      setErrors(invalid);
      return;
    }
    if (await onSave(toExpensePayload(form, askReason), file)) onClose();
  };

  const dayOptions = Array.from({ length: demo.numberOfDays }, (_, index) => ({
    value: index + 1,
    label: `Day ${index + 1} · ${formatDay(dayDate(demo.startDate, index + 1))}`,
  }));

  return (
    <DialogShell
      wide
      title={expense ? `Change ${EXPENSE_KIND_LABELS[kind].toLowerCase()} bill` : 'Add a bill'}
      subtitle={`${demo.reference} · ${demo.clientName}`}
      disabled={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {!expense && (
          <div role="radiogroup" aria-label="Bill type" className="grid grid-cols-4 gap-2">
            {EXPENSE_KINDS.map((option) => (
              <button key={option} type="button" role="radio" aria-checked={kind === option} onClick={() => set('kind', option)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-semibold cursor-pointer ${
                  kind === option ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
                {KIND_ICONS[option]} {EXPENSE_KIND_LABELS[option]}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CommonSelect label={kind === 'OTHER' ? 'Day (optional)' : 'Day'} required={kind !== 'OTHER'} value={form.dayNumber}
            options={kind === 'OTHER' ? [{ value: '', label: 'Not tied to a day' }, ...dayOptions] : dayOptions}
            placeholder="Choose the day" error={errors.dayNumber} onChange={(e) => set('dayNumber', e.target.value)} />
          {kind === 'FOOD' && (
            <CommonSelect label="Meal" required value={form.mealType} error={errors.mealType} placeholder="Choose the meal"
              options={(Object.keys(MEAL_LABELS) as MealType[]).map((meal) => ({ value: meal, label: MEAL_LABELS[meal] }))}
              onChange={(e) => set('mealType', e.target.value as MealType)} />
          )}
          {kind === 'TRAVEL' && (
            <CommonSelect label="Travelled by" required value={form.travelMode} error={errors.travelMode} placeholder="Choose how"
              options={(Object.keys(TRAVEL_MODE_LABELS) as TravelMode[]).map((mode) => ({ value: mode, label: TRAVEL_MODE_LABELS[mode] }))}
              onChange={(e) => set('travelMode', e.target.value as TravelMode)} />
          )}
        </div>

        {kind === 'STAY' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {textField('vendorName', 'Hotel name', true, { maxLength: 150 })}
            {textField('vendorPhone', 'Hotel phone', false, { type: 'tel', maxLength: 16 })}
            <div className="sm:col-span-2">{textField('vendorAddress', 'Hotel address', false, { maxLength: 300 })}</div>
            {textField('vendorMapLink', 'Hotel location (Google Maps link)', false, { type: 'url', maxLength: 500, placeholder: 'https://maps.app.goo.gl/…' })}
            {textField('vendorGstin', 'Hotel GSTIN', false, { maxLength: 15, placeholder: '22AAAAA0000A1Z5' })}
          </div>
        )}
        {kind === 'FOOD' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {textField('vendorName', 'Restaurant name', true, { maxLength: 150 })}
            {textField('vendorGstin', 'Restaurant GSTIN', false, { maxLength: 15 })}
            <div className="sm:col-span-2">{textField('vendorAddress', 'Restaurant address', false, { maxLength: 300 })}</div>
          </div>
        )}
        {kind === 'TRAVEL' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {textField('fromPlace', 'From', true, { maxLength: 150 })}
            {textField('toPlace', 'To', true, { maxLength: 150 })}
            {textField('vendorName', 'Operator (airline, bus, cab…)', false, { maxLength: 150 })}
          </div>
        )}
        {kind === 'OTHER' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {textField('description', 'What it was for', true, { maxLength: 300, placeholder: 'Parking, printing, demo kit courier…' })}
            {textField('vendorName', 'Paid to', false, { maxLength: 150 })}
            <div className="sm:col-span-2">
              <CommonTextArea label="Why it was needed" required value={form.reason} maxLength={500} error={errors.reason}
                onChange={(e) => set('reason', e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {textField('referenceNumber', kind === 'TRAVEL' ? 'Ticket / PNR number' : 'Invoice number', false, { maxLength: 60 })}
          {textField('amount', 'Amount (₹, incl. GST)', true, { inputMode: 'decimal', placeholder: '0.00' })}
          {kind !== 'OTHER' && textField('gstAmount', 'GST included (₹)', false, { inputMode: 'decimal', placeholder: 'Optional' })}
        </div>
        {kind !== 'OTHER' && (
          <CommonTextArea label="Notes" value={form.description} maxLength={300} rows={2} onChange={(e) => set('description', e.target.value)} />
        )}

        <div className="space-y-1">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#0071e3]/40 text-[#0071e3] dark:text-blue-400 font-semibold cursor-pointer hover:bg-[#0071e3]/5">
            <Paperclip className="w-3.5 h-3.5" />
            {invoicePickerLabel(file, expense?.invoiceFileName, kind)}
            <input type="file" accept={FILE_TYPES} className="sr-only" aria-label="Invoice file"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setErrors((prev) => ({ ...prev, file: '' }));
              }} />
          </label>
          {errors.file && <p className="text-rose-500">{errors.file}</p>}
          <p className="text-gray-400">You can attach or replace it later too.</p>
        </div>

        {askReason && (
          <CommonTextArea label="Reason for the change" required value={form.changeReason} maxLength={500} error={errors.changeReason}
            placeholder="e.g. Hotel issued a corrected invoice" onChange={(e) => set('changeReason', e.target.value)} />
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-gray-500">
            {PATTERNS.amount.test(form.amount.trim()) ? <>Bill total <strong className="text-gray-800 dark:text-gray-200">{inrAmount(Number(form.amount))}</strong></> : null}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 font-semibold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
              Back
            </button>
            <button type="submit" disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE.approve}`}>
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {expense ? 'Save changes' : 'Add bill'}
            </button>
          </div>
        </div>
      </form>
    </DialogShell>
  );
};
