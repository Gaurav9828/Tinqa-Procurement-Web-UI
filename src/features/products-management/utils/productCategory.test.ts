import { describe, expect, it } from 'vitest';
import type { ProductCategory } from '../types/product.types';
import { categorySlug, findCategory, matchCategories, mergeCategories, resolveCategoryName, validateCategoryName } from './productCategory';

const category = (id: number, name: string, sortOrder = 100): ProductCategory => ({ id, name, slug: categorySlug(name), sortOrder });
const DIORAMAS = category(1, 'Dioramas', 10);
const ACCESSORIES = category(2, 'Accessories', 20);
const SPARE_PARTS = category(3, 'Spare Parts');

describe('product categories', () => {
  it('gives names that differ only in case, spacing or punctuation the same slug, like the backend', () => {
    expect(categorySlug('  Spare  Parts! ')).toBe('spare-parts');
    expect(categorySlug('spare-parts')).toBe('spare-parts');
    expect(categorySlug('Café Décor')).toBe('cafe-decor');
    expect(categorySlug(' -- ')).toBe('');
  });

  it('matches what was typed to an existing category and keeps its spelling', () => {
    const all = [DIORAMAS, ACCESSORIES, SPARE_PARTS];
    expect(findCategory(all, 'ACCESSORIES ')).toBe(ACCESSORIES);
    expect(findCategory(all, 'Cleaners')).toBeUndefined();
    expect(resolveCategoryName(all, 'spare parts')).toBe('Spare Parts');
    expect(resolveCategoryName(all, '  Cleaning   kits ')).toBe('Cleaning kits');
  });

  it('suggests names starting with the text first, then names containing it', () => {
    const all = [DIORAMAS, ACCESSORIES, SPARE_PARTS, category(4, 'Parts kits')];
    expect(matchCategories(all, 'par').map((c) => c.name)).toEqual(['Parts kits', 'Spare Parts']);
    expect(matchCategories(all, '')).toHaveLength(4);
  });

  it('merges listed and product categories once each, in storefront order', () => {
    const merged = mergeCategories([SPARE_PARTS, DIORAMAS], [ACCESSORIES, DIORAMAS, null, undefined]);
    expect(merged.map((c) => c.name)).toEqual(['Dioramas', 'Accessories', 'Spare Parts']);
  });

  it('requires a name of at most 60 characters with a letter or digit', () => {
    expect(validateCategoryName('   ')).toBe('Choose a category or type a new one.');
    expect(validateCategoryName('x'.repeat(61))).toMatch(/60 characters/);
    expect(validateCategoryName('!!')).toMatch(/letter or a digit/);
    expect(validateCategoryName('Accessories')).toBeNull();
  });
});
