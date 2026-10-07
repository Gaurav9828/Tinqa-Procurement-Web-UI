import { describe, it, expect } from 'vitest';
import { buildStockUpdatePayload, calculateNewStock, describeStockChange } from './stockAdjustment';
import type { ProductResponse } from '../types/product.types';

const PRODUCT: ProductResponse = {
  id: 3,
  title: 'SummitX',
  tagline: 'Smart lamp',
  description: 'A lamp',
  price: 1999,
  discountPercentage: null,
  image1Url: 'https://cdn.tinqa.com/1.png',
  image2Url: null,
  image3Url: null,
  image4Url: null,
  image5Url: null,
  enabled: true,
  stockQuantity: 12,
  lastUpdateDescription: 'Price change',
  specifications: [{ specKey: 'Power', specValue: '9W' }],
};

describe('calculateNewStock', () => {
  it('adds and reduces', () => {
    expect(calculateNewStock(12, 'add', '5')).toEqual({ ok: true, newStock: 17 });
    expect(calculateNewStock(12, 'reduce', '5')).toEqual({ ok: true, newStock: 7 });
    expect(calculateNewStock(12, 'reduce', '12')).toEqual({ ok: true, newStock: 0 });
  });

  it('never goes below zero', () => {
    expect(calculateNewStock(12, 'reduce', '13')).toEqual({ ok: false, error: 'You can reduce by at most 12 (current stock).' });
    expect(calculateNewStock(0, 'reduce', '1').ok).toBe(false);
  });

  it.each(['', ' ', '0', '-3', '1.5', 'abc', '1e3x'])('rejects invalid quantity %j', (input) => {
    expect(calculateNewStock(12, 'add', input).ok).toBe(false);
  });

  it('caps a single adjustment', () => {
    expect(calculateNewStock(0, 'add', '1000001').ok).toBe(false);
    expect(calculateNewStock(0, 'add', '1000000')).toEqual({ ok: true, newStock: 1_000_000 });
  });
});

describe('describeStockChange', () => {
  it('records direction, delta and before/after, with an optional reason', () => {
    expect(describeStockChange('add', 12, 17)).toBe('Stock added: +5 (12 → 17)');
    expect(describeStockChange('reduce', 12, 7, '  Damaged units ')).toBe('Stock reduced: −5 (12 → 7) — Damaged units');
  });

  it('stays within the 255-character column', () => {
    expect(describeStockChange('add', 1, 2, 'x'.repeat(400)).length).toBe(255);
  });
});

describe('buildStockUpdatePayload', () => {
  it('carries every existing field and specification over and changes only stock + note', () => {
    const payload = buildStockUpdatePayload(PRODUCT, 17, 'Stock added: +5 (12 → 17)');
    expect(payload).toEqual({
      title: 'SummitX',
      tagline: 'Smart lamp',
      description: 'A lamp',
      price: 1999,
      discountPercentage: undefined,
      image1Url: 'https://cdn.tinqa.com/1.png',
      image2Url: undefined,
      image3Url: undefined,
      image4Url: undefined,
      image5Url: undefined,
      enabled: true,
      stockQuantity: 17,
      lastUpdateDescription: 'Stock added: +5 (12 → 17)',
      specifications: [{ specKey: 'Power', specValue: '9W' }],
    });
  });

  it('keeps a disabled product disabled', () => {
    expect(buildStockUpdatePayload({ ...PRODUCT, enabled: false }, 1, 'x').enabled).toBe(false);
  });
});
