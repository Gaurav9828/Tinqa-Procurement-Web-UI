import React from 'react';
import { CommonInput, CommonTextArea } from '../../../components/ui/FormInputs';
import { ORDER_LIMITS } from '../validator/orderValidator';

const calculatePriceVariance = (
  mrp: number,
  quotedPrice: number
): { amount: string; percent: string; isIncrease: boolean } | null => {
  if (!mrp || !quotedPrice) return null;
  const diff = quotedPrice - mrp;
  return {
    amount: Math.abs(diff).toFixed(2),
    percent: Math.abs((diff / mrp) * 100).toFixed(2),
    isIncrease: diff >= 0,
  };
};

interface QuotedPriceFieldsProps {
  hasItem: boolean;
  /** The item's MRP; 0 when it has none. */
  existingPrice: number;
  newPrice: string;
  reason: string;
  priceChanged: boolean;
  onNewPriceChange: (value: string) => void;
  onReasonChange: (value: string) => void;
}

/** The item's existing price (read-only), an optional new quoted price, and the reason a new price needs. */
export const QuotedPriceFields: React.FC<QuotedPriceFieldsProps> = ({
  hasItem,
  existingPrice,
  newPrice,
  reason,
  priceChanged,
  onNewPriceChange,
  onReasonChange,
}) => {
  const priceVariance = priceChanged ? calculatePriceVariance(existingPrice, Number(newPrice)) : null;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <CommonInput
          label="Existing Price (₹)"
          aria-label="Existing price (₹)"
          type="number"
          // The item's MRP: shown for reference, never editable.
          disabled
          placeholder={hasItem ? 'No MRP set' : 'Select an item'}
          value={existingPrice || ''}
          onChange={() => undefined}
          data-testid="order-existing-price"
        />
        <div>
          <CommonInput
            label="New Quoted Price (₹)"
            aria-label="New quoted price (₹)"
            type="number"
            step="0.01"
            min="0.01"
            max={ORDER_LIMITS.MAX_UNIT_PRICE}
            // Required only when the item has no existing price to fall back on.
            required={hasItem && !existingPrice}
            disabled={!hasItem}
            placeholder={existingPrice ? 'Optional' : '0.00'}
            value={newPrice}
            onChange={(e) => onNewPriceChange(e.target.value)}
            data-testid="order-unit-price"
          />
          {priceVariance && (
            <span
              data-testid="order-price-difference"
              className={`mt-1.5 inline-block text-[11px] font-mono px-1.5 py-0.5 rounded-md font-semibold border ${
                priceVariance.isIncrease
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              {priceVariance.isIncrease ? '+' : '-'}₹{priceVariance.amount} ({priceVariance.isIncrease ? '+' : '-'}
              {priceVariance.percent}%) vs existing
            </span>
          )}
        </div>
      </div>

      <CommonTextArea
        label="Reason for the New Price"
        aria-label="Reason for the new price"
        rows={2}
        maxLength={500}
        required={priceChanged}
        // Only a changed price is justified; leave the new price empty to quote the existing one.
        disabled={!priceChanged}
        placeholder={priceChanged ? 'Why the price differs from the existing price' : 'Enter a new price first'}
        value={priceChanged ? reason : ''}
        onChange={(e) => onReasonChange(e.target.value)}
        data-testid="order-price-reason"
      />
    </>
  );
};
