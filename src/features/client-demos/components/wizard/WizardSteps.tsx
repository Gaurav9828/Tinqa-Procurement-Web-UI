import React from 'react';
import { Check } from 'lucide-react';
import { PLAN_STEPS } from '../../utils/planForm';

const stepTone = (done: boolean, current: boolean) => {
  if (current) return { card: 'border-[#0071e3] bg-[#0071e3]/10', dot: 'bg-[#0071e3] text-white', label: 'text-[#0071e3] dark:text-blue-400' };
  if (done) return { card: 'border-emerald-500/40 bg-emerald-500/5', dot: 'bg-emerald-500 text-white', label: 'text-gray-700 dark:text-gray-300' };
  return { card: 'border-black/10 dark:border-white/10 hover:bg-black/5', dot: 'bg-gray-200 dark:bg-neutral-700 text-gray-500', label: 'text-gray-700 dark:text-gray-300' };
};

/** The wizard's numbered steps; any of them can be clicked (forward only once the steps before it are complete). */
export const WizardSteps: React.FC<{ step: number; onGo: (step: number) => void }> = ({ step, onGo }) => (
  <ol aria-label="Steps" className="grid grid-cols-4 gap-2">
    {PLAN_STEPS.map((item, index) => {
      const done = index < step;
      const current = index === step;
      const tone = stepTone(done, current);
      return (
        <li key={item.key}>
          <button type="button" onClick={() => onGo(index)} aria-current={current ? 'step' : undefined}
            className={`w-full text-left rounded-2xl border px-3 py-2.5 cursor-pointer transition-colors ${tone.card}`}>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-1.5 ${tone.dot}`}>
              {done ? <Check className="w-3 h-3" /> : index + 1}
            </span>
            <span className={`text-sm font-semibold ${tone.label}`}>{item.label}</span>
            <span className="block text-[10px] text-gray-400 mt-0.5 ml-7">{item.hint}</span>
          </button>
        </li>
      );
    })}
  </ol>
);
