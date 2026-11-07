import React from 'react';
import { CommonCheckbox, CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, finalPercentOf, type PaymentMethod, type PaymentPlanForm } from '../utils/paymentPlan';

interface Props {
  value: PaymentPlanForm;
  onChange: (next: PaymentPlanForm) => void;
  /** What the quotation totals (GST included), to show each part in rupees; null while incomplete. */
  total: number | null;
  errors?: Record<string, string>;
  disabled?: boolean;
}

/**
 * How the dealer wants to be paid: the advance percentage, an optional midterm percentage (some dealers want only an
 * advance and the final payment), the final part worked out as the rest of 100 % (paid only after the delivered units
 * are tested), and the payment method they expect.
 */
export const PaymentPlanFields: React.FC<Props> = ({ value, onChange, total, errors = {}, disabled }) => {
  const set = (patch: Partial<PaymentPlanForm>) => onChange({ ...value, ...patch });
  const left = finalPercentOf(value);
  const rupeesOf = (percent: string | number | null) =>
    total === null || percent === null || percent === '' || Number.isNaN(Number(percent)) ? null : formatCurrency((total * Number(percent)) / 100);

  return (
    <fieldset className="space-y-3 rounded-xl border border-black/10 dark:border-white/10 p-3" aria-label="Payment plan" disabled={disabled}>
      <legend className="px-1 text-xs font-semibold text-black dark:text-white">Payment plan</legend>
      <CommonCheckbox
        label={<span className="text-xs">Midterm payment <span className="text-gray-500">(when shipped; untick for advance and final only)</span></span>}
        checked={value.midtermEnabled}
        disabled={disabled}
        onChange={(midtermEnabled) => set({ midtermEnabled, midtermPercent: midtermEnabled ? value.midtermPercent || '30' : value.midtermPercent })}
      />
      <div className={`grid gap-3 ${value.midtermEnabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div>
          <CommonInput
            label="Advance (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            value={value.advancePercent}
            onChange={(e) => set({ advancePercent: e.target.value })}
            error={errors.advancePercent}
          />
          <p className="mt-1 text-[10px] text-gray-400">Once the order is approved{rupeesOf(value.advancePercent) ? ` · ${rupeesOf(value.advancePercent)}` : ''}</p>
        </div>
        {value.midtermEnabled && (
        <div>
          <CommonInput
            label="Midterm (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            value={value.midtermPercent}
            onChange={(e) => set({ midtermPercent: e.target.value })}
            error={errors.midtermPercent}
          />
          <p className="mt-1 text-[10px] text-gray-400">When shipped{rupeesOf(value.midtermPercent) ? ` · ${rupeesOf(value.midtermPercent)}` : ''}</p>
        </div>
        )}

        <div>
          <CommonInput
            label="Final (%)"
            aria-label="Final payment percentage"
            data-testid="plan-final-percent"
            type="string"
            min="0"
            max="100"
            step="0.01"
            disabled
            value={left === null ? '—' : `${Number(left.toFixed(2))}%`}
          />
          <p className="mt-1 text-[10px] text-gray-400">After testing, worked out{left !== null && left >= 0 && rupeesOf(left) ? ` · ${rupeesOf(left)}` : ''}</p>
        </div>


        {/* <div>
          <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Final (%)</span>
          <output
            aria-label="Final payment percentage"
            data-testid="plan-final-percent"
            className={`block w-full px-3 py-2 rounded-xl border text-xs bg-black/[0.04] dark:bg-white/[0.04] ${
              left !== null && left < 0 ? 'border-rose-500/40 text-rose-600' : 'border-black/10 dark:border-white/10 text-black dark:text-white'
            }`}
          >
            {left === null ? '—' : `${Number(left.toFixed(2))}%`}
          </output>
          <p className="mt-1 text-[10px] text-gray-400">After testing, worked out{left !== null && left >= 0 && rupeesOf(left) ? ` · ${rupeesOf(left)}` : ''}</p>
        </div> */}
      </div>
      <CommonSelect
        label="Expected payment method"
        required
        placeholder="-- How the dealer wants to be paid --"
        value={value.expectedPaymentMethod}
        options={PAYMENT_METHODS.map((method) => ({ label: PAYMENT_METHOD_LABELS[method], value: method }))}
        onChange={(e) => set({ expectedPaymentMethod: e.target.value as PaymentMethod })}
        error={errors.expectedPaymentMethod}
      />
      <p className="text-[11px] text-gray-500">
        The final part is paid only after the delivered units are tested, and only for the units that pass.
      </p>
    </fieldset>
  );
};
