import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { DemoSummary } from '../types/clientDemo.types';
import { DemoStatusBadge } from './DemoStatusBadge';
import { DEMO_TYPE_LABELS, formatDay, formatTime, inrAmount } from '../utils/clientDemo';

/** Demos as rows; each opens at `pathOf(demo)`. */
export const DemoTable: React.FC<{
  demos: DemoSummary[];
  isLoading: boolean;
  empty: string;
  pathOf: (demo: DemoSummary) => string;
  actionLabel?: (demo: DemoSummary) => string;
  label: string;
}> = ({ demos, isLoading, empty, pathOf, actionLabel, label }) => {
  if (demos.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs" aria-label={label}>
        <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
          <tr>
            <th className="pb-2 pr-3 font-semibold">Demo</th>
            <th className="pb-2 pr-3 font-semibold">Client</th>
            <th className="pb-2 pr-3 font-semibold">When</th>
            <th className="pb-2 pr-3 font-semibold">Staff</th>
            <th className="pb-2 pr-3 font-semibold text-right">Budget</th>
            <th className="pb-2 pr-3 font-semibold text-right">Spent</th>
            <th className="pb-2 pr-3 font-semibold">Status</th>
            <th className="pb-2 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
          {demos.map((demo) => {
            const over = demo.total > demo.proposedBudget;
            return (
              <tr key={demo.id}>
                <td className="py-2.5 pr-3">
                  <span className="font-mono font-semibold">{demo.reference}</span>
                  <span className="block text-[10px] text-gray-400">{DEMO_TYPE_LABELS[demo.demoType]}</span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="font-semibold">{demo.clientName}</span>
                  <span className="block text-[10px] text-gray-400">{demo.clientCategoryLabel} · {demo.city}</span>
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  {formatDay(demo.startDate)} · {formatTime(demo.startTime)}
                  <span className="block text-[10px] text-gray-400">{demo.numberOfDays} {demo.numberOfDays === 1 ? 'day' : 'days'}</span>
                </td>
                <td className="py-2.5 pr-3 max-w-[12rem] truncate" title={demo.staffNames.join(', ')}>{demo.staffNames.join(', ') || '—'}</td>
                <td className="py-2.5 pr-3 text-right font-mono">{inrAmount(demo.proposedBudget)}</td>
                <td className={`py-2.5 pr-3 text-right font-mono ${over ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>{inrAmount(demo.total)}</td>
                <td className="py-2.5 pr-3"><DemoStatusBadge status={demo.status} /></td>
                <td className="py-2.5 text-right">
                  <Link to={pathOf(demo)} aria-label={`Open ${demo.reference}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold whitespace-nowrap">
                    {actionLabel?.(demo) ?? 'Open'} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
