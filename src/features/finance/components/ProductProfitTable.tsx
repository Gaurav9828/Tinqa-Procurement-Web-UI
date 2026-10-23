import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Period } from '../types/finance.types';
import { presetPeriod, type PeriodPreset } from '../utils/period';
import { percent, rupees, signTone } from '../utils/money';
import { PeriodPicker } from './PeriodPicker';
import { useProfitSummary } from '../../products-management/hooks/useCosting';
import { rupeesToPaise } from '../../products-management/utils/productCosting';
import type { RealisedProfit } from '../../products-management/types/costing.types';

const money = (rupeeAmount: number) => rupees(rupeesToPaise(rupeeAmount));

const Figures: React.FC<{ realised: RealisedProfit; strong?: boolean }> = ({ realised, strong }) => {
  const revenue = realised.profit.revenue;
  const cell = `py-2 text-right ${strong ? 'font-semibold text-black dark:text-white' : ''}`;
  return (
    <>
      <td className={cell}>{realised.unitsSold}</td>
      <td className={cell}>{money(revenue)}</td>
      <td className={cell}>{money(realised.productCost)}</td>
      <td className={cell}>{money(realised.shippingCost)}</td>
      <td className={`${cell} ${signTone(rupeesToPaise(realised.profit.grossProfit))}`}>{money(realised.profit.grossProfit)}</td>
      <td className={cell}>{percent(realised.profit.marginPercent)}</td>
      <td className={`${cell} ${signTone(rupeesToPaise(realised.profit.profitAfterTax))}`}>{money(realised.profit.profitAfterTax)}</td>
    </>
  );
};

/**
 * Profit per product on delivered orders placed in the period (PRODUCT_COST_VIEW): what each product sold for,
 * what it cost (units at their cost when ordered + its share of shipping) and what is left before and after tax.
 */
export const ProductProfitTable: React.FC = () => {
  const [preset, setPreset] = useState<PeriodPreset>('THIS_FY');
  const [period, setPeriod] = useState<Period>(() => presetPeriod('THIS_FY')!);
  const { data, isLoading, loadFailed, reload } = useProfitSummary(period.from, period.to);

  return (
    <section aria-label="Product profit" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white">Product profit</h2>
          <p className="text-gray-500 mt-0.5 max-w-2xl">
            Delivered orders placed in the period. Revenue is sales plus shipping charged less refunds; cost is each unit's cost when it was
            ordered (components + manpower and other costs from the product's cost sheet) plus shipping paid. GST is excluded throughout.
          </p>
        </div>
        <PeriodPicker
          preset={preset}
          period={period}
          onChange={(nextPreset, nextPeriod) => {
            setPreset(nextPreset);
            setPeriod(nextPeriod);
          }}
        />
      </div>

      {isLoading && !data && (
        <p className="flex items-center gap-1.5 text-gray-500" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </p>
      )}
      {loadFailed && (
        <button type="button" onClick={reload} className="text-[#0071e3] hover:underline cursor-pointer">
          Couldn’t load product profit. Retry
        </button>
      )}
      {data && data.products.length === 0 && <p className="text-gray-500">No delivered orders were placed in this period.</p>}
      {data && data.products.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left tabular-nums">
              <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-1 font-semibold">Product</th>
                  <th className="py-1 font-semibold text-right">Units</th>
                  <th className="py-1 font-semibold text-right">Revenue</th>
                  <th className="py-1 font-semibold text-right">Product cost</th>
                  <th className="py-1 font-semibold text-right">Shipping cost</th>
                  <th className="py-1 font-semibold text-right">Profit</th>
                  <th className="py-1 font-semibold text-right">Margin</th>
                  <th className="py-1 font-semibold text-right">After tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {data.products.map((row) => (
                  <tr key={row.productId}>
                    <td className="py-2 pr-2 text-black dark:text-white">
                      {row.title ?? `Product #${row.productId}`}
                      <span className="block text-[10px] text-gray-400">{row.realised.orders} {row.realised.orders === 1 ? 'order' : 'orders'}</span>
                    </td>
                    <Figures realised={row.realised} />
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-black/10 dark:border-white/10">
                <tr>
                  <td className="py-2 font-semibold text-black dark:text-white">All products ({data.totals.orders} orders)</td>
                  <Figures realised={data.totals} strong />
                </tr>
              </tfoot>
            </table>
          </div>
          {data.totals.linesWithEstimatedCost > 0 && (
            <p role="note" className="text-amber-700 dark:text-amber-400">
              {data.totals.linesWithEstimatedCost} order {data.totals.linesWithEstimatedCost === 1 ? 'line was' : 'lines were'} placed before costs were
              recorded; today's cost sheet is used for them.
            </p>
          )}
          <p className="text-[10px] text-gray-400">
            Profit after tax uses income tax at {data.totals.profit.incomeTaxRate}% of profit. It shows what each product earns; the company's own
            profit & loss (Overview) also counts salaries, rent and other running costs.
          </p>
        </>
      )}
    </section>
  );
};
