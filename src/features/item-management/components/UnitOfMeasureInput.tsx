import React, { useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const PRESET_UNITS = ['PCS', 'KG', 'GRAM', 'METER', 'BOX', 'PACK', 'SET', 'LTR'];

export const UnitOfMeasureInput: React.FC<Props> = ({ value, onChange }) => {
  const isPreset = PRESET_UNITS.includes(value.toUpperCase());
  const [isCustom, setIsCustom] = useState(!isPreset && value.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300">
          Unit of Measure <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setIsCustom(!isCustom);
            onChange(isCustom ? 'PCS' : '');
          }}
          className="text-[11px] text-[#0071e3] hover:underline font-medium"
        >
          {isCustom ? 'Select Standard Unit' : '+ Custom Unit'}
        </button>
      </div>

      {isCustom ? (
        <input
          type="text"
          placeholder="e.g. ROLL, PAIR, BOTTLE"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:border-[#0071e3] transition-colors text-black dark:text-white uppercase"
        />
      ) : (
        <select
          value={value || 'PCS'}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:border-[#0071e3] transition-colors appearance-none cursor-pointer text-black dark:text-white"
        >
          {PRESET_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};