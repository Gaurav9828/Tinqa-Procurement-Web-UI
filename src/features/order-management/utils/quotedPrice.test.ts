import { describe, it, expect } from 'vitest';
import { isPriceChanged, priceDifference, readPriceNote } from './quotedPrice';

describe('quoted price', () => {
  it('needs a reason only for a price other than the item’s existing one', () => {
    expect(isPriceChanged(1400, '1600')).toBe(true);
    expect(isPriceChanged(1400, '1400')).toBe(false);
    expect(isPriceChanged(1400, '')).toBe(false);
    expect(isPriceChanged(0, '1600')).toBe(false);
  });

  it('works out the difference from a base price in rupees and percent', () => {
    expect(priceDifference(1400, 1600)).toEqual({ amount: 200, percent: 14.29 });
    expect(priceDifference(1500, 1350)).toEqual({ amount: -150, percent: -10 });
    expect(priceDifference(1400, 1400)).toBeNull();
    expect(priceDifference(0, 1600)).toBeNull();
  });

  it('reads the item price, last quoted price and reason the server keeps with a quotation', () => {
    expect(readPriceNote({ mrp: '1400.00', previousUnitPrice: 1500, priceChangeReason: ' Copper prices went up ' }, 1600)).toEqual({
      itemPrice: 1400,
      previousPrice: 1500,
      reason: 'Copper prices went up',
    });
    // At the item's price and never re-priced: nothing to show
    expect(readPriceNote({ supplierNote: 'Ships in two lots' }, 1400)).toBeNull();
    // Re-priced back to the MRP: only the last quoted price is compared
    expect(readPriceNote({ previousUnitPrice: 1600 }, 1400)).toEqual({ itemPrice: null, previousPrice: 1600, reason: null });
    expect(readPriceNote(null, 1400)).toBeNull();
  });
});
