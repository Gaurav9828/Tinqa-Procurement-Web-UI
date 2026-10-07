import { useCallback, useEffect, useRef, useState } from 'react';
import { productApi } from '../api/productsApi';
import type { ProductResponse, UpdateProductRequest } from '../types/product.types';
import { buildStockUpdatePayload, calculateNewStock, describeStockChange, type StockAdjustMode } from '../utils/stockAdjustment';
import { useNotify } from '../../../hooks/useNotify';

export interface StockAdjustResult {
  ok: boolean;
  /** Inline error for the quantity field (e.g. stock changed since the dialog opened). */
  quantityError?: string;
}

/**
 * Add/reduce stock for one product using the existing product update.
 *
 * Loads the latest product when the dialog opens (so the admin sees current stock) and again
 * right before saving, so the +/− is applied to fresh data and no other field is overwritten
 * with stale values. (A dedicated backend stock endpoint would be needed to make this atomic.)
 */
export const useStockAdjustment = (
  productId: number,
  updateProduct: (id: number, payload: UpdateProductRequest) => Promise<boolean>
) => {
  const [product, setProduct] = useState<ProductResponse | null>(null);
  // The dialog mounts per product, so loading starts immediately.
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inFlight = useRef(false);
  const notify = useNotify();

  // The backend has no product-detail route (GET /products/{id} is 405), so the latest
  // values are read from the product list endpoint.
  const fetchLatest = useCallback(
    async (id: number): Promise<ProductResponse | null> => {
      try {
        const latest = await productApi.findProductById(id);
        if (latest) return latest;
        notify.error('This product no longer exists.');
      } catch (err: unknown) {
        notify.error(err, 'Failed to load the product.');
      }
      return null;
    },
    [notify]
  );

  useEffect(() => {
    let active = true;
    fetchLatest(productId).then((latest) => {
      if (!active) return;
      setProduct(latest);
      setLoadFailed(!latest);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [productId, fetchLatest]);

  const adjust = useCallback(
    async (mode: StockAdjustMode, quantity: string, note: string): Promise<StockAdjustResult> => {
      if (inFlight.current) return { ok: false };
      inFlight.current = true;
      setIsSaving(true);
      try {
        const latest = await fetchLatest(productId);
        if (!latest) return { ok: false };
        setProduct(latest);

        const result = calculateNewStock(latest.stockQuantity, mode, quantity);
        if (!result.ok) return { ok: false, quantityError: result.error };

        const description = describeStockChange(mode, latest.stockQuantity, result.newStock, note);
        const ok = await updateProduct(productId, buildStockUpdatePayload(latest, result.newStock, description));
        return { ok };
      } finally {
        inFlight.current = false;
        setIsSaving(false);
      }
    },
    [productId, fetchLatest, updateProduct]
  );

  return { product, isLoading, loadFailed, isSaving, adjust };
};
