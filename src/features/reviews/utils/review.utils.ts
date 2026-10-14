export const REVIEWS_PATH = '/reviews';

/** The Reviews screen filtered to one product (used from the product admin pages). */
export const productReviewsPath = (productId: number) => `${REVIEWS_PATH}?product=${productId}`;

/** The product admin list, searched for one product. */
export const productAdminPath = (productTitle: string) => `/products?search=${encodeURIComponent(productTitle)}`;

export const REVIEW_EXCERPT_LENGTH = 120;

/** First ~120 characters of a review on one line, for the table. */
export const reviewExcerpt = (comment: string | null | undefined, maxLength = REVIEW_EXCERPT_LENGTH): string => {
  const text = (comment ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '—';
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
};
