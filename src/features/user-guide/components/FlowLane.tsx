import React from 'react';
import { isOwnStep, type GuideFlow, type GuideRoleId, type StepKind } from '../content/guideContent';

const KIND_STYLE: Record<StepKind, { card: string; label: string }> = {
  maker: { card: 'border-l-blue-600', label: 'text-blue-700 dark:text-blue-400' },
  checker: { card: 'border-l-emerald-600 bg-emerald-500/5', label: 'text-emerald-700 dark:text-emerald-400' },
  external: { card: 'border-l-amber-500', label: 'text-amber-700 dark:text-amber-400' },
  end: { card: 'border-l-teal-700 bg-teal-500/5', label: 'text-teal-700 dark:text-teal-400' },
};

/** One flow as a row of steps. The selected role's own steps are outlined and tagged "You". */
export const FlowLane: React.FC<{ flow: GuideFlow; index: number; role: GuideRoleId | null }> = ({ flow, index, role }) => (
  <section className="apple-card p-5 space-y-3" aria-labelledby={`flow-${flow.id}`}>
    <div>
      <h3 id={`flow-${flow.id}`} className="text-base font-semibold text-black dark:text-white">
        {index}. {flow.title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-neutral-400">{flow.summary}</p>
    </div>
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {flow.steps.map((step, i) => {
        const own = isOwnStep(step, role);
        const style = KIND_STYLE[step.kind];
        return (
          <li
            key={i}
            className={`relative rounded-xl border border-black/10 dark:border-white/10 border-l-4 p-3 text-sm flex flex-col gap-1 ${style.card} ${
              own ? 'ring-2 ring-[#0071e3]/60' : ''
            }`}
          >
            <span className={`text-[11px] font-semibold uppercase tracking-wide flex items-center gap-2 ${style.label}`}>
              {i + 1} · {step.label}
              {own && <span className="rounded-full bg-[#0071e3] text-white px-1.5 py-px text-[10px] normal-case tracking-normal">You</span>}
            </span>
            <span className={`text-gray-800 dark:text-gray-100 ${own ? 'font-medium' : ''}`}>{step.text}</span>
            {step.where && <span className="text-xs text-gray-500 dark:text-neutral-400">Where: {step.where}</span>}
            {step.otherwise && <span className="text-xs text-rose-600 dark:text-rose-400">{step.otherwise}</span>}
          </li>
        );
      })}
    </ol>
  </section>
);
