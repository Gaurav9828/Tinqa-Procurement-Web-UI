import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import type { CategoryTotal, FinanceOverview, PnlSection, Period, TrendPoint } from '../types/finance.types';
import { useFinanceOverview } from '../hooks/useFinanceData';
import { useNotify } from '../../../hooks/useNotify';
import { financeApi } from '../api/financeApi';
import { compactRupees, percent, rupees, toRupees } from '../utils/money';
import { formatDate, periodLabel, presetPeriod, type PeriodPreset } from '../utils/period';
import { METRICS, TREND_COLUMNS, pnlRows, type MetricDefinition } from '../utils/metrics';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { LineChart } from '../charts/LineChart';
import { ColumnChart } from '../charts/ColumnChart';
import { DonutChart } from '../charts/DonutChart';
import { WaterfallChart } from '../charts/WaterfallChart';
import { Sparkline } from '../charts/Sparkline';
import { PeriodPicker } from './PeriodPicker';
import { ExportMenu } from './ExportMenu';
import { MetricCard } from './MetricCard';
import type { FinanceReport, ReportSection, ReportTable } from '../export/report.types';

const tone = (paise: number) => (paise < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white');

const trendTable = (trend: TrendPoint[], keys: (keyof TrendPoint)[]): ReportTable => ({
  columns: ['Period', ...keys.map((k) => TREND_COLUMNS.find((c) => c.key === k)?.label ?? String(k))],
  rows: trend.map((p) => [p.label, ...keys.map((k) => toRupees(Number(p[k])))]),
  moneyColumns: keys.map((_, i) => i + 1),
});

const categoryTable = (categories: CategoryTotal[]): ReportTable => ({
  columns: ['Category', 'Amount (₹)'],
  rows: categories.map((c) => [c.label, toRupees(Math.abs(c.amount))]),
  moneyColumns: [1],
});

const inSection = (categories: CategoryTotal[], ...sections: PnlSection[]) =>
  categories.filter((c) => sections.includes(c.section) && c.amount !== 0);

const slices = (categories: CategoryTotal[]) => categories.map((c) => ({ key: c.category, label: c.label, value: Math.abs(c.amount) }));

/** The super admin's view of the business: every figure for the period, each with its chart, table and export. */
export const OverviewPanel: React.FC = () => {
  const [preset, setPreset] = useState<PeriodPreset>('LAST_6_MONTHS');
  const [period, setPeriod] = useState<Period>(() => presetPeriod('LAST_6_MONTHS')!);
  const { data, isLoading, loadFailed, refresh } = useFinanceOverview(period);

  if (!data) {
    return (
      <div className="apple-card p-10 flex flex-col items-center gap-3 text-xs text-gray-500">
        {isLoading || !loadFailed ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" aria-label="Loading overview" />
        ) : (
          <>
            <p>The finance overview couldn't be loaded.</p>
            <button type="button" onClick={refresh} className="font-semibold text-black dark:text-white cursor-pointer">Try again</button>
          </>
        )}
      </div>
    );
  }
  return (
    <Dashboard
      data={data}
      period={period}
      preset={preset}
      isLoading={isLoading}
      refresh={refresh}
      onPeriod={(p, next) => {
        setPreset(p);
        setPeriod(next);
      }}
    />
  );
};

const Dashboard: React.FC<{
  data: FinanceOverview;
  period: Period;
  preset: PeriodPreset;
  isLoading: boolean;
  refresh: () => void;
  onPeriod: (preset: PeriodPreset, period: Period) => void;
}> = ({ data, period, preset, isLoading, refresh, onPeriod }) => {
  const notify = useNotify();
  const [syncing, setSyncing] = useState(false);
  const subtitle = periodLabel(period);
  const { profitAndLoss: pnl, cashFlow, burn, workingCapital: wc, trend, categories, account } = data;
  const labels = trend.map((p) => p.label);
  const series = (key: keyof TrendPoint) => trend.map((p) => Number(p[key]));

  // The live charts, found when an export runs (each carries data-export-id)
  const charts = (...keys: string[]) =>
    keys.map((k) => document.querySelector<SVGSVGElement>(`svg[data-export-id="${k}"]`));

  const revenueCats = inSection(categories, 'REVENUE');
  const directCats = inSection(categories, 'DIRECT_COSTS');
  const opexCats = inSection(categories, 'OPERATING_EXPENSES');
  const daCats = inSection(categories, 'DEPRECIATION_AMORTIZATION');
  const belowCats = inSection(categories, 'OTHER_INCOME', 'INTEREST', 'TAX');
  const cashOutCats = categories.filter((c) => c.cash < 0);
  const cashInCats = categories.filter((c) => c.cash > 0);

  // Built only when an export runs: that is when the live charts are read
  const buildSections = () => {
    const make = (metric: MetricDefinition, headline: { label: string; value: string }[], chartKeys: string[], tables: ReportTable[]) =>
      (): ReportSection => ({ title: metric.title, definition: metric.definition, formula: metric.formula, headline, charts: charts(...chartKeys), tables });
    return {
      pnl: (): ReportSection => ({
        title: 'Profit & loss statement',
        definition: 'Revenue down to net profit for the period.',
        charts: charts('waterfall'),
        tables: [{ columns: ['Line', 'Amount (₹)', 'Margin'], rows: pnlRows(pnl).map((r) => [r.label, toRupees(r.amount), 'margin' in r ? percent(r.margin) : '']), moneyColumns: [1] }],
      }),
      revenue: make(METRICS.revenue, [{ label: 'Revenue', value: rupees(pnl.revenue) }, { label: 'Gross sales', value: rupees(pnl.grossSales) }, { label: 'Refunds', value: rupees(pnl.refunds) }],
        ['revenueTrend', 'revenueMix'], [trendTable(trend, ['grossSales', 'refunds', 'revenue']), categoryTable(revenueCats)]),
      directCosts: make(METRICS.directCosts, [{ label: 'Direct costs', value: rupees(pnl.directCosts) }],
        ['directTrend', 'directMix'], [trendTable(trend, ['directCosts']), categoryTable(directCats)]),
      grossProfit: make(METRICS.grossProfit, [{ label: 'Gross profit', value: rupees(pnl.grossProfit) }, { label: 'Gross margin', value: percent(pnl.grossMarginPct) }],
        ['grossTrend'], [trendTable(trend, ['revenue', 'directCosts', 'grossProfit'])]),
      opex: make(METRICS.operatingExpenses, [{ label: 'Operating expenses', value: rupees(pnl.operatingExpenses) }],
        ['opexTrend', 'opexMix'], [trendTable(trend, ['operatingExpenses']), categoryTable(opexCats)]),
      ebitda: make(METRICS.ebitda, [{ label: 'EBITDA', value: rupees(pnl.ebitda) }, { label: 'EBITDA margin', value: percent(pnl.ebitdaMarginPct) }],
        ['ebitdaTrend'], [trendTable(trend, ['grossProfit', 'operatingExpenses', 'ebitda'])]),
      ebit: make(METRICS.ebit, [{ label: 'EBIT', value: rupees(pnl.ebit) }, { label: 'Depreciation & amortization', value: rupees(pnl.depreciationAmortization) }],
        ['ebitTrend', 'daMix'], [trendTable(trend, ['ebitda', 'depreciationAmortization', 'ebit']), categoryTable(daCats)]),
      pbt: make(METRICS.pbt, [{ label: 'PBT', value: rupees(pnl.pbt) }, { label: 'Other income', value: rupees(pnl.otherIncome) }, { label: 'Interest', value: rupees(pnl.interest) }],
        ['pbtTrend', 'belowMix'], [trendTable(trend, ['ebit', 'otherIncome', 'interest', 'pbt']), categoryTable(belowCats)]),
      pat: make(METRICS.pat, [{ label: 'PAT', value: rupees(pnl.pat) }, { label: 'Net margin', value: percent(pnl.netMarginPct) }],
        ['patTrend'], [trendTable(trend, ['pbt', 'tax', 'pat'])]),
      cash: make(METRICS.cashFlow, [
        { label: 'Opening balance', value: rupees(cashFlow.openingBalance) },
        { label: 'Cash in', value: rupees(cashFlow.cashIn) },
        { label: 'Cash out', value: rupees(cashFlow.cashOut) },
        { label: 'Closing balance', value: rupees(cashFlow.closingBalance) },
        { label: 'Operating / investing / financing', value: `${rupees(cashFlow.operating)} / ${rupees(cashFlow.investing)} / ${rupees(cashFlow.financing)}` },
      ], ['cashTrend', 'balanceTrend', 'cashOutMix'], [trendTable(trend, ['cashIn', 'cashOut', 'netCashFlow', 'closingBalance']), categoryTable(cashOutCats)]),
      burn: make(METRICS.burn, [
        { label: 'Monthly burn', value: rupees(burn.monthlyBurn) },
        { label: 'Runway', value: burn.runwayMonths === null ? (burn.cashPositive ? 'Cash-flow positive' : '—') : `${burn.runwayMonths} months` },
      ], ['burnTrend'], [trendTable(trend, ['netCashFlow', 'closingBalance'])]),
      wc: make(METRICS.workingCapital, [
        { label: 'Working capital', value: rupees(wc.workingCapital) },
        { label: 'Cash', value: rupees(wc.cash) },
        { label: 'Refunds owed', value: rupees(wc.pendingRefunds) },
      ], ['wcMix'], [{ columns: ['Item', 'Amount (₹)'], rows: [['Cash (current assets)', toRupees(wc.cash)], ['Refunds owed to customers', toRupees(wc.pendingRefunds)], ['Working capital', toRupees(wc.workingCapital)]], moneyColumns: [1] }]),
    };
  };

  const fullReport = (): FinanceReport => {
    const sections = buildSections();
    return {
    title: 'Business finance report',
    subtitle,
    fileName: `finance-report-${period.from}-to-${period.to}`,
    sections: [
      {
        title: METRICS.balance.title,
        definition: METRICS.balance.definition,
        headline: [
          { label: 'Balance now', value: rupees(account.balancePaise) },
          { label: 'Entries', value: String(account.entryCount) },
          { label: 'Books balanced', value: data.integrity.balanced ? 'Yes' : 'NO — check the ledger' },
        ],
      },
      sections.pnl(),
      sections.revenue(),
      sections.directCosts(),
      sections.grossProfit(),
      sections.opex(),
      sections.ebitda(),
      sections.ebit(),
      sections.pbt(),
      sections.pat(),
      sections.cash(),
      sections.burn(),
      sections.wc(),
      { title: 'All categories', tables: [{ columns: ['Category', 'Section', 'Amount (₹)', 'Cash (₹)'], rows: categories.map((c) => [c.label, c.section, toRupees(c.amount), toRupees(c.cash)]), moneyColumns: [2, 3] }] },
    ],
    };
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const res = await financeApi.syncProcurement();
      notify.success(res.message || 'Dealer purchases are up to date.');
      refresh();
    } catch (err: unknown) {
      notify.error(err, 'Dealer purchases could not be read from Procurement.');
      refresh();
    } finally {
      setSyncing(false);
    }
  };

  const waterfall = [
    { label: 'Gross sales', value: pnl.grossSales },
    { label: 'Refunds', value: -pnl.refunds },
    { label: 'Revenue', value: pnl.revenue, total: true },
    { label: 'Direct costs', value: -pnl.directCosts },
    { label: 'Gross profit', value: pnl.grossProfit, total: true },
    { label: 'Operating exp.', value: -pnl.operatingExpenses },
    { label: 'EBITDA', value: pnl.ebitda, total: true },
    { label: 'D&A', value: -pnl.depreciationAmortization },
    { label: 'EBIT', value: pnl.ebit, total: true },
    { label: 'Other income', value: pnl.otherIncome },
    { label: 'Interest', value: -pnl.interest },
    { label: 'PBT', value: pnl.pbt, total: true },
    { label: 'Tax', value: -pnl.tax },
    { label: 'PAT', value: pnl.pat, total: true },
  ];

  const sync = data.procurementSync;
  const metricProps = { reportSubtitle: subtitle };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <PeriodPicker preset={preset} period={period} firstEntryOn={account.firstEntryOn} onChange={onPeriod} />
        <div className="flex items-center gap-2">
          <ExportMenu label="Export full report" build={fullReport} />
          <button type="button" onClick={refresh} disabled={isLoading} aria-label="Refresh overview"
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hero: the account */}
      <section aria-label="Company account" className="apple-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400">{account.name} · balance now</p>
          <p className={`text-5xl font-semibold tracking-tight ${tone(account.balancePaise)}`}>{rupees(account.balancePaise)}</p>
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            {account.balancePaise < 0 ? 'More has gone out than come in so far. ' : ''}
            Started at ₹0{account.firstEntryOn ? ` · first entry ${formatDate(account.firstEntryOn)}` : ''} · {account.entryCount} entries
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px]">
            {data.integrity.balanced ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Books balanced: balance matches every entry
              </span>
            ) : (
              <span role="alert" className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> Balance {rupees(data.integrity.accountBalance)} ≠ entries {rupees(data.integrity.ledgerCashTotal)}
              </span>
            )}
            {data.pending.vouchers > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
                <Clock className="w-3.5 h-3.5" /> {data.pending.vouchers} awaiting approval ({compactRupees(data.pending.expensePaise)}, not counted yet)
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-2">
          <Sparkline values={series('closingBalance')} width={220} height={56} label="Balance over the period" />
          <div className="text-[11px] text-gray-500 dark:text-neutral-400 flex items-center gap-2">
            {sync?.lastError ? (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400" title={sync.lastError}>
                <AlertTriangle className="w-3.5 h-3.5" /> Dealer purchase sync failing
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                Dealer purchases synced {sync?.lastSuccessAt ? formatDateTime(sync.lastSuccessAt) : 'never'}
              </span>
            )}
            <button type="button" onClick={syncNow} disabled={syncing}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 font-semibold text-black dark:text-white cursor-pointer disabled:opacity-60">
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sync now
            </button>
          </div>
        </div>
      </section>

      {/* Headline tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3" aria-label="Key figures">
        {[
          { label: 'Revenue', value: pnl.revenue, note: `Refunds ${compactRupees(pnl.refunds)}` },
          { label: 'Gross profit', value: pnl.grossProfit, note: `Margin ${percent(pnl.grossMarginPct)}` },
          { label: 'EBITDA', value: pnl.ebitda, note: `Margin ${percent(pnl.ebitdaMarginPct)}` },
          { label: 'PAT (net profit)', value: pnl.pat, note: `Margin ${percent(pnl.netMarginPct)}` },
          { label: 'Monthly burn', value: -burn.monthlyBurn, note: burn.cashPositive ? 'Cash-flow positive' : burn.runwayMonths !== null ? `Runway ${burn.runwayMonths} months` : 'No runway left', display: burn.monthlyBurn ? compactRupees(burn.monthlyBurn) : '₹0' },
          { label: 'Working capital', value: wc.workingCapital, note: `Owed ${compactRupees(wc.currentLiabilities)}` },
        ].map((tile) => (
          <div key={tile.label} className="apple-card p-4">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400">{tile.label}</p>
            <p className={`text-xl font-semibold mt-1 ${tone(tile.value)}`} title={rupees(tile.value)}>{tile.display ?? compactRupees(tile.value)}</p>
            <p className="text-[11px] text-gray-500 dark:text-neutral-400 mt-0.5">{tile.note}</p>
          </div>
        ))}
      </div>

      {/* Profit & loss */}
      <section aria-label="Profit and loss" className="apple-card p-5 space-y-4 text-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">Profit & loss — {subtitle}</h2>
            <p className="text-gray-500 dark:text-neutral-400 mt-0.5">From what customers paid down to what the business keeps. Blue adds, red takes away, gray is a subtotal.</p>
          </div>
          <ExportMenu compact label="Export profit & loss" build={() => ({ title: 'Profit & loss statement', subtitle, fileName: `profit-and-loss-${period.from}-to-${period.to}`, sections: [buildSections().pnl()] })} />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 min-w-0">
            <WaterfallChart title="Profit and loss waterfall" steps={waterfall} exportId="waterfall" />
          </div>
          <table className="xl:col-span-2 w-full text-xs" aria-label="Profit and loss statement">
            <tbody>
              {pnlRows(pnl).map((row) => (
                <tr key={row.label} className={row.kind === 'line' ? 'text-gray-600 dark:text-gray-300' : 'font-semibold text-black dark:text-white border-t border-black/10 dark:border-white/10'}>
                  <td className={`py-1.5 ${row.kind === 'line' ? 'pl-3' : ''} ${row.kind === 'grand' ? 'text-sm' : ''}`}>{row.label}</td>
                  <td className={`py-1.5 text-right tabular-nums ${row.kind !== 'line' ? tone(row.amount) : ''}`}>{rupees(row.amount)}</td>
                  <td className="py-1.5 pl-3 text-right text-gray-400 w-16">{'margin' in row ? percent(row.margin) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MetricCard {...metricProps} metric={METRICS.revenue} value={rupees(pnl.revenue)} valueTone={tone(pnl.revenue)}
          note={`Gross sales ${compactRupees(pnl.grossSales)} · refunds ${compactRupees(pnl.refunds)}`}
          table={trendTable(trend, ['grossSales', 'refunds', 'revenue'])} section={() => buildSections().revenue()}>
          <LineChart title="Revenue over time" labels={labels} exportId="revenueTrend" series={[
            { key: 'gross', label: 'Gross sales', slot: 0, values: series('grossSales') },
            { key: 'refunds', label: 'Refunds', slot: 1, values: series('refunds') },
            { key: 'revenue', label: 'Revenue', slot: 2, values: series('revenue') },
          ]} />
          <DonutChart title="Revenue mix" centerLabel="money in & out" slices={slices(revenueCats)} exportId="revenueMix" />
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.directCosts} value={rupees(pnl.directCosts)}
          note="Raw materials & dealer purchases, consumables, labour, factory overheads, packaging"
          table={categoryTable(directCats)} section={() => buildSections().directCosts()}>
          <ColumnChart title="Direct costs over time" labels={labels} exportId="directTrend"
            series={[{ key: 'direct', label: 'Direct costs', slot: 1, values: series('directCosts') }]} />
          <DonutChart title="Direct cost mix" centerLabel="direct costs" slices={slices(directCats)} exportId="directMix" />
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.grossProfit} value={rupees(pnl.grossProfit)} valueTone={tone(pnl.grossProfit)}
          note={`Gross margin ${percent(pnl.grossMarginPct)}`} table={trendTable(trend, ['revenue', 'directCosts', 'grossProfit'])} section={() => buildSections().grossProfit()}>
          <ColumnChart title="Gross profit over time" labels={labels} polarity exportId="grossTrend"
            series={[{ key: 'gp', label: 'Gross profit', slot: 0, values: series('grossProfit') }]} />
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.operatingExpenses} value={rupees(pnl.operatingExpenses)}
          note="Shipping, salaries, rent, utilities, office, travel, marketing…" table={categoryTable(opexCats)} section={() => buildSections().opex()}>
          <ColumnChart title="Operating expenses over time" labels={labels} exportId="opexTrend"
            series={[{ key: 'opex', label: 'Operating expenses', slot: 3, values: series('operatingExpenses') }]} />
          <DonutChart title="Operating expense mix" centerLabel="operating expenses" slices={slices(opexCats)} exportId="opexMix" />
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.ebitda} value={rupees(pnl.ebitda)} valueTone={tone(pnl.ebitda)}
          note={`EBITDA margin ${percent(pnl.ebitdaMarginPct)}`} table={trendTable(trend, ['grossProfit', 'operatingExpenses', 'ebitda'])} section={() => buildSections().ebitda()}>
          <ColumnChart title="EBITDA over time" labels={labels} polarity exportId="ebitdaTrend"
            series={[{ key: 'ebitda', label: 'EBITDA', slot: 0, values: series('ebitda') }]} />
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.ebit} value={rupees(pnl.ebit)} valueTone={tone(pnl.ebit)}
          note={`After ${compactRupees(pnl.depreciationAmortization)} depreciation & amortization · margin ${percent(pnl.ebitMarginPct)}`}
          table={trendTable(trend, ['ebitda', 'depreciationAmortization', 'ebit'])} section={() => buildSections().ebit()}>
          <ColumnChart title="EBIT over time" labels={labels} polarity exportId="ebitTrend"
            series={[{ key: 'ebit', label: 'EBIT', slot: 0, values: series('ebit') }]} />
          <DonutChart title="Depreciation and amortization" centerLabel="non-cash D&A" slices={slices(daCats)} exportId="daMix" />
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.pbt} value={rupees(pnl.pbt)} valueTone={tone(pnl.pbt)}
          note={`Other income ${compactRupees(pnl.otherIncome)} · interest ${compactRupees(pnl.interest)}`}
          table={trendTable(trend, ['ebit', 'otherIncome', 'interest', 'pbt'])} section={() => buildSections().pbt()}>
          <ColumnChart title="PBT over time" labels={labels} polarity exportId="pbtTrend"
            series={[{ key: 'pbt', label: 'PBT', slot: 0, values: series('pbt') }]} />
          <DonutChart title="Below operating profit" centerLabel="income, interest, tax" slices={slices(belowCats)} exportId="belowMix" />
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.pat} value={rupees(pnl.pat)} valueTone={tone(pnl.pat)}
          note={`Net margin ${percent(pnl.netMarginPct)} · tax ${compactRupees(pnl.tax)}`} table={trendTable(trend, ['pbt', 'tax', 'pat'])} section={() => buildSections().pat()}>
          <ColumnChart title="PAT over time" labels={labels} polarity exportId="patTrend"
            series={[{ key: 'pat', label: 'PAT', slot: 0, values: series('pat') }]} />
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.cashFlow} value={rupees(cashFlow.netCashFlow)} valueTone={tone(cashFlow.netCashFlow)}
          note={`In ${compactRupees(cashFlow.cashIn)} · out ${compactRupees(cashFlow.cashOut)} · operating ${compactRupees(cashFlow.operating)} · investing ${compactRupees(cashFlow.investing)} · financing ${compactRupees(cashFlow.financing)}`}
          table={trendTable(trend, ['cashIn', 'cashOut', 'netCashFlow', 'closingBalance'])} section={() => buildSections().cash()}>
          <ColumnChart title="Cash in and out" labels={labels} exportId="cashTrend" series={[
            { key: 'in', label: 'Cash in', slot: 0, values: series('cashIn') },
            { key: 'out', label: 'Cash out', slot: 1, values: series('cashOut') },
          ]} />
          <LineChart title="Account balance" labels={labels} area exportId="balanceTrend"
            series={[{ key: 'balance', label: 'Closing balance', slot: 0, values: series('closingBalance') }]} />
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-2">Where the cash went</p>
              <DonutChart title="Cash out by category" centerLabel="cash out" slices={slices(cashOutCats.map((c) => ({ ...c, amount: c.cash })))} exportId="cashOutMix" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-2">Where the cash came from</p>
              <DonutChart title="Cash in by category" centerLabel="cash in" slices={slices(cashInCats.map((c) => ({ ...c, amount: c.cash })))} />
            </div>
          </div>
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.burn} value={burn.cashPositive ? 'Cash-flow positive' : `${rupees(burn.monthlyBurn)} / month`}
          valueTone={burn.cashPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
          note={burn.cashPositive
            ? `Cash grew by ${compactRupees(burn.monthlyNetCashFlow)} a month on average`
            : burn.runwayMonths !== null ? `Runway: about ${burn.runwayMonths} months at this pace` : 'The account is not positive: there is no runway left'}
          table={trendTable(trend, ['netCashFlow', 'closingBalance'])} section={() => buildSections().burn()}>
          <ColumnChart title="Net cash flow per period" labels={labels} polarity exportId="burnTrend"
            series={[{ key: 'net', label: 'Net cash flow', slot: 0, values: series('netCashFlow') }]} />
        </MetricCard>

        <MetricCard {...metricProps} metric={METRICS.workingCapital} value={rupees(wc.workingCapital)} valueTone={tone(wc.workingCapital)}
          note={`Cash ${compactRupees(wc.cash)} − owed ${compactRupees(wc.currentLiabilities)} (right now)`}
          table={{ columns: ['Item', 'Amount (₹)'], rows: [['Cash', toRupees(wc.cash)], ['Refunds owed', toRupees(wc.pendingRefunds)]], moneyColumns: [1] }}
          section={() => buildSections().wc()}>
          <DonutChart title="Current liabilities" centerLabel="owed" exportId="wcMix" slices={[
            { key: 'refunds', label: 'Refunds owed to customers', value: wc.pendingRefunds },
          ]} />
        </MetricCard>
      </div>
    </div>
  );
};
