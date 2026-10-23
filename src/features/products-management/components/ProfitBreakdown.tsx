import React from 'react';
import { percent, rupees, signTone } from '../../finance/utils/money';
import type { BreakdownRow, ProfitPaise } from '../utils/productCosting';

interface ProfitBreakdownProps {
  title: string;
  /** Revenue and cost lines above the profit. */
  rows: BreakdownRow[];
  profit: ProfitPaise;
  /** Null until the income tax rate is known: profit after tax is then left out. */
  incomeTaxRate: number | null;
  /** Shown above the figures (e.g. "2 components have no cost yet"). */
  warnings?: string[];
  footnote?: string;
}

const lineClass = (sign: BreakdownRow['sign']) =>
  sign === '=' ? 'font-semibold text-black dark:text-white border-t border-black/10 dark:border-white/10 pt-0.5' : 'text-gray-600 dark:text-gray-300';

/**
 * A revenue → cost → profit → tax → profit after tax ladder, in paise. Shared by the product form preview, the
 * product details and the order details so the figures always read the same way.
 */
export const ProfitBreakdown: React.FC<ProfitBreakdownProps> = ({ title, rows, profit, incomeTaxRate, warnings = [], footnote }) => {
  const loss = profit.grossProfit < 0;
  return (
    <section aria-label={title} className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2 space-y-2">
      <span className="block font-semibold text-gray-700 dark:text-gray-300">{title}</span>
      {warnings.map((warning) => (
        <p key={warning} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400" data-testid="profit-warning">
          {warning}
        </p>
      ))}
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
        {rows.map((row) => (
          <React.Fragment key={row.label}>
            <dt className={lineClass(row.sign)}>
              {row.sign === '−' ? '− ' : ''}
              {row.label}
              {row.hint && <span className="block text-[10px] font-normal text-gray-400">{row.hint}</span>}
            </dt>
            <dd className={`text-right ${lineClass(row.sign)}`} data-testid={row.testId}>
              {rupees(row.amount)}
            </dd>
          </React.Fragment>
        ))}
        <dt className="font-semibold text-black dark:text-white border-t border-black/10 dark:border-white/10 pt-0.5">
          {loss ? 'Loss' : 'Profit before tax'}
        </dt>
        <dd className={`text-right font-semibold border-t border-black/10 dark:border-white/10 pt-0.5 ${signTone(profit.grossProfit)}`} data-testid="profit-gross">
          {rupees(profit.grossProfit)}
        </dd>
        <dt className="text-gray-500">Margin · markup</dt>
        <dd className="text-right text-gray-500" data-testid="profit-margin">
          {percent(profit.marginPercent)} · {percent(profit.markupPercent)}
        </dd>
        {incomeTaxRate !== null && (
          <>
            <dt className="text-gray-600 dark:text-gray-300">− Income tax @ {incomeTaxRate}%</dt>
            <dd className="text-right text-gray-600 dark:text-gray-300" data-testid="profit-tax">
              {rupees(profit.incomeTax)}
            </dd>
            <dt className="font-bold text-black dark:text-white border-t border-black/10 dark:border-white/10 pt-0.5">Profit after tax (PAT)</dt>
            <dd className={`text-right font-bold border-t border-black/10 dark:border-white/10 pt-0.5 ${signTone(profit.profitAfterTax)}`} data-testid="profit-pat">
              {rupees(profit.profitAfterTax)}
            </dd>
          </>
        )}
      </dl>
      {footnote && <p className="text-[10px] text-gray-400">{footnote}</p>}
    </section>
  );
};
