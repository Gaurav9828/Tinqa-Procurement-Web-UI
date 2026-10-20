import React, { useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDot, FileDown, Loader2, RefreshCw, Search } from 'lucide-react';
import type { Period } from '../types/finance.types';
import type { GstDirection, GstHeads, GstMonth, GstRegisterEntry, GstSource, GstSummary } from '../types/gst.types';
import { useGstRegister, useGstSummary } from '../hooks/useFinanceData';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { financeApi } from '../api/financeApi';
import { rupees, toRupees } from '../utils/money';
import { formatDate, periodLabel, presetPeriod, type PeriodPreset } from '../utils/period';
import { PeriodPicker } from './PeriodPicker';
import { ExportMenu } from './ExportMenu';
import { Pager } from '../../../components/ui/Pager';
import type { FinanceReport, ReportTable } from '../export/report.types';

const PAGE_SIZE = 25;
const selectClass = 'px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs text-black dark:text-white cursor-pointer';
const thClass = 'pb-2 pr-3 font-semibold';
const HEADS: { key: keyof Omit<GstHeads, 'total'>; label: string }[] = [
  { key: 'igst', label: 'IGST' },
  { key: 'cgst', label: 'CGST' },
  { key: 'sgst', label: 'SGST' },
  { key: 'cess', label: 'Cess' },
];
export const GST_SOURCE_LABELS: Record<GstSource, string> = {
  ECOMMERCE_SALE: 'E-commerce sale (tax invoice)',
  ECOMMERCE_CREDIT_NOTE: 'E-commerce credit note (refund)',
  OTHER_SUPPLY: 'Other supply (income voucher)',
  DEALER_PURCHASE: 'Dealer purchase (procurement)',
  EXPENSE_BILL: 'Expense bill (voucher)',
};

const REGISTER_COLUMNS = ['Date', 'Tax period', 'Direction', 'Source', 'Document', 'Document no.', 'Order / voucher', 'Description', 'HSN/SAC',
  'Party', 'GSTIN', 'Place of supply', 'Supply', 'Rate %', 'Taxable (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Cess (₹)', 'Total GST (₹)', 'ITC claimable'];
const registerRow = (e: GstRegisterEntry): (string | number)[] => [
  e.documentDate, e.taxPeriod, e.direction, e.sourceLabel, e.documentType, e.documentNumber ?? '', e.orderReference, e.description,
  e.hsnSac ?? '', e.counterpartyName ?? '', e.counterpartyGstin ?? '',
  e.placeOfSupply ? `${e.placeOfSupply}${e.placeOfSupplyCode ? ` (${e.placeOfSupplyCode})` : ''}` : '',
  e.supplyType === 'INTRA_STATE' ? 'CGST + SGST' : 'IGST', e.gstRate ?? '',
  toRupees(e.taxablePaise), toRupees(e.cgstPaise), toRupees(e.sgstPaise), toRupees(e.igstPaise), toRupees(e.cessPaise), toRupees(e.totalTaxPaise),
  e.direction === 'INPUT' ? (e.itcEligible ? 'Yes' : `No${e.itcNote ? ` — ${e.itcNote}` : ''}`) : '',
];

const MONTH_COLUMNS = ['Tax period', 'Output tax (₹)', 'Eligible ITC (₹)', 'Credit brought forward (₹)', 'Credit used (₹)', 'Payable in cash (₹)',
  'Credit carried forward (₹)', 'Paid to government (₹)', 'GSTR-1 due', 'GSTR-3B due'];
const monthRow = (m: GstMonth): (string | number)[] => [
  m.label, toRupees(m.output.tax), toRupees(m.inputEligible.tax), toRupees(m.openingCredit.total),
  toRupees(m.utilisations.reduce((sum, u) => sum + u.amount, 0)), toRupees(m.cashPayable.total), toRupees(m.closingCredit.total),
  toRupees(m.gstPaid), m.gstr1Due, m.gstr3bDue,
];

const STATUS: Record<GstMonth['status'], { label: string; Icon: typeof CircleDot; tone: string }> = {
  OPEN: { label: 'Month in progress', Icon: CircleDot, tone: 'text-gray-500' },
  TO_FILE: { label: 'To file', Icon: CalendarClock, tone: 'text-amber-600 dark:text-amber-400' },
  PAST_DUE_DATE: { label: 'Past the 3B due date', Icon: AlertTriangle, tone: 'text-rose-600 dark:text-rose-400' },
};

/** Summary report (tables) for PDF / Excel / Word. */
const summaryReport = (summary: GstSummary, period: Period): FinanceReport => {
  const heads = (label: string, h: GstHeads) => [label, ...HEADS.map(({ key }) => toRupees(h[key])), toRupees(h.total)];
  const position: ReportTable = {
    title: 'Position by tax head',
    columns: ['', 'IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'Cess (₹)', 'Total (₹)'],
    rows: [
      ['Output tax (net of credit notes)', toRupees(summary.period.output.igst), toRupees(summary.period.output.cgst),
        toRupees(summary.period.output.sgst), toRupees(summary.period.output.cess), toRupees(summary.period.output.tax)],
      ['Eligible input tax credit', toRupees(summary.period.inputEligible.igst), toRupees(summary.period.inputEligible.cgst),
        toRupees(summary.period.inputEligible.sgst), toRupees(summary.period.inputEligible.cess), toRupees(summary.period.inputEligible.tax)],
      heads('Payable in cash', summary.period.cashPayable),
      heads('Credit carried forward (till date)', summary.tillDate.creditCarriedForward),
    ],
    moneyColumns: [1, 2, 3, 4, 5],
  };
  return {
    title: 'GST position',
    subtitle: `${periodLabel(period)}${summary.gstin ? ` · GSTIN ${summary.gstin}` : ''}`,
    fileName: `gst-${period.from}-to-${period.to}`,
    sections: [
      {
        title: 'Summary',
        headline: [
          { label: 'Output tax', value: rupees(summary.period.output.tax) },
          { label: 'Eligible input tax credit', value: rupees(summary.period.inputEligible.tax) },
          { label: 'Payable in cash', value: rupees(summary.period.cashPayable.total) },
          { label: 'Paid to government', value: rupees(summary.period.gstPaid) },
          { label: 'Outstanding till date', value: rupees(summary.tillDate.outstanding) },
        ],
        tables: [position],
      },
      { title: 'Month by month (GSTR-3B)', tables: [{ columns: MONTH_COLUMNS, rows: summary.months.map(monthRow), moneyColumns: [1, 2, 3, 4, 5, 6, 7] }] },
      {
        title: 'By source',
        tables: [{
          columns: ['Source', 'Direction', 'Documents', 'Taxable (₹)', 'GST (₹)'],
          rows: summary.bySource.map((s) => [s.label, s.direction, s.documents, toRupees(s.taxable), toRupees(s.tax)]),
          moneyColumns: [3, 4],
        }],
      },
      {
        title: 'HSN / SAC summary of outward supplies (GSTR-1 table 12)',
        tables: [{
          columns: ['HSN/SAC', 'Rate %', 'Quantity', 'Taxable (₹)', 'IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'Cess (₹)'],
          rows: summary.hsnSummary.map((h) => [h.hsnSac ?? '—', h.rate ?? '', h.quantity, toRupees(h.taxable), toRupees(h.igst),
            toRupees(h.cgst), toRupees(h.sgst), toRupees(h.cess)]),
          moneyColumns: [3, 4, 5, 6, 7],
        }],
      },
    ],
  };
};

const Tile: React.FC<{ label: string; value: string; note?: React.ReactNode }> = ({ label, value, note }) => (
  <div className="apple-card p-4 min-w-0">
    <p className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400">{label}</p>
    <p className="text-xl font-semibold text-black dark:text-white mt-1 tabular-nums">{value}</p>
    {note && <div className="text-[11px] text-gray-500 dark:text-neutral-400 mt-0.5">{note}</div>}
  </div>
);

/**
 * GST: what was charged to customers (output tax), what was paid to dealers and on bills (input tax, and how much of
 * it is claimable), the set-off month by month in the order the law requires, what is left to pay in cash, what was
 * paid to the government and what is outstanding till date. Every figure comes from the GST register below it.
 */
export const GstPanel: React.FC = () => {
  const [preset, setPreset] = useState<PeriodPreset>('THIS_FY');
  const [period, setPeriod] = useState<Period>(() => presetPeriod('THIS_FY')!);
  const { data: summary, isLoading, loadFailed, refresh } = useGstSummary(period);

  return (
    <div className="space-y-6">
      <section aria-label="GST position" className="apple-card p-5 space-y-4 text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">GST position</h2>
            <p className="text-gray-500 dark:text-neutral-400 mt-0.5 max-w-2xl">
              Output tax is recorded when a tax invoice is issued at dispatch and reduced by credit notes for refunds. Input tax
              is recorded when Admin L2 approves the stock of a dealer purchase, or an expense bill is approved. Each month's input
              tax credit is set off against its output tax (IGST first, CGST never against SGST); the rest is payable in cash with GSTR-3B.
            </p>
            {summary && (
              <p className="text-gray-400 mt-1">
                {summary.gstin ? `GSTIN ${summary.gstin}` : 'No GSTIN on the approved company profile'}
                {summary.state ? ` · ${summary.state}` : ''} · as of {formatDate(summary.asOf)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker preset={preset} period={period} onChange={(p, next) => { setPreset(p); setPeriod(next); }} />
            {summary && <ExportMenu build={() => summaryReport(summary, period)} />}
            <button type="button" onClick={refresh} disabled={isLoading} aria-label="Refresh GST position"
              className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoading && !summary ? (
          <div className="flex justify-center py-10 text-gray-400" role="status" aria-label="Loading GST position"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : loadFailed && !summary ? (
          <div className="py-10 text-center text-gray-500 space-y-2">
            <p>The GST position couldn't be loaded.</p>
            <button type="button" onClick={refresh} className="font-semibold text-black dark:text-white cursor-pointer">Try again</button>
          </div>
        ) : summary ? (
          <GstSummaryView summary={summary} />
        ) : null}
      </section>

      <GstRegisterTable period={period} />
    </div>
  );
};

const GstSummaryView: React.FC<{ summary: GstSummary }> = ({ summary }) => {
  const p = summary.period;
  const till = summary.tillDate;
  const row = (label: string, values: { igst: number; cgst: number; sgst: number; cess: number }, total: number, strong = false) => (
    <tr className={strong ? 'font-semibold text-black dark:text-white' : ''}>
      <td className="py-2 pr-3">{label}</td>
      {HEADS.map(({ key }) => <td key={key} className="py-2 pr-3 text-right tabular-nums">{rupees(values[key])}</td>)}
      <td className="py-2 text-right tabular-nums">{rupees(total)}</td>
    </tr>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="Output tax (charged)" value={rupees(p.output.tax)}
          note={`${p.outputInvoices.documents} invoice(s) · credit notes ${rupees(p.outputCreditNotes.tax)}`} />
        <Tile label="Input tax credit (claimable)" value={rupees(p.inputEligible.tax)}
          note={p.inputIneligible.tax !== 0 ? `${rupees(p.inputIneligible.tax)} paid but not claimable` : 'All GST paid is claimable'} />
        <Tile label="Payable in cash" value={rupees(p.cashPayable.total)} note={`after ${rupees(p.creditUsed)} of credit used`} />
        <Tile label="Paid to government" value={rupees(p.gstPaid)} note="Approved GST payment vouchers" />
        <Tile label="Outstanding till date" value={rupees(till.outstanding)}
          note={till.outstanding > 0 ? 'Still to pay' : till.outstanding < 0 ? 'Paid ahead' : 'Nothing to pay'} />
      </div>

      {summary.notes.length > 0 && (
        <ul className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3 py-2 space-y-1 text-amber-800 dark:text-amber-200" aria-label="GST notes">
          {summary.notes.map((note) => (
            <li key={note} className="flex gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden /> {note}</li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left" aria-label="GST by tax head">
          <caption className="text-left text-[11px] font-semibold text-gray-500 pb-2">By tax head, {periodLabel({ from: summary.from, to: summary.to })}</caption>
          <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
            <tr><th className={thClass}></th>{HEADS.map(({ key, label }) => <th key={key} className={`${thClass} text-right`}>{label}</th>)}<th className="pb-2 font-semibold text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
            {row('Output tax on invoices', p.outputInvoices, p.outputInvoices.tax)}
            {row('Less credit notes (refunds)', p.outputCreditNotes, p.outputCreditNotes.tax)}
            {row('Output tax on other supplies', p.otherSupplies, p.otherSupplies.tax)}
            {row('Output tax (net)', p.output, p.output.tax, true)}
            {row('Eligible input tax credit', p.inputEligible, p.inputEligible.tax)}
            {row('Payable in cash', p.cashPayable, p.cashPayable.total, true)}
            {row('Credit carried forward (till date)', till.creditCarriedForward, till.creditCarriedForward.total)}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left" aria-label="GST month by month">
          <caption className="text-left text-[11px] font-semibold text-gray-500 pb-2">Month by month — what each GSTR-3B carries</caption>
          <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
            <tr>
              <th className={thClass}>Tax period</th>
              <th className={`${thClass} text-right`}>Output tax</th>
              <th className={`${thClass} text-right`}>Eligible ITC</th>
              <th className={`${thClass} text-right`}>Credit b/f</th>
              <th className={`${thClass} text-right`}>Payable in cash</th>
              <th className={`${thClass} text-right`}>Credit c/f</th>
              <th className={`${thClass} text-right`}>Paid</th>
              <th className="pb-2 font-semibold">Returns due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
            {summary.months.map((m) => {
              const status = STATUS[m.status];
              return (
                <tr key={m.period}>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <div className="font-semibold text-black dark:text-white">{m.label}{m.partial ? ' (part)' : ''}</div>
                    <div className={`flex items-center gap-1 ${status.tone}`}><status.Icon className="w-3 h-3" aria-hidden /> {status.label}</div>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{rupees(m.output.tax)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{rupees(m.inputEligible.tax)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{rupees(m.openingCredit.total)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-black dark:text-white"
                    title={m.utilisations.map((u) => `${u.creditHead} credit → ${u.taxHead}: ${rupees(u.amount)}`).join('\n') || 'No credit used'}>
                    {rupees(m.cashPayable.total)}
                    <div className="font-normal text-gray-400">{HEADS.filter(({ key }) => m.cashPayable[key] !== 0).map(({ key, label }) => `${label} ${rupees(m.cashPayable[key])}`).join(' · ')}</div>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{rupees(m.closingCredit.total)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{rupees(m.gstPaid)}</td>
                  <td className="py-2 whitespace-nowrap text-gray-500">GSTR-1 {formatDate(m.gstr1Due)}<br />GSTR-3B {formatDate(m.gstr3bDue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="GST by source">
            <caption className="text-left text-[11px] font-semibold text-gray-500 pb-2">Where the GST came from</caption>
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
              <tr><th className={thClass}>Source</th><th className={`${thClass} text-right`}>Documents</th><th className={`${thClass} text-right`}>Taxable</th><th className="pb-2 font-semibold text-right">GST</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
              {summary.bySource.length === 0 && <tr><td colSpan={4} className="py-3 text-gray-500">No GST in this period.</td></tr>}
              {summary.bySource.map((s) => (
                <tr key={s.source}>
                  <td className="py-2 pr-3">{s.label}<div className="text-gray-400">{s.direction === 'OUTPUT' ? 'Output tax' : 'Input tax'}</div></td>
                  <td className="py-2 pr-3 text-right tabular-nums">{s.documents}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{rupees(s.taxable)}</td>
                  <td className="py-2 text-right tabular-nums">{rupees(s.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="HSN summary">
            <caption className="text-left text-[11px] font-semibold text-gray-500 pb-2">HSN / SAC summary of sales (GSTR-1 table 12)</caption>
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
              <tr><th className={thClass}>HSN/SAC</th><th className={`${thClass} text-right`}>Rate</th><th className={`${thClass} text-right`}>Taxable</th><th className="pb-2 font-semibold text-right">GST</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
              {summary.hsnSummary.length === 0 && <tr><td colSpan={4} className="py-3 text-gray-500">No sales in this period.</td></tr>}
              {summary.hsnSummary.map((h) => (
                <tr key={`${h.hsnSac}-${h.rate}`}>
                  <td className="py-2 pr-3">{h.hsnSac ?? 'Not given'}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{h.rate === null ? '—' : `${h.rate}%`}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{rupees(h.taxable)}</td>
                  <td className="py-2 text-right tabular-nums">{rupees(h.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/** Every GST row of the period: which order or voucher it belongs to, the document, the party and each tax head. */
const GstRegisterTable: React.FC<{ period: Period }> = ({ period }) => {
  const { can } = useAccess();
  const notify = useNotify();
  const [direction, setDirection] = useState<GstDirection | ''>('');
  const [source, setSource] = useState<GstSource | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [csvBusy, setCsvBusy] = useState(false);
  const { term, pending, flush } = useSearchTerm(search);
  const { data, isLoading, loadFailed, refresh } = useGstRegister({
    ...period, direction: direction || undefined, source: source || undefined, search: term || undefined, page, size: PAGE_SIZE,
  }, !pending);

  const loadAll = async () => {
    const res = await financeApi.exportGstRegister(period);
    if (!res.success) throw res;
    return res.data;
  };
  const exportCsv = async () => {
    setCsvBusy(true);
    try {
      const { exportCsv: toCsv } = await import('../export/exportExcel');
      toCsv(`gst-register-${period.from}-to-${period.to}`, REGISTER_COLUMNS, (await loadAll()).map(registerRow));
    } catch (err: unknown) {
      notify.error(err, 'The GST register could not be exported.');
    } finally {
      setCsvBusy(false);
    }
  };
  const buildReport = async (): Promise<FinanceReport> => ({
    title: 'GST register',
    subtitle: periodLabel(period),
    fileName: `gst-register-${period.from}-to-${period.to}`,
    sections: [{ title: 'GST register', tables: [{ columns: REGISTER_COLUMNS, rows: (await loadAll()).map(registerRow), moneyColumns: [14, 15, 16, 17, 18, 19] }] }],
  });
  const rows = data?.content ?? [];

  return (
    <section aria-label="GST register" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white">GST register</h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-0.5 max-w-2xl">
            One row per document line, with the order or voucher it belongs to. Rows are never edited: credit notes and reversals are negative rows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('FINANCE_REPORT_EXPORT') && (
            <button type="button" onClick={exportCsv} disabled={csvBusy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white font-semibold cursor-pointer disabled:opacity-60">
              {csvBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} CSV
            </button>
          )}
          <ExportMenu build={buildReport} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input aria-label="Search GST register" value={search} placeholder="Invoice, order, party, GSTIN…"
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            onKeyDown={(e) => e.key === 'Enter' && flush()}
            className="pl-8 pr-3 py-2 w-64 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-black dark:text-white" />
        </label>
        <select aria-label="Direction" className={selectClass} value={direction} onChange={(e) => { setDirection(e.target.value as GstDirection | ''); setPage(0); }}>
          <option value="" className="bg-white dark:bg-[#1c1c1e]">Output and input</option>
          <option value="OUTPUT" className="bg-white dark:bg-[#1c1c1e]">Output tax (we charged)</option>
          <option value="INPUT" className="bg-white dark:bg-[#1c1c1e]">Input tax (we paid)</option>
        </select>
        <select aria-label="Source" className={selectClass} value={source} onChange={(e) => { setSource(e.target.value as GstSource | ''); setPage(0); }}>
          <option value="" className="bg-white dark:bg-[#1c1c1e]">All sources</option>
          {(Object.keys(GST_SOURCE_LABELS) as GstSource[]).map((s) => <option key={s} value={s} className="bg-white dark:bg-[#1c1c1e]">{GST_SOURCE_LABELS[s]}</option>)}
        </select>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-10 text-gray-400" role="status" aria-label="Loading GST register"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : loadFailed && !data ? (
        <div className="py-10 text-center text-gray-500 space-y-2">
          <p>The GST register couldn't be loaded.</p>
          <button type="button" onClick={refresh} className="font-semibold text-black dark:text-white cursor-pointer">Try again</button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-gray-500" role="status">No GST recorded in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="GST register rows">
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className={thClass}>Date</th>
                <th className={thClass}>Document</th>
                <th className={thClass}>Party</th>
                <th className={`${thClass} text-right`}>Taxable</th>
                <th className={`${thClass} text-right`}>CGST + SGST</th>
                <th className={`${thClass} text-right`}>IGST</th>
                <th className="pb-2 font-semibold text-right">Total GST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 pr-3 whitespace-nowrap">{formatDate(e.documentDate)}<div className="text-gray-400">{e.direction === 'OUTPUT' ? 'Output' : 'Input'}</div></td>
                  <td className="py-3 pr-3 max-w-md">
                    <div className="font-semibold text-black dark:text-white break-words">{e.description}</div>
                    <div className="text-gray-500">{e.sourceLabel} · {e.documentNumber ?? 'no document number'} · {e.orderReference}</div>
                    <div className="text-gray-400">
                      {[e.hsnSac && `HSN ${e.hsnSac}`, e.gstRate !== null && `${e.gstRate}%`, e.placeOfSupply && `POS ${e.placeOfSupply}${e.placeOfSupplyCode ? ` (${e.placeOfSupplyCode})` : ''}`].filter(Boolean).join(' · ')}
                    </div>
                    {e.direction === 'INPUT' && (
                      <div className={`flex items-center gap-1 ${e.itcEligible ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {e.itcEligible ? <CheckCircle2 className="w-3 h-3" aria-hidden /> : <AlertTriangle className="w-3 h-3" aria-hidden />}
                        {e.itcEligible ? 'Input tax credit claimable' : e.itcNote ?? 'Not claimable'}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-3">{e.counterpartyName ?? '—'}<div className="text-gray-400">{e.counterpartyGstin ?? 'No GSTIN'}</div></td>
                  <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">{rupees(e.taxablePaise)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">{e.supplyType === 'INTRA_STATE' ? `${rupees(e.cgstPaise)} + ${rupees(e.sgstPaise)}` : '—'}</td>
                  <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">{e.supplyType === 'INTER_STATE' ? rupees(e.igstPaise) : '—'}</td>
                  <td className="py-3 text-right tabular-nums whitespace-nowrap font-semibold text-black dark:text-white">
                    {rupees(e.totalTaxPaise)}{e.cessPaise !== 0 && <div className="font-normal text-gray-400">incl. cess {rupees(e.cessPaise)}</div>}
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
