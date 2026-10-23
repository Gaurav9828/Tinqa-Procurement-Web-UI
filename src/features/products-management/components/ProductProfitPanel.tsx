import React from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { useIncomeTaxRate, useProductProfit } from '../hooks/useCosting';
import { rupees } from '../../finance/utils/money';
import { costPreviewRows, costPreviewWarnings, profitToPaise, realisedRows, rupeesToPaise, sheetToPreview } from '../utils/productCosting';
import { ProfitBreakdown } from './ProfitBreakdown';

/**
 * A product's cost sheet (what one unit costs, line by line, and what it earns at today's price) and the profit it
 * has made on delivered orders. Only for PRODUCT_COST_VIEW holders; nothing is loaded for anyone else.
 */
export const ProductProfitPanel: React.FC<{ productId: number }> = ({ productId }) => {
  const { allowed, data, isLoading, loadFailed, reload } = useProductProfit(productId);
  const incomeTaxRate = useIncomeTaxRate();
  if (!allowed) return null;

  return (
    <section aria-label="Cost & profit" className="space-y-2" data-testid="product-profit">
      <h4 className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
        <Calculator className="w-3.5 h-3.5 text-[#0071e3]" /> Cost & profit
      </h4>
      {isLoading && !data && (
        <p className="flex items-center gap-1.5 text-gray-500" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading costs…
        </p>
      )}
      {loadFailed && (
        <button type="button" onClick={reload} className="text-[#0071e3] hover:underline cursor-pointer">
          Couldn’t load the costs. Retry
        </button>
      )}
      {data && (
        <>
          <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden divide-y divide-black/5 dark:divide-white/5">
            {data.costSheet.components.map((c) => (
              <div key={`item-${c.itemId}`} className="flex justify-between gap-2 px-3 py-1.5">
                <span className="text-black dark:text-white">
                  {c.itemName} × {Number(c.quantity)}
                  <span className="text-gray-400"> @ {c.unitCost === null ? 'no cost' : rupees(rupeesToPaise(c.unitCost))}</span>
                </span>
                <span className="tabular-nums">{c.lineCost === null ? '—' : rupees(rupeesToPaise(c.lineCost))}</span>
              </div>
            ))}
            {data.costSheet.costEntries.map((entry, i) => (
              <div key={`entry-${i}`} className="px-3 py-1.5">
                <span className="flex justify-between gap-2">
                  <span className="text-black dark:text-white">{entry.label}</span>
                  <span className="tabular-nums">{rupees(rupeesToPaise(entry.amount))}</span>
                </span>
                {entry.description && <span className="block text-gray-500 whitespace-pre-wrap">{entry.description}</span>}
              </div>
            ))}
            {data.costSheet.components.length === 0 && data.costSheet.costEntries.length === 0 && (
              <p className="px-3 py-2 text-gray-400 italic">No costs recorded. Edit the product to add them.</p>
            )}
          </div>

          <ProfitBreakdown
            title="Per unit at today's price"
            rows={costPreviewRows(sheetToPreview(data.costSheet))}
            profit={profitToPaise(data.costSheet.profit)}
            incomeTaxRate={incomeTaxRate ?? data.costSheet.profit.incomeTaxRate}
            warnings={costPreviewWarnings(sheetToPreview(data.costSheet))}
          />

          {data.realised.orders === 0 ? (
            <p className="text-gray-500" data-testid="realised-none">No delivered orders yet, so no profit has been made on it so far.</p>
          ) : (
            <ProfitBreakdown
              title={`Earned so far — ${data.realised.unitsSold} ${data.realised.unitsSold === 1 ? 'unit' : 'units'} in ${data.realised.orders} delivered ${
                data.realised.orders === 1 ? 'order' : 'orders'
              }`}
              rows={realisedRows(data.realised)}
              profit={profitToPaise(data.realised.profit)}
              incomeTaxRate={data.realised.profit.incomeTaxRate}
              warnings={
                data.realised.linesWithEstimatedCost > 0
                  ? [`${data.realised.linesWithEstimatedCost} order ${data.realised.linesWithEstimatedCost === 1 ? 'line was' : 'lines were'} placed before costs were recorded: today's cost is used for them.`]
                  : []
              }
              footnote="Shipping charged, refunds and carrier costs of an order are shared between its products by sales value."
            />
          )}
        </>
      )}
    </section>
  );
};
