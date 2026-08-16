import React, { useState, useRef, useEffect } from 'react';
import { Filter, Check, X } from 'lucide-react';

interface Props {
  title: string;
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
}

export const HeaderColumnFilter: React.FC<Props> = ({
  title,
  options,
  selectedValues,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const isFiltered = selectedValues.length > 0;

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={dropdownRef}>
      <span>{title}</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          isFiltered
            ? 'bg-[#0071e3] text-white'
            : 'hover:bg-black/10 dark:hover:bg-white/10 text-gray-400'
        }`}
        title={`Filter by ${title}`}
      >
        <Filter className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-48 bg-white dark:bg-neutral-800 border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 font-normal text-xs normal-case">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/10 dark:border-white/10 px-1">
            <span className="font-semibold text-gray-500 text-[11px]">{title} Filter</span>
            {isFiltered && (
              <button
                onClick={() => onChange([])}
                className="text-[10px] text-[#0071e3] hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {options.length === 0 ? (
              <p className="text-[11px] text-gray-400 p-1 italic">No values</p>
            ) : (
              options.map((option) => {
                const checked = selectedValues.includes(option);
                return (
                  <label
                    key={option}
                    onClick={() => handleToggleOption(option)}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-black dark:text-white"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                        checked
                          ? 'bg-[#0071e3] border-[#0071e3] text-white'
                          : 'border-gray-400 dark:border-neutral-500'
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate">{option}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};