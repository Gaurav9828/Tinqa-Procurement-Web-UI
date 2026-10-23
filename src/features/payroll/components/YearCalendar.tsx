import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { MonthState, YearSummary } from '../types/payroll.types';
import { MONTH_NAMES, MONTH_STATE_LABELS, inrAmount } from '../utils/payroll';

const STATE_STYLES: Record<MonthState, string> = {
  UPCOMING: 'text-gray-400',
  NO_EMPLOYEES: 'text-gray-400',
  NOT_STARTED: 'text-rose-600 dark:text-rose-400',
  IN_PROGRESS: 'text-amber-700 dark:text-amber-400',
  AWAITING_APPROVAL: 'text-amber-700 dark:text-amber-400',
  PAID: 'text-emerald-700 dark:text-emerald-400',
};

/** January to December of one year: how far each month's salaries have got. Choosing a month opens it below. */
export const YearCalendar: React.FC<{
  year: number;
  summary: YearSummary | null;
  isLoading: boolean;
  selectedMonth: number | null;
  onYear: (year: number) => void;
  onMonth: (month: number) => void;
}> = ({ year, summary, isLoading, selectedMonth, onYear, onMonth }) => (
  <section aria-label="Salary calendar" className="apple-card p-5 space-y-4 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-black dark:text-white">Salary calendar</h2>
        <p className="text-gray-500 dark:text-neutral-400 mt-0.5">
          {summary ? <>Confirmed in {year}: <span className="font-semibold text-black dark:text-white">{inrAmount(summary.approvedNetPay)}</span></> : 'Each month of the year at a glance.'}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous year" onClick={() => onYear(year - 1)} disabled={year <= 2000}
          className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white cursor-pointer disabled:opacity-40">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="w-14 text-center text-sm font-bold text-black dark:text-white tabular-nums" aria-live="polite">{year}</span>
        <button type="button" aria-label="Next year" onClick={() => onYear(year + 1)} disabled={year >= new Date().getFullYear() + 1}
          className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white cursor-pointer disabled:opacity-40">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        {isLoading && <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin text-gray-400" aria-label="Loading" />}
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {MONTH_NAMES.map((name, index) => {
        const month = index + 1;
        const info = summary?.months.find((m) => m.month === month);
        const upcoming = info?.state === 'UPCOMING';
        const selected = selectedMonth === month;
        const label = info ? `${name} ${year}: ${MONTH_STATE_LABELS[info.state]}` : `${name} ${year}`;
        const waiting = info && info.pendingApproval > 0 ? ` · ${info.pendingApproval} waiting` : '';
        return (
          <button key={name} type="button" onClick={() => onMonth(month)} disabled={!info || upcoming} aria-pressed={selected}
            aria-label={label}
            className={`text-left p-3 rounded-xl border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? 'border-[#0071e3] bg-[#0071e3]/10'
                : 'border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
            }`}>
            <div className="font-semibold text-black dark:text-white">{name.slice(0, 3)}</div>
            {info && (
              <>
                <div className={`mt-1 text-[10px] font-semibold ${STATE_STYLES[info.state]}`}>{MONTH_STATE_LABELS[info.state]}</div>
                {!upcoming && info.payableEmployees > 0 && (
                  <div className="mt-0.5 text-[10px] text-gray-500 tabular-nums">
                    {info.approved}/{info.payableEmployees} paid{waiting}
                  </div>
                )}
                {info.approvedNetPay > 0 && <div className="mt-0.5 text-[10px] text-gray-500 tabular-nums">{inrAmount(info.approvedNetPay)}</div>}
              </>
            )}
          </button>
        );
      })}
    </div>
  </section>
);
