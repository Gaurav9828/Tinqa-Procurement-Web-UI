import React, { useState } from 'react';
import { FileDown, Loader2, RefreshCw, Search } from 'lucide-react';
import type { LedgerEntry, LedgerSource, PnlSection, Period } from '../types/finance.types';
import { useLedger } from '../hooks/useFinanceData';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { financeApi } from '../api/financeApi';
import { rupees, signTone, toRupees } from '../utils/money';
import { formatDate, periodLabel, presetPeriod, type PeriodPreset } from '../utils/period';
import { SECTION_ORDER, SOURCE_LABELS } from '../utils/metrics';
import { PeriodPicker } from './PeriodPicker';
import { ExportMenu } from './ExportMenu';
import { Pager } from '../../../components/ui/Pager';
import type { FinanceReport } from '../export/report.types';

const PAGE_SIZE = 25;
const selectClass = 'px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs text-black dark:text-white cursor-pointer';
const SECTION_LABELS: Record<PnlSection, string> = {
  REVENUE: 'Revenue',
  DIRECT_COSTS: 'Direct costs',
  OPERATING_EXPENSES: 'Operating expenses',
  DEPRECIATION_AMORTIZATION: 'Depreciation & amortization',
  OTHER_INCOME: 'Other income',
  INTEREST: 'Interest',
  TAX: 'Tax',
  NONE: 'Assets, capital & loans',
};

const LEDGER_COLUMNS = ['Date', 'Entry', 'Category', 'Description', 'Reference', 'Party', 'Source', 'Amount (₹)', 'Balance after (₹)', 'Posted by'];
const ledgerRow = (e: LedgerEntry): (string | number)[] => [
  e.occurredOn,
  `#${e.id}`,
  e.categoryLabel,
  e.description + (e.cashImpact ? '' : ' (non-cash)'),
  e.reference ?? '',
  e.counterparty ?? '',
  SOURCE_LABELS[e.sourceType] ?? e.sourceType,
  toRupees(e.amountPaise),
  toRupees(e.balanceAfterPaise),
  e.postedBy,
];

/** Every money move of the company account, newest first. Entries are never edited; corrections are reversals. */
export const LedgerPanel: React.FC = () => {
  const { can } = useAccess();
  const notify = useNotify();
  const [preset, setPreset] = useState<PeriodPreset>('THIS_MONTH');
  const [period, setPeriod] = useState<Period>(() => presetPeriod('THIS_MONTH')!);
  const [section, setSection] = useState<PnlSection | ''>('');
  const [source, setSource] = useState<LedgerSource | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [csvBusy, setCsvBusy] = useState(false);
  const { term: searchTerm, pending: searchPending, flush: searchNow } = useSearchTerm(search);
  const { data, isLoading, loadFailed, refresh } = useLedger({
    ...period,
    section: section || undefined,
    source: source || undefined,
    search: searchTerm || undefined,
    page,
    size: PAGE_SIZE,
  }, !searchPending);

  const loadAll = async () => {
    const res = await financeApi.exportLedger(period);
    if (!res.success) throw res;
    return res.data;
  };

  const buildReport = async (): Promise<FinanceReport> => ({
    title: 'Company account ledger',
    subtitle: periodLabel(period),
    fileName: `ledger-${period.from}-to-${period.to}`,
    sections: [{ title: 'Ledger entries', tables: [{ columns: LEDGER_COLUMNS, rows: (await loadAll()).map(ledgerRow), moneyColumns: [7, 8] }] }],
  });

  const exportCsv = async () => {
    setCsvBusy(true);
    try {
      const { exportCsv: toCsv } = await import('../export/exportExcel');
      toCsv(`ledger-${period.from}-to-${period.to}`, LEDGER_COLUMNS, (await loadAll()).map(ledgerRow));
    } catch (err: unknown) {
      notify.error(err, 'The ledger could not be exported.');
    } finally {
      setCsvBusy(false);
    }
  };

  const rows = data?.content ?? [];

  return (
    <section aria-label="Ledger" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white">Ledger</h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-0.5 max-w-2xl">
            Every rupee in and out, in the order it was posted. Entries are never edited or deleted — a mistake is corrected by a reversing entry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker preset={preset} period={period} onChange={(p, next) => { setPreset(p); setPeriod(next); setPage(0); }} />
          {can('FINANCE_REPORT_EXPORT') && (
            <button type="button" onClick={exportCsv} disabled={csvBusy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white font-semibold cursor-pointer disabled:opacity-60">
              {csvBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} CSV
            </button>
          )}
          <ExportMenu build={buildReport} />
          <button type="button" onClick={refresh} disabled={isLoading} aria-label="Refresh ledger"
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input aria-label="Search ledger" value={search} placeholder="Search description, order, party…"
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            onKeyDown={(e) => e.key === 'Enter' && searchNow()}
            className="pl-8 pr-3 py-2 w-64 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-black dark:text-white" />
        </label>
        <select aria-label="Section" className={selectClass} value={section} onChange={(e) => { setSection(e.target.value as PnlSection | ''); setPage(0); }}>
          <option value="" className="bg-white dark:bg-[#1c1c1e]">All sections</option>
          {SECTION_ORDER.map((s) => <option key={s} value={s} className="bg-white dark:bg-[#1c1c1e]">{SECTION_LABELS[s]}</option>)}
        </select>
        <select aria-label="Source" className={selectClass} value={source} onChange={(e) => { setSource(e.target.value as LedgerSource | ''); setPage(0); }}>
          <option value="" className="bg-white dark:bg-[#1c1c1e]">All sources</option>
          {(Object.keys(SOURCE_LABELS) as LedgerSource[]).map((s) => <option key={s} value={s} className="bg-white dark:bg-[#1c1c1e]">{SOURCE_LABELS[s]}</option>)}
        </select>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-10 text-gray-400" role="status" aria-label="Loading ledger"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : loadFailed && !data ? (
        <div className="py-10 text-center text-gray-500 space-y-2">
          <p>The ledger couldn't be loaded.</p>
          <button type="button" onClick={refresh} className="font-semibold text-black dark:text-white cursor-pointer">Try again</button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-gray-500" role="status">No entries in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Ledger entries">
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="pb-2 pr-3 font-semibold">Date</th>
                <th className="pb-2 pr-3 font-semibold">Entry</th>
                <th className="pb-2 pr-3 font-semibold">Source</th>
                <th className="pb-2 pr-3 font-semibold text-right">Amount</th>
                <th className="pb-2 font-semibold text-right">Balance after</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
              {rows.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {formatDate(entry.occurredOn)}
                    <div className="text-gray-400">#{entry.id}</div>
                  </td>
                  <td className="py-3 pr-3 max-w-md">
                    <div className="font-semibold text-black dark:text-white break-words">{entry.description}</div>
                    <div className="text-gray-500">
                      {entry.categoryLabel}
                      {!entry.cashImpact && ' · non-cash'}
                      {entry.reversesEntryId && ` · reverses #${entry.reversesEntryId}`}
                    </div>
                    {(entry.counterparty || entry.reference) && (
                      <div className="text-gray-400">{[entry.counterparty, entry.reference].filter(Boolean).join(' · ')}</div>
                    )}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {SOURCE_LABELS[entry.sourceType] ?? entry.sourceType}
                    <div className="text-gray-400">{entry.postedBy}</div>
                  </td>
                  <td className={`py-3 pr-3 text-right whitespace-nowrap font-semibold tabular-nums ${signTone(entry.amountPaise)}`}>
                    {entry.amountPaise > 0 ? '+' : ''}{rupees(entry.amountPaise)}
                  </td>
                  <td className={`py-3 text-right whitespace-nowrap tabular-nums ${entry.balanceAfterPaise < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'}`}>
                    {rupees(entry.balanceAfterPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} totalPages={data?.totalPages ?? 0} disabled={isLoading} onPage={setPage} />
    </section>
  );
};
