import type { ProductResponse, UpdateProductRequest } from '../types/product.types';

export type StockAdjustMode = 'add' | 'reduce';

/** Largest single adjustment accepted from the form. */
export const MAX_STOCK_ADJUSTMENT = 1_000_000;
/** Backend column limit for lastUpdateDescription. */
const DESCRIPTION_MAX_LENGTH = 255;
export const STOCK_NOTE_MAX_LENGTH = 150;

export type StockCalculation = { ok: true; newStock: number } | { ok: false; error: string };

/**
 * Validates the quantity and returns the resulting stock (never negative).
 * `maxAdd` caps additions when the product's components limit how many units can be built (null = no limit).
 */
export const calculateNewStock = (
  currentStock: number,
  mode: StockAdjustMode,
  quantityInput: string | number,
  maxAdd: number | null = null
): StockCalculation => {
  const raw = String(quantityInput).trim();
  if (!raw) return { ok: false, error: 'Enter a quantity.' };
  const quantity = Number(raw);
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, error: 'Quantity must be a whole number of at least 1.' };
  if (quantity > MAX_STOCK_ADJUSTMENT) return { ok: false, error: `Quantity cannot exceed ${MAX_STOCK_ADJUSTMENT.toLocaleString()}.` };

  const current = Math.max(0, Number(currentStock) || 0);
  if (mode === 'reduce' && quantity > current) {
    return { ok: false, error: `You can reduce by at most ${current} (current stock).` };
  }
  if (mode === 'add' && maxAdd !== null && quantity > maxAdd) {
    return {
      ok: false,
      error: maxAdd < 1 ? 'Not enough item stock to add any units.' : `You can add at most ${maxAdd} (limited by item stock).`,
    };
  }
  return { ok: true, newStock: mode === 'add' ? current + quantity : current - quantity };
};

/** e.g. "Stock added: +5 (12 → 17) — Supplier delivery" */
export const describeStockChange = (mode: StockAdjustMode, from: number, to: number, note?: string) => {
  const delta = Math.abs(to - from);
  const base = `Stock ${mode === 'add' ? 'added' : 'reduced'}: ${mode === 'add' ? '+' : '−'}${delta} (${from} → ${to})`;
  const reason = note?.trim();
  return (reason ? `${base} — ${reason}` : base).slice(0, DESCRIPTION_MAX_LENGTH);
};

/**
 * Full update payload for PUT /products/{id} with ONLY the stock changed.
 *
 * The backend's update overwrites every field (and replaces all specifications) with what is
 * sent, so every existing value must be carried over — sending just `stockQuantity` would wipe
 * the rest of the product.
 */
export const buildStockUpdatePayload = (product: ProductResponse, newStock: number, description: string): UpdateProductRequest => ({
  title: product.title,
  tagline: product.tagline ?? undefined,
  description: product.description ?? undefined,
  price: product.price,
  discountPercentage: product.discountPercentage ?? undefined,
  image1Url: product.image1Url ?? undefined,
  image2Url: product.image2Url ?? undefined,
  image3Url: product.image3Url ?? undefined,
  image4Url: product.image4Url ?? undefined,
  image5Url: product.image5Url ?? undefined,
  enabled: product.enabled,
  stockQuantity: newStock,
  lastUpdateDescription: description,
  specifications: (product.specifications ?? []).map(({ specKey, specValue }) => ({ specKey, specValue })),
});
