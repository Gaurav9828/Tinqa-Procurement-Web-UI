import { describe, it, expect } from 'vitest';
import {
  describeWarrantyAudit,
  dropWarrantyErrors,
  emptyWarrantyForm,
  errorsForCard,
  formatRelativeTime,
  formatWarrantyDuration,
  formatWarrantyType,
  parseDuration,
  suggestWarrantyTitle,
  summarizeWarranty,
  toWarrantyForms,
  toWarrantyRequests,
  updateWarrantyForm,
  validateWarrantyForms,
} from './itemWarranty';
import type { ItemWarrantyResponse } from '../types/item.types';

const SAVED: ItemWarrantyResponse = {
  id: 9,
  itemId: 1,
  warrantyType: 'MANUFACTURER',
  title: '3 Years Manufacturer Warranty',
  durationValue: 3,
  durationUnit: 'YEARS',
  provider: 'ASUS',
  coverage: null,
  exclusions: '  ',
  termsAndConditions: 'Keep invoice',
  isActive: false,
};

describe('labels and formatting', () => {
  it('labels enum values', () => {
    expect(formatWarrantyType('MANUFACTURER')).toBe('Manufacturer');
    expect(formatWarrantyType('NEW_KIND')).toBe('New Kind');
    expect(formatWarrantyType(null)).toBe('—');
  });

  it('formats durations with singular/plural units', () => {
    expect(formatWarrantyDuration(3, 'YEARS')).toBe('3 Years');
    expect(formatWarrantyDuration(1, 'MONTHS')).toBe('1 Month');
    expect(formatWarrantyDuration(30, 'DAYS')).toBe('30 Days');
    expect(formatWarrantyDuration(null, 'DAYS')).toBe('—');
  });

  it('suggests a title only once type and a valid duration are set', () => {
    expect(suggestWarrantyTitle('MANUFACTURER', '3', 'YEARS')).toBe('3 Years Manufacturer Warranty');
    expect(suggestWarrantyTitle('EXTENDED', '1', 'YEARS')).toBe('1 Year Extended Warranty');
    expect(suggestWarrantyTitle('', '3', 'YEARS')).toBe('');
    expect(suggestWarrantyTitle('SELLER', '0', 'YEARS')).toBe('');
  });

  it('summarises a warranty on one line, skipping missing parts', () => {
    expect(summarizeWarranty(SAVED)).toBe('Manufacturer · 3 Years · ASUS');
    expect(summarizeWarranty({ warrantyType: 'SELLER', durationValue: '', durationUnit: 'DAYS', provider: ' ' })).toBe('Seller');
  });

  it('parses only whole numbers greater than zero', () => {
    expect(parseDuration(' 12 ')).toBe(12);
    for (const bad of ['', '0', '-1', '1.5', '1e3', 'abc', '99999999999']) expect(parseDuration(bad)).toBeNull();
  });
});

describe('form state', () => {
  it('keeps an untouched title in sync with the suggestion, but never overwrites a typed one', () => {
    let item = updateWarrantyForm(emptyWarrantyForm(), { warrantyType: 'MANUFACTURER', durationValue: '2' });
    expect(item.title).toBe('2 Years Manufacturer Warranty');
    item = updateWarrantyForm(item, { title: 'Custom' });
    item = updateWarrantyForm(item, { durationValue: '5' });
    expect(item.title).toBe('Custom');
    // Clearing the title hands it back to the suggestion.
    item = updateWarrantyForm(updateWarrantyForm(item, { title: '' }), { durationUnit: 'MONTHS' });
    expect(item.title).toBe('5 Months Manufacturer Warranty');
  });

  it('pre-filled warranties keep their id and their saved title', () => {
    const [form] = toWarrantyForms([SAVED]);
    expect(form).toMatchObject({ id: 9, title: SAVED.title, durationValue: '3', isActive: false, titleEdited: true, coverage: '' });
  });

  it('builds update requests with ids and isActive, trimming and dropping empty optional text', () => {
    const forms = [...toWarrantyForms([SAVED]), { ...emptyWarrantyForm(), warrantyType: 'PARTS' as const, title: ' Battery ', durationValue: '6', durationUnit: 'MONTHS' as const, provider: '  ' }];
    expect(toWarrantyRequests(forms, true)).toEqual([
      { id: 9, warrantyType: 'MANUFACTURER', title: '3 Years Manufacturer Warranty', durationValue: 3, durationUnit: 'YEARS', provider: 'ASUS', termsAndConditions: 'Keep invoice', coverage: undefined, exclusions: undefined, isActive: false },
      { warrantyType: 'PARTS', title: 'Battery', durationValue: 6, durationUnit: 'MONTHS', provider: undefined, coverage: undefined, exclusions: undefined, termsAndConditions: undefined, isActive: true },
    ]);
  });

  it('never sends ids or isActive on create', () => {
    const [request] = toWarrantyRequests(toWarrantyForms([SAVED]), false);
    expect(request).not.toHaveProperty('id');
    expect(request).not.toHaveProperty('isActive');
  });
});

describe('validation and errors', () => {
  it('reports per-card errors keyed like the backend', () => {
    const valid = updateWarrantyForm(emptyWarrantyForm(), { warrantyType: 'SERVICE', durationValue: '1' });
    const invalid = { ...emptyWarrantyForm(), durationUnit: '' as const, durationValue: '2.5', provider: 'x'.repeat(256) };
    expect(validateWarrantyForms([valid, invalid])).toEqual({
      'warranties[1].warrantyType': 'Select a warranty type.',
      'warranties[1].title': 'Title is required.',
      'warranties[1].durationValue': 'Duration must be a whole number greater than 0.',
      'warranties[1].durationUnit': 'Select a duration unit.',
      'warranties[1].provider': 'Provider cannot exceed 255 characters.',
    });
  });

  it('splits errors per card and clears them', () => {
    const errors = { 'warranties[0].title': 'a', 'warranties[0]': 'card', 'warranties[10].title': 'b', name: 'c' };
    expect(errorsForCard(errors, 0)).toEqual({ title: 'a', '': 'card' });
    expect(errorsForCard(errors, 1)).toEqual({});
    expect(dropWarrantyErrors(errors, ['warranties[0].title'])).toEqual({ 'warranties[0]': 'card', 'warranties[10].title': 'b', name: 'c' });
    expect(dropWarrantyErrors(errors, 'all')).toEqual({ name: 'c' });
  });
});

describe('audit', () => {
  const now = new Date('2026-10-08T12:00:00Z').getTime();

  it('formats relative times', () => {
    expect(formatRelativeTime('2026-10-08T11:59:30Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-10-08T09:00:00Z', now)).toBe('3 hours ago');
    expect(formatRelativeTime('2026-10-07T12:00:00Z', now)).toBe('yesterday');
  });

  it('describes who updated a warranty and when', () => {
    expect(describeWarrantyAudit({ updatedAt: '2026-10-08T10:00:00Z', updatedBy: 7 }, now)).toBe('Updated 2 hours ago by user #7');
    expect(describeWarrantyAudit({ updatedAt: '2026-10-08T10:00:00Z', updatedBy: null }, now)).toBe('Updated 2 hours ago');
    expect(describeWarrantyAudit({ updatedAt: null, updatedBy: 7 }, now)).toBeNull();
  });
});
