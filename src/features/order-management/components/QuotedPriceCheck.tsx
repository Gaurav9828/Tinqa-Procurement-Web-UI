import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { priceDifference, type PriceDifference } from '../utils/quotedPrice';

interface QuotedPriceCheckProps {
  /** The quoted (or proposed) unit price */
  quotedPrice: number;
  /** The item's existing price (MRP); null when the quote is at it or the item has none */
  itemPrice: number | null;
  /** The unit price quoted before this one; null when it was never re-priced */
  previousPrice?: number | null;
  /** The supplier's (or editor's) reason for the price */
  reason: string | null;
  unitType?: string | null;
  /** "Quoted" for a quotation or order, "Proposed" for a change waiting for approval */
  quotedLabel?: string;
}

const signed = (difference: PriceDifference) =>
  `${difference.amount > 0 ? '+' : '−'}${formatCurrency(Math.abs(difference.amount))} (${difference.amount > 0 ? '+' : '−'}${Math.abs(difference.percent)}%)`;

const DifferenceRow: React.FC<{ label: string; base: number; quoted: number; per: string; testId: string }> = ({ label, base, quoted, per, testId }) => {
  const difference = priceDifference(base, quoted);
  if (!difference) return null;
  const up = difference.amount > 0;
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 items-baseline">
      <dt className="text-gray-500 dark:text-neutral-400">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2" data-testid={testId}>
        <span className="font-semibold text-black dark:text-white">
          {formatCurrency(base)} {per}
        </span>
        <span
          className={`inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded-md border font-semibold ${
            up
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
          }`}
        >
          {up ? <TrendingUp className="w-3 h-3" aria-hidden /> : <TrendingDown className="w-3 h-3" aria-hidden />}
          {signed(difference)}
        </span>
      </dd>
    </div>
  );
};

/**
 * Shows approvers how a quoted unit price compares with the item's existing price and with the price quoted before
 * it, and why the supplier changed it. Nothing is shown when there is nothing to compare.
 */
export const QuotedPriceCheck: React.FC<QuotedPriceCheckProps> = ({
  quotedPrice,
  itemPrice,
  previousPrice = null,
  reason,
  unitType,
  quotedLabel = 'Quoted',
}) => {
  const quoted = Number(quotedPrice);
  const vsItem = itemPrice !== null ? priceDifference(Number(itemPrice), quoted) : null;
  const vsPrevious = previousPrice !== null ? priceDifference(Number(previousPrice), quoted) : null;
  if (!vsItem && !vsPrevious) return null;
  const per = `per ${unitType?.trim() || 'unit'}`;
  const headline = vsItem ?? vsPrevious;
  const up = (headline?.amount ?? 0) > 0;
  const itemHeading = up ? "Above the item's price" : "Below the item's price";
  const previousHeading = up ? 'Price raised from the last quote' : 'Price lowered from the last quote';
  const heading = vsItem ? itemHeading : previousHeading;

  return (
    <section
      aria-label="Price check"
      data-testid="quoted-price-check"
      className={`rounded-xl border px-3 py-2.5 text-xs space-y-2 ${
        up ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'
      }`}
    >
      <p className={`font-semibold ${up ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
        Price check: {heading}
      </p>
      <dl className="space-y-1.5">
        <div className="grid grid-cols-[130px_1fr] gap-2 items-baseline">
          <dt className="text-gray-500 dark:text-neutral-400">{quotedLabel} price</dt>
          <dd className="font-bold text-sm text-black dark:text-white" data-testid="price-check-quoted">
            {formatCurrency(quoted)} {per}
          </dd>
        </div>
        {vsItem && itemPrice !== null && (
          <DifferenceRow label="Item's price (MRP)" base={Number(itemPrice)} quoted={quoted} per={per} testId="price-check-item" />
        )}
        {vsPrevious && previousPrice !== null && (
          <DifferenceRow label="Last quoted price" base={Number(previousPrice)} quoted={quoted} per={per} testId="price-check-previous" />
        )}
        <div className="grid grid-cols-[130px_1fr] gap-2 items-baseline">
          <dt className="text-gray-500 dark:text-neutral-400">Reason given</dt>
          <dd data-testid="price-change-reason" className={reason ? 'text-black dark:text-white break-words' : 'text-rose-600 dark:text-rose-400'}>
            {reason ?? 'No reason given'}
          </dd>
        </div>
      </dl>
    </section>
  );
};
