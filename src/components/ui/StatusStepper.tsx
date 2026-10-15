import React from 'react';
import { Check } from 'lucide-react';

export interface StepperStep {
  key: string;
  label: string;
}

interface Props {
  steps: StepperStep[];
  /** Index of the current step; -1 when the order is not on this track yet. */
  currentIndex: number;
  /** Grey out the whole track (e.g. a cancelled order). */
  muted?: boolean;
  /** The current step went wrong (e.g. refund failed): shown in amber instead of blue. */
  warning?: boolean;
  /** The last step is reached and closed: shown as done rather than "current". */
  complete?: boolean;
  label: string;
  tone?: 'blue' | 'purple';
}

const TONE = {
  blue: { bar: 'bg-[#0071e3]', text: 'text-[#0071e3]', dot: 'bg-[#0071e3] ring-[#0071e3]/20' },
  purple: { bar: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500 ring-purple-500/20' },
};

/** Horizontal progress: done steps are ticked, the current one is highlighted, later ones are grey. */
export const StatusStepper: React.FC<Props> = ({ steps, currentIndex, muted, warning, complete, label, tone = 'blue' }) => {
  const colors = TONE[tone];
  return (
    <ol aria-label={label} className="flex items-start gap-1">
      {steps.map((step, index) => {
        const done = !muted && (index < currentIndex || (complete && index === currentIndex));
        const current = !muted && !complete && index === currentIndex;
        const reached = done || current;
        return (
          <li key={step.key} aria-current={current ? 'step' : undefined} data-done={done} className="flex-1 min-w-0">
            <div className="flex items-center">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  current ? `${warning ? 'bg-amber-500 ring-amber-500/20' : colors.dot} ring-4` : reached ? colors.bar : 'bg-gray-300 dark:bg-neutral-600'
                }`}
              />
              {index < steps.length - 1 && (
                <span className={`h-0.5 flex-1 mx-1 rounded-full ${done ? colors.bar : 'bg-gray-200 dark:bg-neutral-700'}`} />
              )}
            </div>
            <span
              className={`mt-1.5 flex items-center gap-0.5 text-[10px] leading-tight pr-1 ${
                current ? `font-bold ${warning ? 'text-amber-600 dark:text-amber-400' : colors.text}` : done ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'
              }`}
            >
              {done && <Check className="w-2.5 h-2.5 shrink-0" aria-hidden />}
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};
