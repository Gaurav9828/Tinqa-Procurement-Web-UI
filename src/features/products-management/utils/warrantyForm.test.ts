import { describe, it, expect } from 'vitest';
import type { WarrantyResponse } from '../types/product.types';
import {
  describeWarrantyChanges,
  dropWarrantyErrors,
  emptyWarranty,
  nonWarrantyErrors,
  toWarrantyFormItems,
  toWarrantyRequests,
  validateWarranties,
  validateWarrantyText,
  warrantiesChanged,
} from './warrantyForm';

const saved = (id: number, title: string, isActive = true): WarrantyResponse => ({
  id,
  title,
  description: 'desc',
  generalTermsAndConditions: 'terms',
  isActive,
  createdAt: null,
  updatedAt: '2026-10-08T13:45:00',
});

describe('validateWarrantyText', () => {
  it('requires a trimmed value', () => {
    expect(validateWarrantyText('   ', 'title')).toBe('Title is required.');
    expect(validateWarrantyText(' ok ', 'title')).toBeNull();
  });

  it('enforces the backend max lengths on the trimmed value', () => {
    expect(validateWarrantyText('a'.repeat(255), 'title')).toBeNull();
    expect(validateWarrantyText(`  ${'a'.repeat(255)}  `, 'title')).toBeNull();
    expect(validateWarrantyText('a'.repeat(256), 'title')).toBe('Title cannot exceed 255 characters.');
    expect(validateWarrantyText('a'.repeat(5001), 'description')).toBe('Description cannot exceed 5,000 characters.');
    expect(validateWarrantyText('a'.repeat(20000), 'generalTermsAndConditions')).toBeNull();
    expect(validateWarrantyText('a'.repeat(20001), 'generalTermsAndConditions')).toMatch(/cannot exceed 20,000/);
  });

  it.each(['<script>x</script>', 'Covers <b>all</b>', 'JavaScript:alert(1)', 'x onerror=y', 'x onload=y'])('rejects %j', (value) => {
    expect(validateWarrantyText(value, 'description')).not.toBeNull();
  });

  it('allows plain comparisons like "< 2 years"', () => {
    expect(validateWarrantyText('Valid for < 2 years', 'description')).toBeNull();
  });
});

describe('validateWarranties', () => {
  it('keys errors like the backend field errors', () => {
    const items = [{ ...emptyWarranty(), title: 'ok', description: 'ok', generalTermsAndConditions: 'ok' }, emptyWarranty()];
    expect(validateWarranties(items)).toEqual({
      'warranties[1].title': 'Title is required.',
      'warranties[1].description': 'Description is required.',
      'warranties[1].generalTermsAndConditions': 'General Terms & Conditions is required.',
    });
    expect(validateWarranties([])).toEqual({});
  });
});

describe('toWarrantyRequests', () => {
  const items = toWarrantyFormItems([saved(7, '  Saved  ', false)]).concat({ ...emptyWarranty(), title: ' New ', description: ' d ', generalTermsAndConditions: ' t ' });

  it('trims, sends isActive as boolean and keeps ids on update', () => {
    expect(toWarrantyRequests(items, true)).toEqual([
      { id: 7, title: 'Saved', description: 'desc', generalTermsAndConditions: 'terms', isActive: false },
      { title: 'New', description: 'd', generalTermsAndConditions: 't', isActive: true },
    ]);
  });

  it('never sends ids on create', () => {
    expect(toWarrantyRequests(items, false).every((item) => !('id' in item))).toBe(true);
  });
});

describe('change detection', () => {
  const original = [saved(1, 'A'), saved(2, 'B')];

  it('treats an untouched list (or whitespace-only edits) as unchanged', () => {
    const items = toWarrantyFormItems(original);
    expect(warrantiesChanged(original, items)).toBe(false);
    items[0].title = ' A ';
    expect(warrantiesChanged(original, items)).toBe(false);
  });

  it('describes renames, (de)activation, additions and deletions', () => {
    const items = toWarrantyFormItems(original);
    items[0] = { ...items[0], title: 'A2', isActive: false };
    items.splice(1, 1);
    items.push({ ...emptyWarranty(), title: 'C' });
    expect(warrantiesChanged(original, items)).toBe(true);
    expect(describeWarrantyChanges(original, items)).toEqual([
      'Update "A2": rename "A" → "A2", deactivate',
      'Add "C"',
      'Delete "B" permanently',
    ]);
  });
});

describe('error helpers', () => {
  const errors = { 'warranties[0].title': 'x', 'warranties[1]': 'y', title: 'Product title is required' };

  it('drops one field error, or all warranty errors', () => {
    expect(dropWarrantyErrors(errors, 'warranties[0].title')).toEqual({ 'warranties[1]': 'y', title: 'Product title is required' });
    expect(dropWarrantyErrors(errors, 'all')).toEqual({ title: 'Product title is required' });
  });

  it('separates form-level errors from warranty row errors', () => {
    expect(nonWarrantyErrors(errors)).toEqual([['title', 'Product title is required']]);
  });
});
