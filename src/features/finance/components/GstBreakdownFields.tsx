import React from 'react';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import type { TaxTreatment } from '../types/finance.types';
import { rupees } from '../utils/money';
import { GST_RATES, TAX_TREATMENT_LABELS, billTotal, gstParts, stateOfGstin, suggestTreatment, withCalculatedGst, type GstForm } from '../utils/gst';

interface Props {
  value: GstForm;
  companyGstin: string | null;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (next: GstForm, changedFields: (keyof GstForm)[]) => void;
}

const TREATMENTS = Object.keys(TAX_TREATMENT_LABELS) as TaxTreatment[];

/**
 * Splits the amount the way the bill does: taxable value (actual price), CGST + SGST or IGST, cess, charges without
 * GST and round off. The voucher amount is their sum. The rate fills in the GST; for a bill with mixed rates it is typed.
 */
export const GstBreakdownFields: React.FC<Props> = ({ value, companyGstin, errors, disabled, onChange }) => {
  const update = (patch: Partial<GstForm>, recalculate = false) => {
    let next = { ...value, ...patch };
    if (recalculate) next = withCalculatedGst(next);
    onChange(next, Object.keys(patch) as (keyof GstForm)[]);
  };
  const field = (name: keyof GstForm, recalculate = false) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    update({ [name]: e.target.value }, recalculate);

  const onGstin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const supplierGstin = e.target.value.toUpperCase().replace(/\s/g, '');
    const suggested = suggestTreatment(supplierGstin, companyGstin);
    update(suggested && suggested !== value.taxTreatment ? { supplierGstin, taxTreatment: suggested } : { supplierGstin }, Boolean(suggested));
  };

  const supplierState = stateOfGstin(value.supplierGstin);
  const companyState = stateOfGstin(companyGstin);
  const parts = gstParts(value);
  const isIntra = value.taxTreatment === 'INTRA_STATE';
  const rateOptions = GST_RATES.some((rate) => rate.value === value.gstRate)
    ? GST_RATES.map((rate) => ({ value: rate.value, label: rate.label }))
    : [...GST_RATES.map((rate) => ({ value: rate.value, label: rate.label })), { value: value.gstRate, label: `${value.gstRate}%` }];
  const amountInput = (name: Exclude<keyof GstForm, 'itcClaimable'>, label: string, extra: Partial<React.ComponentProps<typeof CommonInput>> = {}) => (
    <CommonInput label={label} aria-label={label} inputMode="decimal" placeholder="0.00" value={value[name]} onChange={field(name)}
      error={errors[name === 'taxable' ? 'taxableAmount' : name]} disabled={disabled} {...extra} />
  );

  return (
    <fieldset className="space-y-3" aria-label="GST breakdown" disabled={disabled}>
      <div>
        <legend className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 px-1">GST on the bill</legend>
        <div role="radiogroup" aria-label="GST on the bill" className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {TREATMENTS.map((treatment) => (
            <label key={treatment}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer ${value.taxTreatment === treatment
                ? 'border-[#0071e3] bg-[#0071e3]/[0.06] text-black dark:text-white font-semibold'
                : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-300'}`}>
              <input type="radio" name="taxTreatment" value={treatment} checked={value.taxTreatment === treatment}
                onChange={() => update({ taxTreatment: treatment }, true)} className="sr-only" />
              {TAX_TREATMENT_LABELS[treatment]}
            </label>
          ))}
        </div>
      </div>

      {value.taxTreatment !== 'NONE' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <CommonInput label="Supplier GSTIN" aria-label="Supplier GSTIN" required maxLength={15} value={value.supplierGstin} onChange={onGstin}
                error={errors.supplierGstin} disabled={disabled} placeholder="27AAPFU0939F1ZV" className="font-mono uppercase" />
              {supplierState && (
                <p className="text-[10px] text-gray-500 mt-1 px-1">
                  Supplier in {supplierState.name} ({supplierState.code})
                  {companyState && (supplierState.code === companyState.code ? ' — same state as us: CGST + SGST' : ` — we are in ${companyState.name}: IGST`)}
                </p>
              )}
            </div>
            <CommonInput label="HSN / SAC" aria-label="HSN / SAC" maxLength={8} inputMode="numeric" value={value.hsnSac} onChange={field('hsnSac')}
              error={errors.hsnSac} disabled={disabled} placeholder="e.g. 7408 or 998314" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CommonInput label="Taxable value (actual price, after discount)" aria-label="Taxable value" required inputMode="decimal" placeholder="0.00"
              value={value.taxable} onChange={field('taxable', true)} error={errors.taxableAmount} disabled={disabled} />
            <CommonSelect label="GST rate" aria-label="GST rate" value={value.gstRate} onChange={field('gstRate', true)} options={rateOptions}
              error={errors.gstRate} disabled={disabled} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isIntra ? (
              <>
                {amountInput('cgst', 'CGST', { required: true })}
                <CommonInput label="SGST" aria-label="SGST" readOnly value={value.cgst} error={errors.sgst} title="Always equal to CGST" />
              </>
            ) : (
              amountInput('igst', 'IGST', { required: true })
            )}
            {amountInput('cess', 'Cess')}
            {amountInput('otherCharges', 'Amt without GST')}
            {amountInput('roundOff', 'Round off (±)', { placeholder: '0.00' })}
          </div>

          <label className="flex items-start gap-2 px-1 text-[11px] text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={value.itcClaimable} onChange={(e) => update({ itcClaimable: e.target.checked })}
              className="mt-0.5 accent-[#0071e3]" aria-label="Claim the GST as input tax credit" />
            <span>
              <span className="font-semibold text-black dark:text-white">Claim this GST as input tax credit</span> — booked apart from the
              expense and set off against the GST we owe. Untick for blocked credit (food, personal travel, motor vehicles, gifts — CGST Act
              s.17(5)): the GST then stays part of the expense.
            </span>
          </label>

          <dl aria-label="Bill total" className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-[11px] grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 tabular-nums">
            {parts ? (
              <>
                <dt className="text-gray-500">Taxable value</dt><dd className="text-right">{rupees(parts.taxable)}</dd>
                {isIntra ? (
                  <>
                    <dt className="text-gray-500">CGST{value.gstRate !== '' && ` @ ${Number(value.gstRate) / 2}%`}</dt><dd className="text-right">{rupees(parts.cgst)}</dd>
                    <dt className="text-gray-500">SGST{value.gstRate !== '' && ` @ ${Number(value.gstRate) / 2}%`}</dt><dd className="text-right">{rupees(parts.sgst)}</dd>
                  </>
                ) : (
                  <><dt className="text-gray-500">IGST{value.gstRate !== '' && ` @ ${value.gstRate}%`}</dt><dd className="text-right">{rupees(parts.igst)}</dd></>
                )}
                {parts.cess !== 0 && <><dt className="text-gray-500">Cess</dt><dd className="text-right">{rupees(parts.cess)}</dd></>}
                {parts.other !== 0 && <><dt className="text-gray-500">Charges without GST</dt><dd className="text-right">{rupees(parts.other)}</dd></>}
                {parts.roundOff !== 0 && <><dt className="text-gray-500">Round off</dt><dd className="text-right">{rupees(parts.roundOff)}</dd></>}
                <dt className="font-semibold text-black dark:text-white border-t border-black/10 dark:border-white/10 pt-1 mt-0.5">Bill total = voucher amount</dt>
                <dd className="font-semibold text-black dark:text-white text-right border-t border-black/10 dark:border-white/10 pt-1 mt-0.5">{rupees(billTotal(parts))}</dd>
              </>
            ) : (
              <dt className="text-gray-500 col-span-2">Enter amounts with at most 2 decimals to see the bill total.</dt>
            )}
          </dl>
        </>
      )}
    </fieldset>
  );
};
