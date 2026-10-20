import React from 'react';
import type { Period } from '../types/finance.types';
import { PERIOD_PRESETS, isoDate, presetPeriod, type PeriodPreset } from '../utils/period';

const inputClass =
  'px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs text-black dark:text-white';

/** Preset periods (including the Indian financial year) or a custom range. */
export const PeriodPicker: React.FC<{
  preset: PeriodPreset;
  period: Period;
  firstEntryOn?: string | null;
  onChange: (preset: PeriodPreset, period: Period) => void;
}> = ({ preset, period, firstEntryOn, onChange }) => (
  <div className="flex flex-wrap items-center gap-2">
    <select
      aria-label="Period"
      value={preset}
      onChange={(e) => {
        const next = e.target.value as PeriodPreset;
        onChange(next, presetPeriod(next, firstEntryOn) ?? period);
      }}
      className={`${inputClass} cursor-pointer`}
    >
      {PERIOD_PRESETS.map((p) => (
        <option key={p.id} value={p.id} className="bg-white dark:bg-[#1c1c1e]">
          {p.label}
        </option>
      ))}
    </select>
    {preset === 'CUSTOM' && (
      <>
        <input type="date" aria-label="From" className={inputClass} value={period.from} max={period.to}
          onChange={(e) => e.target.value && onChange('CUSTOM', { ...period, from: e.target.value })} />
        <span className="text-gray-400 text-xs">to</span>
        <input type="date" aria-label="To" className={inputClass} value={period.to} min={period.from} max={isoDate(new Date())}
          onChange={(e) => e.target.value && onChange('CUSTOM', { ...period, to: e.target.value })} />
      </>
    )}
  </div>
);
