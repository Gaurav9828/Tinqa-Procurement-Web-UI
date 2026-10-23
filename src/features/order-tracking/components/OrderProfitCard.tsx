import React from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { useOrderProfit } from '../../products-management/hooks/useCosting';
import { ProfitBreakdown } from '../../products-management/components/ProfitBreakdown';
import { orderProfitWarnings, profitToPaise, realisedRows, rupeesToPaise } from '../../products-management/utils/productCosting';
import { percent, rupees, signTone } from '../../finance/utils/money';
import type { OrderLineProfit } from '../../products-management/types/costing.types';

const unitCostNote = (line: OrderLineProfit): string => {
  if (line.unitCost === null) return 'No cost recorded';
  const when = line.estimatedCost ? " (today's cost)" : '';
  return `${rupees(rupeesToPaise(line.unitCost))} a unit${when}`;
};

/**
 * What the order made: its lines at their cost when ordered, plus the shipping charged and paid. Only for
 * PRODUCT_COST_VIEW holders (nothing is loaded otherwise). `revision` reloads it after a status or refund change,
 * e.g. when a shipping cost is entered with the move to Shipped.
 */
export const OrderProfitCard: React.FC<{ orderNumber: string; revision: string }> = ({ orderNumber, revision }) => {
  const { allowed, data, isLoading, loadFailed, reload } = useOrderProfit(orderNumber, revision);
  if (!allowed) return null;

  return (
    <section aria-label="Profit" className="apple-card p-5 space-y-3" data-testid="order-profit">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white">
        <Calculator className="w-4 h-4 text-[#0071e3]" /> Profit
      </h3>
      {isLoading && !data && (
        <p className="flex items-center gap-1.5 text-gray-500" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Working out the profit…
        </p>
      )}
      {loadFailed && (
        <button type="button" onClick={reload} className="text-[#0071e3] hover:underline cursor-pointer">
          Couldn’t load the profit. Retry
        </button>
      )}
      {data && (
        <>
          <table className="w-full text-left tabular-nums">
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-1 font-semibold">Product</th>
                <th className="py-1 font-semibold text-right">Sales</th>
                <th className="py-1 font-semibold text-right">Cost</th>
                <th className="py-1 font-semibold text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {data.lines.map((line) => (
                <tr key={line.productId}>
                  <td className="py-1.5 pr-2 text-black dark:text-white">
                    {line.title} × {line.quantity}
                    <span className="block text-[10px] text-gray-400">{unitCostNote(line)}</span>
                  </td>
                  <td className="py-1.5 text-right">{rupees(rupeesToPaise(line.revenue))}</td>
                  <td className="py-1.5 text-right">{rupees(rupeesToPaise(line.cost))}</td>
                  <td className={`py-1.5 text-right ${signTone(rupeesToPaise(line.profit.grossProfit))}`}>
                    {rupees(rupeesToPaise(line.profit.grossProfit))}
                    <span className="block text-[10px] text-gray-400">{percent(line.profit.marginPercent)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.shippingCosts.length > 0 && (
            <ul className="space-y-0.5 text-gray-500" aria-label="Shipping costs">
              {data.shippingCosts.map((cost) => (
                <li key={cost.voucherNumber} className="flex justify-between gap-2">
                  <span>
                    {cost.category}
                    {cost.payee ? ` · ${cost.payee}` : ''} · {cost.voucherNumber}
                    {cost.status === 'SUBMITTED' ? ' (awaiting approval)' : ''}
                  </span>
                  <span className="tabular-nums">{rupees(rupeesToPaise(cost.amount))}</span>
                </li>
              ))}
            </ul>
          )}

          <ProfitBreakdown
            title={data.realised ? 'Order profit' : 'Expected order profit'}
            rows={realisedRows(data)}
            profit={profitToPaise(data.profit)}
            incomeTaxRate={data.profit.incomeTaxRate}
            warnings={orderProfitWarnings(data)}
            footnote="GST excluded throughout. Shipping costs are entered when the order ships or a return is picked up."
          />
        </>
      )}
    </section>
  );
};
