import { describe, expect, it } from 'vitest';
import { hasFormChanges } from './formChanges';

describe('hasFormChanges', () => {
  it('is false for identical values', () => {
    expect(hasFormChanges({ a: 'x', b: [1, 2], c: { d: true } }, { a: 'x', b: [1, 2], c: { d: true } })).toBe(false);
  });

  it('ignores whitespace, empty-vs-missing and key order', () => {
    expect(hasFormChanges({ a: ' x ', b: '' }, { a: 'x' })).toBe(false);
    expect(hasFormChanges({ a: null, b: 1 }, { b: 1, a: undefined })).toBe(false);
  });

  it('detects real edits', () => {
    expect(hasFormChanges({ a: 'x' }, { a: 'y' })).toBe(true);
    expect(hasFormChanges({ a: false }, { a: true })).toBe(true);
    expect(hasFormChanges({ ids: [1, 2] }, { ids: [1] })).toBe(true);
    expect(hasFormChanges({ n: 0 }, { n: null })).toBe(true);
  });
});
