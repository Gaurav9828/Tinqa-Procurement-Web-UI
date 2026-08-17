import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import type { HeaderColumnFilterProps } from '../types/dealerComponentProps';

export const HeaderColumnFilter: React.FC<HeaderColumnFilterProps> = ({
    title,
    options,
    selectedValues,
    onChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (opt: string) => {
        if (selectedValues.includes(opt)) {
            onChange(selectedValues.filter((v) => v !== opt));
        } else {
            onChange([...selectedValues, opt]);
        }
    };

    return (
        <div className="relative inline-block text-left">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1 font-semibold hover:text-black dark:hover:text-white transition-colors cursor-pointer ${
                    selectedValues.length > 0 ? 'text-[#0071e3]' : ''
                }`}
            >
                <span>{title}</span>
                <Filter className="w-3 h-3" />
                {selectedValues.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" />
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 mt-2 w-48 rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-xl z-20 p-2 space-y-1">
                        <div className="flex items-center justify-between px-2 py-1 border-b border-black/5 dark:border-white/5 text-[11px] font-bold text-gray-400">
                            <span>Filter {title}</span>
                            {selectedValues.length > 0 && (
                                <button
                                    onClick={() => onChange([])}
                                    className="text-[#0071e3] hover:underline cursor-pointer"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            {options.length === 0 ? (
                                <div className="p-2 text-gray-400 text-[11px] text-center">
                                    No options
                                </div>
                            ) : (
                                options.map((opt) => (
                                    <label
                                        key={opt}
                                        className="flex items-center gap-2 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-xs cursor-pointer text-black dark:text-white"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedValues.includes(opt)}
                                            onChange={() => toggleOption(opt)}
                                            className="rounded border-gray-300 text-[#0071e3] focus:ring-[#0071e3]"
                                        />
                                        <span className="truncate">{opt}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};