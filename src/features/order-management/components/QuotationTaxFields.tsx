import React from 'react';
import { CommonCheckbox, CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import {
  QUOTATION_GST_RATES,
  SUPPLY_TYPE_LABELS,
  calculateTax,
  type SupplyType,
  type TaxForm,
} from '../utils/quotationTax';

interface Props {
  value: TaxForm;
  onChange: (next: TaxForm) => void;
  /** Unit price × quantity + shipment, in rupees; null while those are incomplete. */
  taxable: number | null;
  /** Keyed like the backend: taxBreakup.gstRate, … */
  errors?: Record<string, string>;
  disabled?: boolean;
  /** The supplier's state on record, to help choose CGST + SGST or IGST. */
  supplierState?: string | null;
}

const SUPPLY_TYPES = Object.keys(SUPPLY_TYPE_LABELS) as SupplyType[];

/** "CGST @ 9%", or just "CGST" until a rate is chosen. */
const atRate = (name: string, rate: number | null) => (rate === null ? name : `${name} @ ${rate}%`);

const optionTone = (selected: boolean, invalid: boolean) => {
  if (selected) return 'border-[#0071e3] bg-[#0071e3]/[0.08] text-black dark:text-white font-semibold';
  if (invalid) return 'border-red-500/70 text-gray-700 dark:text-gray-200';
  return 'border-black/15 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:border-[#0071e3]/60 hover:bg-[#0071e3]/[0.04]';
};

/** The required CGST + SGST / IGST choice, shown as two clickable cards with a round selector each. */
const SupplyTypeChoice: React.FC<{
  value: SupplyType | '';
  invalid: boolean;
  disabled?: boolean;
  onSelect: (type: SupplyType) => void;
}> = ({ value, invalid, disabled, onSelect }) => (
  <div className="space-y-1.5">
    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1 px-1">
      How GST applies <span className="text-red-500 font-bold" aria-hidden="true">*</span>
      <span className="font-normal text-gray-500">— choose one</span>
    </p>
    <div
      role="radiogroup"
      aria-label="How GST applies"
      aria-required="true"
      aria-invalid={invalid || undefined}
      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
    >
      {SUPPLY_TYPES.map((type) => {
        const selected = value === type;
        // ! beats the global `* { cursor: default }` rule in index.css
        const cursor = disabled ? '[&,&_*]:cursor-not-allowed! opacity-60' : '[&,&_*]:cursor-pointer!';
        return (
          <label
            key={type}
            className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0071e3]/50 ${cursor} ${optionTone(selected, invalid)}`}
          >
            <input
              type="radio"
              name="quotationSupplyType"
              value={type}
              checked={selected}
              onChange={() => onSelect(type)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                selected ? 'border-[#0071e3]' : 'border-gray-400 dark:border-gray-500 group-hover:border-[#0071e3]/70'
              }`}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-[#0071e3]" />}
            </span>
            <span>{SUPPLY_TYPE_LABELS[type]}</span>
          </label>
        );
      })}
    </div>
  </div>
);

/**
 * The optional GST breakup of a quotation: supply type, rate, HSN/SAC and cess, with CGST/SGST or IGST worked out from
 * the rate (or typed to match the supplier's rounding). Shows the bill the supplier's invoice will be checked against.
 */
export const QuotationTaxFields: React.FC<Props> = ({ value, onChange, taxable, errors = {}, disabled, supplierState }) => {
  const set = (patch: Partial<TaxForm>) => onChange({ ...value, ...patch });
  const taxablePaise = taxable === null ? null : Math.round(taxable * 100);
  const amounts = calculateTax(taxablePaise, value);
  const calculated = calculateTax(taxablePaise, { ...value, cgst: '', igst: '' });
  const intra = value.supplyType === 'INTRA_STATE';
  const rate = value.gstRate === '' ? null : Number(value.gstRate);
  const halfRate = rate === null ? null : rate / 2;

  return (
    <fieldset className="space-y-3 rounded-xl border border-black/10 dark:border-white/10 p-3" aria-label="GST breakup" disabled={disabled}>
      <CommonCheckbox
        label={<span className="text-xs font-semibold">Add GST breakup <span className="font-normal text-gray-500">(optional — the supplier's invoice is checked against it)</span></span>}
        checked={value.enabled}
        disabled={disabled}
        onChange={(enabled) => set({ enabled })}
      />

      {value.enabled && (
        <>
          <SupplyTypeChoice
            value={value.supplyType}
            invalid={Boolean(errors['taxBreakup.supplyType'])}
            disabled={disabled}
            onSelect={(type) => set({ supplyType: type, cgst: '', igst: '' })}
          />
          {errors['taxBreakup.supplyType'] && <p className="text-[11px] text-red-500 font-medium px-1">{errors['taxBreakup.supplyType']}</p>}
          {supplierState && <p className="text-[10px] text-gray-500 px-1">Supplier's state on record: {supplierState}</p>}

          <div className="grid grid-cols-2 gap-3">
            <CommonSelect
              label="GST rate"
              aria-label="GST rate"
              required
              placeholder="Choose rate"
              value={value.gstRate}
              options={QUOTATION_GST_RATES.map((option) => ({ value: String(option.value), label: option.label }))}
              error={errors['taxBreakup.gstRate']}
              onChange={(event) => set({ gstRate: event.target.value, cgst: '', igst: '' })}
            />
            <CommonInput
              label="HSN / SAC"
              aria-label="HSN / SAC"
              inputMode="numeric"
              maxLength={8}
              placeholder="e.g. 7408"
              value={value.hsnSac}
              error={errors['taxBreakup.hsnSac']}
              onChange={(event) => set({ hsnSac: event.target.value.replace(/\D/g, '') })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {intra ? (
              <>
                <CommonInput
                  label={atRate('CGST', halfRate)}
                  aria-label="CGST"
                  inputMode="decimal"
                  placeholder={calculated ? (calculated.cgst / 100).toFixed(2) : '0.00'}
                  value={value.cgst}
                  error={errors['taxBreakup.cgst']}
                  onChange={(event) => set({ cgst: event.target.value })}
                />
                <CommonInput
                  label={atRate('SGST', halfRate)}
                  aria-label="SGST"
                  readOnly
                  title="Always equal to CGST"
                  value={amounts ? (amounts.sgst / 100).toFixed(2) : ''}
                  error={errors['taxBreakup.sgst']}
                />
              </>
            ) : (
              <div className="col-span-2">
                <CommonInput
                  label={atRate('IGST', rate)}
                  aria-label="IGST"
                  inputMode="decimal"
                  disabled={!value.supplyType}
                  placeholder={calculated ? (calculated.igst / 100).toFixed(2) : '0.00'}
                  value={value.igst}
                  error={errors['taxBreakup.igst']}
                  onChange={(event) => set({ igst: event.target.value })}
                />
              </div>
            )}
            <CommonInput
              label="Cess (₹)"
              aria-label="Cess"
              inputMode="decimal"
              placeholder="0.00"
              value={value.cess}
              error={errors['taxBreakup.cess']}
              onChange={(event) => set({ cess: event.target.value })}
            />
          </div>
          <p className="text-[10px] text-gray-500 px-1">Leave the tax amounts empty to work them out from the rate, or type the supplier's figure (within ₹1).</p>

          <dl aria-label="Quotation bill" className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-[11px] grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 tabular-nums">
            {amounts ? (
              <>
                <dt className="text-gray-500">Taxable value (price × qty + shipment)</dt><dd className="text-right">{formatCurrency(amounts.taxable / 100)}</dd>
                {intra ? (
                  <>
                    <dt className="text-gray-500">CGST</dt><dd className="text-right">{formatCurrency(amounts.cgst / 100)}</dd>
                    <dt className="text-gray-500">SGST</dt><dd className="text-right">{formatCurrency(amounts.sgst / 100)}</dd>
                  </>
                ) : (
                  <><dt className="text-gray-500">IGST</dt><dd className="text-right">{formatCurrency(amounts.igst / 100)}</dd></>
                )}
                {amounts.cess > 0 && <><dt className="text-gray-500">Cess</dt><dd className="text-right">{formatCurrency(amounts.cess / 100)}</dd></>}
                <dt className="font-semibold text-black dark:text-white border-t border-black/10 dark:border-white/10 pt-1 mt-0.5">Total incl. GST</dt>
                <dd className="font-semibold text-black dark:text-white text-right border-t border-black/10 dark:border-white/10 pt-1 mt-0.5" data-testid="quotation-grand-total">
                  {formatCurrency(amounts.grandTotal / 100)}
                </dd>
              </>
            ) : (
              <dt className="text-gray-500 col-span-2">Choose how GST applies and the rate to see the bill.</dt>
            )}
          </dl>
        </>
      )}
    </fieldset>
  );
};
