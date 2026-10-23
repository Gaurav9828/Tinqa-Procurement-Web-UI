import React, { useId } from 'react';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { COST_ENTRIES_MAX, COST_LABEL_MAX, COST_REASON_MAX } from '../types/product.types';
import {
  COST_SUGGESTIONS,
  costEntryErrorKey,
  costPreviewRows,
  costPreviewWarnings,
  emptyCostEntryRow,
  type CostEntryRow,
  type CostPreview,
} from '../utils/productCosting';
import { ProfitBreakdown } from './ProfitBreakdown';

interface Props {
  rows: CostEntryRow[];
  setRows: React.Dispatch<React.SetStateAction<CostEntryRow[]>>;
  /** Keyed like the backend: `costEntries[i].<field>`. */
  errors: Record<string, string>;
  onClearErrors: () => void;
  preview: CostPreview;
  incomeTaxRate: number | null;
  disabled?: boolean;
}

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white ${
    hasError ? 'border-rose-500' : 'border-black/10 dark:border-white/10'
  }`;

/**
 * Extra costs of one unit besides its components — manpower, software, packaging — each with how it was worked out,
 * and what the product will earn per unit at the entered price. Shown to PRODUCT_COST_VIEW holders; only
 * PRODUCT_COST_EDIT holders can change the costs.
 */
export const ProductCostingSection: React.FC<Props> = ({ rows, setRows, errors, onClearErrors, preview, incomeTaxRate, disabled }) => {
  const baseId = useId();
  const { can } = useAccess();
  const canEdit = can('PRODUCT_COST_EDIT');
  const locked = disabled || !canEdit;

  const patch = (uid: string, change: Partial<CostEntryRow>) => {
    setRows((prev) => prev.map((row) => (row.uid === uid ? { ...row, ...change } : row)));
    onClearErrors();
  };
  const add = (label = '') => {
    setRows((prev) => [...prev, emptyCostEntryRow(label)]);
    onClearErrors();
  };
  const remove = (uid: string) => {
    setRows((prev) => prev.filter((row) => row.uid !== uid));
    onClearErrors();
  };
  const unusedSuggestions = COST_SUGGESTIONS.filter((label) => !rows.some((row) => row.label.trim().toLowerCase() === label.toLowerCase()));

  return (
    <div className="space-y-3 pt-2 border-t border-black/10 dark:border-white/10" role="group" aria-label="Costing">
      <div>
        <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
          <Calculator className="w-3.5 h-3.5 text-[#0071e3]" /> Costing & profit (per unit)
        </span>
        <p className="text-gray-400 mt-0.5">
          Component costs come from the item's purchase price and can be adjusted above. Add every other cost of making one unit — manpower,
          software, packaging — with how you worked it out. Amounts exclude GST. Shipping is added per order when it ships.
        </p>
        {!canEdit && <p className="text-gray-400 mt-0.5">You can see the costs but not change them.</p>}
      </div>

      {rows.length === 0 && <p className="text-gray-400 italic">No extra costs added.</p>}

      {rows.map((row, index) => {
        const id = (field: string) => `${baseId}-${index}-${field}`;
        const error = (field: 'label' | 'amount' | 'description') => errors[costEntryErrorKey(index, field)];
        return (
          <div
            key={row.uid}
            role="group"
            aria-label={`Extra cost ${index + 1}`}
            className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <div className="flex-1 min-w-0">
                <label htmlFor={id('label')} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cost *
                </label>
                <input
                  id={id('label')}
                  value={row.label}
                  maxLength={COST_LABEL_MAX}
                  placeholder="e.g. Manpower"
                  disabled={locked}
                  aria-invalid={!!error('label')}
                  onChange={(e) => patch(row.uid, { label: e.target.value })}
                  className={inputClass(!!error('label'))}
                />
                {error('label') && <p role="alert" className="mt-1 text-rose-500">{error('label')}</p>}
              </div>
              <div className="sm:w-36">
                <label htmlFor={id('amount')} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (₹) *
                </label>
                <input
                  id={id('amount')}
                  inputMode="decimal"
                  value={row.amount}
                  placeholder="e.g. 2000.00"
                  disabled={locked}
                  aria-invalid={!!error('amount')}
                  onChange={(e) => patch(row.uid, { amount: e.target.value })}
                  className={inputClass(!!error('amount'))}
                />
                {error('amount') && <p role="alert" className="mt-1 text-rose-500">{error('amount')}</p>}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(row.uid)}
                  disabled={disabled}
                  aria-label={`Remove extra cost ${index + 1}`}
                  title="Remove this cost"
                  className="self-end sm:mt-6 p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <label htmlFor={id('description')} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                How it was worked out
              </label>
              <textarea
                id={id('description')}
                rows={2}
                value={row.description}
                maxLength={COST_REASON_MAX}
                placeholder="e.g. 2 technicians × 4 hours × ₹250/hour"
                disabled={locked}
                aria-invalid={!!error('description')}
                onChange={(e) => patch(row.uid, { description: e.target.value })}
                className={`${inputClass(!!error('description'))} resize-none`}
              />
              {error('description') && <p role="alert" className="mt-1 text-rose-500">{error('description')}</p>}
            </div>
          </div>
        );
      })}

      {canEdit && rows.length < COST_ENTRIES_MAX && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => add()}
            disabled={disabled}
            className="flex items-center gap-1.5 text-[#0071e3] hover:underline font-medium cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add cost
          </button>
          {unusedSuggestions.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => add(label)}
              disabled={disabled}
              className="px-2 py-0.5 rounded-full border border-[#0071e3]/40 bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/20 cursor-pointer disabled:opacity-50"
            >
              + {label}
            </button>
          ))}
        </div>
      )}
      {errors.costEntries && <p role="alert" className="text-rose-500">{errors.costEntries}</p>}

      <ProfitBreakdown
        title="What one unit earns"
        rows={costPreviewRows(preview)}
        profit={preview.profit}
        incomeTaxRate={incomeTaxRate}
        warnings={costPreviewWarnings(preview)}
        footnote="Shipping and returns are costed per order, when the order ships."
      />
    </div>
  );
};
