import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export interface NextStepOption {
  value: string;
  /** Button-style wording, e.g. "Mark shipped". */
  label: string;
  description?: string;
  /** Exceptional moves (cancel, reject, failures) are styled as warnings. */
  tone?: 'forward' | 'exception';
}

interface Props {
  options: NextStepOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  error?: string;
}

/**
 * The only way to change an order's status: one card per allowed next step, nothing else.
 * Arrow keys move between cards (native radio behaviour).
 */
export const NextStepPicker: React.FC<Props> = ({ options, value, onChange, disabled, label = 'Next step', error }) => {
  const name = React.useId();
  return (
    <div>
      <div role="radiogroup" aria-label={label} aria-invalid={!!error} className="space-y-2">
        {options.map((option) => {
          const checked = option.value === value;
          const exception = option.tone === 'exception';
          return (
            <label
              key={option.value}
              className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
                disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
                checked
                  ? exception
                    ? 'border-rose-500/60 bg-rose-500/5'
                    : 'border-[#0071e3] bg-[#0071e3]/5'
                  : 'border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="mt-0.5 accent-[#0071e3]"
                aria-describedby={option.description ? `${name}-${option.value}` : undefined}
              />
              <span className="min-w-0">
                <span className={`flex items-center gap-1 text-xs font-semibold ${exception ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'}`}>
                  {exception ? <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden /> : <ArrowRight className="w-3 h-3 shrink-0" aria-hidden />}
                  {option.label}
                </span>
                {option.description && (
                  <span id={`${name}-${option.value}`} className="block text-[11px] text-gray-500 dark:text-neutral-400 mt-0.5">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-red-500 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
};
