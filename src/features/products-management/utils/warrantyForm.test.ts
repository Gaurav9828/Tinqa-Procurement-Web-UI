import { describe, it, expect } from 'vitest';
import { itemWarrantyTitle } from './warrantyForm';

describe('itemWarrantyTitle', () => {
  it('uses only the item name as the title of an item warranty copied into the product', () => {
    expect(itemWarrantyTitle('1 Month Manufacturer Warranty', 'Summit X Touch Panel')).toBe('Summit X Touch Panel');
    expect(itemWarrantyTitle('1 Year Parts', '  Motherboard ')).toBe('Motherboard');
  });

  it('falls back to the warranty title when the item has no name', () => {
    expect(itemWarrantyTitle(' 1 Year Parts ', ' ')).toBe('1 Year Parts');
  });

  it('stays within 255 characters', () => {
    expect(itemWarrantyTitle('W', 'N'.repeat(300))).toHaveLength(255);
  });
});
