import { describe, it, expect } from 'vitest';
import { costEntriesChanged, emptyCostEntryRow, previewCosts, profitOf, toCostEntryRequests, toCostSummary, validateCostEntries } from './productCosting';

// Same figures as Ecommerce BE CostSheetsTest: the preview must match what the server saves
describe('product costing preview', () => {
  const base = { price: 11800, discountPercentage: 0, gstRate: 18, incomeTaxRate: 25.17 };

  it('takes GST out of the price and the components + extra costs off the revenue', () => {
    const preview = previewCosts({ ...base, components: [{ quantity: '2', unitCost: '1500' }], extraCosts: ['2000'] });
    expect(preview.netRevenue).toBe(1_000_000);
    expect(preview.gstIncluded).toBe(180_000);
    expect(preview.unitCost).toBe(500_000);
    expect(preview.profit).toMatchObject({ grossProfit: 500_000, marginPercent: 50, markupPercent: 100, incomeTax: 125_850, profitAfterTax: 374_150 });
    expect(toCostSummary(preview)).toEqual({ unitCost: 5000, netRevenue: 10000, grossProfit: 5000, marginPercent: 50, profitAfterTax: 3741.5, componentsWithoutCost: 0 });
  });

  it('takes the discount off before GST', () => {
    expect(previewCosts({ ...base, discountPercentage: 10, components: [], extraCosts: [] }).netRevenue).toBe(900_000);
  });

  it('counts components without a cost and sends no summary while nothing is costed', () => {
    const preview = previewCosts({ ...base, components: [{ quantity: 3, unitCost: '' }], extraCosts: [] });
    expect(preview.componentsWithoutCost).toBe(1);
    expect(preview.hasCosts).toBe(false);
    expect(toCostSummary(preview)).toBeUndefined();
  });

  it('pays no income tax on a loss', () => {
    expect(profitOf(100_000, 150_000, 25.17)).toMatchObject({ grossProfit: -50_000, incomeTax: 0, profitAfterTax: -50_000, marginPercent: -50 });
  });
});

describe('extra costs', () => {
  it('needs a name and an amount with at most 2 decimals', () => {
    const rows = [{ ...emptyCostEntryRow(), amount: '1.234' }, { ...emptyCostEntryRow('Manpower'), amount: '2000' }];
    expect(validateCostEntries(rows)).toEqual({
      'costEntries[0].label': 'Name the cost, e.g. Manpower.',
      'costEntries[0].amount': 'Enter an amount of 0 or more with at most 2 decimals.',
    });
  });

  it('sends trimmed rows and spots changes', () => {
    const rows = [{ ...emptyCostEntryRow('  Software   licence '), amount: '150', description: ' ' }];
    expect(toCostEntryRequests(rows)).toEqual([{ label: 'Software licence', amount: 150 }]);
    expect(costEntriesChanged([{ label: 'Software licence', amount: 150, description: null }], rows)).toBe(false);
    expect(costEntriesChanged([{ label: 'Software licence', amount: 100 }], rows)).toBe(true);
  });
});
