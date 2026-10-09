import React from 'react';
import { ChevronDown } from 'lucide-react';
import { UNITS_OF_MEASURE, formatUnit, isKnownUnit, type UnitGroup } from '../../constants/unitsOfMeasure';

interface Props {
  label: string;
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Shown under the select (e.g. why it's locked). */
  hint?: string;
  error?: string;
  id?: string;
  className?: string;
}

const GROUPS: UnitGroup[] = ['Count', 'Length', 'Weight', 'Volume', 'Area'];

/**
 * Unit of measure picker: a fixed list, grouped (Count / Length / Weight / Volume / Area).
 * A saved value that isn't in the list (older records) is still shown so it isn't silently changed.
 */
export const UnitOfMeasureSelect: React.FC<Props> = ({ label, value, onChange, required, disabled, hint, error, id, className = '' }) => {
  const selectId = id ?? 'unit-of-measure';
  const current = (value ?? '').trim();
  const isLegacy = !!current && !isKnownUnit(current);
  return (
    <div className={className}>
      <label htmlFor={selectId} className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={isLegacy ? current : current.toUpperCase()}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 pr-8 text-xs bg-black/5 dark:bg-white/5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] appearance-none text-black dark:text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
            error ? 'border-rose-500' : 'border-black/10 dark:border-white/10'
          }`}
        >
          {!current && <option value="">Select unit…</option>}
          {isLegacy && <option value={current}>{current} (current value)</option>}
          {GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {UNITS_OF_MEASURE.filter((unit) => unit.group === group).map((unit) => (
                <option key={unit.code} value={unit.code}>
                  {formatUnit(unit.code)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {error ? <p className="mt-1 text-[11px] text-rose-500">{error}</p> : hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
};
