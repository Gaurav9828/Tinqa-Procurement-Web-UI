import { describe, expect, it } from 'vitest';
import { firstTabWithError, tabForErrorKey, tabStatus, tabsWithErrors } from './createProductTabs';

describe('create product tabs', () => {
  it('puts each backend field error on the tab that shows the field', () => {
    expect(tabForErrorKey('title')).toBe('basics');
    expect(tabForErrorKey('modelName')).toBe('basics');
    expect(tabForErrorKey('categoryName')).toBe('basics');
    expect(tabForErrorKey('price')).toBe('pricing');
    expect(tabForErrorKey('hsnSac')).toBe('pricing');
    expect(tabForErrorKey('gstRate')).toBe('pricing');
    expect(tabForErrorKey('image3Url')).toBe('media');
    expect(tabForErrorKey('specifications[1].specKey')).toBe('media');
    expect(tabForErrorKey('components[0].quantity')).toBe('components');
    expect(tabForErrorKey('newUnits[0].barcode')).toBe('components');
    expect(tabForErrorKey('costEntries[2].amount')).toBe('costing');
    expect(tabForErrorKey('warranties[0].durationUnit')).toBe('warranties');
    expect(tabForErrorKey('accessoryParents[0].bundleDiscountPercentage')).toBe('accessory');
    expect(tabForErrorKey('accessoryPurpose')).toBe('accessory');
    // Anything else is shown from the first tab
    expect(tabForErrorKey('somethingNew')).toBe('basics');
  });

  it('finds the first tab with an error in form order, not in the order of the errors', () => {
    expect(firstTabWithError({ 'warranties[0].title': 'x', hsnSac: 'y' })).toBe('pricing');
    expect(firstTabWithError({})).toBeNull();
  });

  it('adds Basics for an error it shows without a field key', () => {
    expect([...tabsWithErrors({ 'warranties[0].title': 'x' }, true)].sort()).toEqual(['basics', 'warranties']);
  });

  it('marks a tab with errors, still needed, done, or nothing needed', () => {
    const errors = new Set(['pricing'] as const);
    const complete = { basics: true, pricing: true, components: false };
    expect(tabStatus('pricing', errors, complete)).toBe('error');
    expect(tabStatus('basics', errors, complete)).toBe('done');
    expect(tabStatus('components', errors, complete)).toBe('todo');
    expect(tabStatus('media', errors, complete)).toBe('optional');
  });
});
