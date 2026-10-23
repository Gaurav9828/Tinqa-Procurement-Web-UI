import { CATEGORY_NAME_MAX, type ProductCategory } from '../types/product.types';

/**
 * Same as the Ecommerce BE (ProductCategoryService.slugOf): "Spare  Parts!" and "spare-parts" are both "spare-parts",
 * so they are one category. Accents are dropped, other letters kept.
 */
export const categorySlug = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join('-');

/** Trimmed, with runs of whitespace as one space (what the backend stores for a new category). */
export const cleanCategoryName = (name: string): string => name.trim().replace(/\s+/g, ' ');

/** The existing category this name stands for, if any. */
export const findCategory = (categories: readonly ProductCategory[], name: string): ProductCategory | undefined => {
  const slug = categorySlug(name);
  return slug ? categories.find((category) => category.slug === slug) : undefined;
};

/** Error message for the category field, or null when it is fine. */
export const validateCategoryName = (name: string): string | null => {
  const clean = cleanCategoryName(name);
  if (!clean) return 'Choose a category or type a new one.';
  if (clean.length > CATEGORY_NAME_MAX) return `Category name cannot exceed ${CATEGORY_NAME_MAX} characters.`;
  if (!categorySlug(clean)) return 'Category name must contain a letter or a digit.';
  return null;
};

/** The name to send: an existing category's own spelling, otherwise the cleaned new name. */
export const resolveCategoryName = (categories: readonly ProductCategory[], name: string): string =>
  findCategory(categories, name)?.name ?? cleanCategoryName(name);

const byStorefrontOrder = (a: ProductCategory, b: ProductCategory) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/** Categories from the category list and from the loaded products (newer), one per slug, in storefront order. */
export const mergeCategories = (
  listed: readonly ProductCategory[],
  fromProducts: readonly (ProductCategory | null | undefined)[]
): ProductCategory[] => {
  const bySlug = new Map<string, ProductCategory>();
  listed.forEach((category) => bySlug.set(category.slug, category));
  fromProducts.forEach((category) => {
    if (category && !bySlug.has(category.slug)) bySlug.set(category.slug, category);
  });
  return [...bySlug.values()].sort(byStorefrontOrder);
};

/** Categories matching what was typed: names starting with it first, then names containing it. */
export const matchCategories = (categories: readonly ProductCategory[], query: string): ProductCategory[] => {
  const slug = categorySlug(query);
  if (!slug) return [...categories];
  const starts = categories.filter((category) => category.slug.startsWith(slug));
  const contains = categories.filter((category) => !category.slug.startsWith(slug) && category.slug.includes(slug));
  return [...starts, ...contains];
};
