import React from 'react';
import { Download, Eye, FileText, Loader2, RefreshCw } from 'lucide-react';
import { useMyPayslips } from '../hooks/usePayrollData';
import { usePayslipFile } from '../hooks/usePayslipFile';
import { payrollApi } from '../api/payrollApi';
import { inrAmount, periodLabel } from '../utils/payroll';
import { formatDate } from '../../finance/utils/period';
import type { MyPayslip } from '../types/payroll.types';

const actionButton =
  'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer disabled:opacity-50 bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/20';
const fileName = (slip: MyPayslip) => `payslip-${slip.payYear}-${String(slip.payMonth).padStart(2, '0')}.pdf`;

const NoPayslips: React.FC<{ isLoading: boolean; loadFailed: boolean; onRetry: () => void }> = ({ isLoading, loadFailed, onRetry }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10 text-gray-400" role="status" aria-label="Loading payslips">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (loadFailed) {
    return (
      <div className="py-10 text-center text-gray-500 space-y-2">
        <p>Your payslips couldn't be loaded.</p>
        <button type="button" onClick={onRetry} className="font-semibold text-black dark:text-white cursor-pointer">Try again</button>
      </div>
    );
  }
  return (
    <div className="py-10 text-center text-gray-500 space-y-2" role="status">
      <FileText className="w-6 h-6 mx-auto text-gray-300" aria-hidden />
      <p>No payslips yet. Your first one appears once a month's salary is confirmed.</p>
    </div>
  );
};

/** The signed-in employee's payslips: one per month whose salary transfer was confirmed, created fresh when opened. */
export const MyPayslipsPage: React.FC = () => {
  const { data, isLoading, loadFailed, refresh } = useMyPayslips();
  const { open, busyKey } = usePayslipFile();
  const slips = data ?? [];

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">My Payslips</h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
            A payslip appears here once your salary for the month is confirmed as transferred. It is also emailed to you.
          </p>
        </div>
        <button type="button" onClick={refresh} disabled={isLoading} aria-label="Refresh payslips"
          className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <section aria-label="Payslips" className="apple-card p-5 text-xs">
        {slips.length === 0 ? (
          <NoPayslips isLoading={isLoading && !data} loadFailed={loadFailed && !data} onRetry={refresh} />        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" aria-label="My payslips">
              <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="pb-2 pr-3 font-semibold">Month</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Earnings</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Deductions</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Net pay</th>
                  <th className="pb-2 pr-3 font-semibold">Paid on</th>
                  <th className="pb-2 font-semibold">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                {slips.map((slip) => {
                  const key = `mine-${slip.id}`;
                  const fetch = (download: boolean) => payrollApi.myPayslip(slip.id, download);
                  return (
                    <tr key={slip.id}>
                      <td className="py-3 pr-3 font-semibold text-black dark:text-white whitespace-nowrap">{periodLabel(slip.payYear, slip.payMonth)}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{inrAmount(slip.totalEarnings)}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{inrAmount(slip.totalDeductions)}</td>
                      <td className="py-3 pr-3 text-right tabular-nums font-semibold text-black dark:text-white">{inrAmount(slip.netPay)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{formatDate(slip.transferDate)}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button type="button" className={actionButton} disabled={busyKey === key}
                            aria-label={`View payslip for ${periodLabel(slip.payYear, slip.payMonth)}`}
                            onClick={() => open(key, fetch, fileName(slip), false)}>
                            {busyKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} View
                          </button>
                          <button type="button" className={actionButton} disabled={busyKey === key}
                            aria-label={`Download payslip for ${periodLabel(slip.payYear, slip.payMonth)}`}
                            onClick={() => open(key, fetch, fileName(slip), true)}>
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
