import React, { useState } from 'react';
import { Info, Table2 } from 'lucide-react';
import type { MetricDefinition } from '../utils/metrics';
import type { FinanceReport, ReportSection, ReportTable } from '../export/report.types';
import { ExportMenu } from './ExportMenu';

/**
 * One figure of the dashboard: what it means, how it's worked out, its value, its charts, a table view of the same
 * numbers, and its own export. `section()` builds the export from the live charts.
 */
export const MetricCard: React.FC<{
  metric: MetricDefinition;
  value: string;
  valueTone?: string;
  note?: React.ReactNode;
  table: ReportTable;
  section: () => ReportSection;
  reportSubtitle: string;
  children: React.ReactNode;
}> = ({ metric, value, valueTone = 'text-black dark:text-white', note, table, section, reportSubtitle, children }) => {
  const [showTable, setShowTable] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const build = (): FinanceReport => ({
    title: metric.title,
    subtitle: reportSubtitle,
    fileName: `${metric.id}-${reportSubtitle.replace(/[^\w]+/g, '-')}`,
    sections: [section()],
  });

  return (
    <section aria-label={metric.title} className="apple-card p-5 space-y-3 text-xs min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-black dark:text-white flex items-center gap-1.5">
            {metric.title}
            <button type="button" aria-label={`What is ${metric.title}?`} aria-expanded={showHelp} onClick={() => setShowHelp((v) => !v)}
              className="text-gray-400 hover:text-black dark:hover:text-white cursor-pointer">
              <Info className="w-3.5 h-3.5" />
            </button>
          </h3>
          <p className={`text-2xl font-semibold mt-1 ${valueTone}`}>{value}</p>
          {note && <div className="text-gray-500 dark:text-neutral-400 mt-0.5">{note}</div>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" aria-pressed={showTable} aria-label="Show as table" onClick={() => setShowTable((v) => !v)}
            className={`p-2 rounded-xl cursor-pointer ${showTable ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/5 dark:bg-white/10 text-black dark:text-white'}`}>
            <Table2 className="w-3.5 h-3.5" />
          </button>
          <ExportMenu compact label={`Export ${metric.title}`} build={build} />
        </div>
      </div>
      {showHelp && (
        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-gray-600 dark:text-gray-300 space-y-1">
          <p>{metric.definition}</p>
          <p className="font-semibold">= {metric.formula}</p>
        </div>
      )}
      {/* Charts stay mounted under the table view so exports always have them */}
      <div className={showTable ? 'hidden' : 'space-y-4'}>{children}</div>
      {showTable && <DataTable table={table} />}
    </section>
  );
};

export const DataTable: React.FC<{ table: ReportTable }> = ({ table }) => (
  <div className="overflow-x-auto max-h-80">
    <table className="w-full text-left text-[11px]">
      <thead className="text-gray-400 uppercase tracking-wider text-[10px]">
        <tr>{table.columns.map((c, i) => <th key={c} className={`pb-2 pr-3 font-semibold ${i > 0 ? 'text-right' : ''}`}>{c}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
        {table.rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} className={`py-1.5 pr-3 ${ci > 0 ? 'text-right tabular-nums' : ''}`}>
                {typeof cell === 'number' && table.moneyColumns?.includes(ci)
                  ? cell.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                  : cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
