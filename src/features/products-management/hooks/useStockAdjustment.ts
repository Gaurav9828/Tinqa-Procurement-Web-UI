import { useCallback, useEffect, useRef, useState } from 'react';
import { productApi } from '../api/productsApi';
import type { ProductResponse, UpdateProductRequest } from '../types/product.types';
import { buildStockUpdatePayload, calculateNewStock, describeStockChange, type StockAdjustMode } from '../utils/stockAdjustment';
import { useNotify } from '../../../hooks/useNotify';
import { loadComponentCapacity, type ComponentCapacity } from '../utils/componentStock';
import { getApiErrorMessage } from '../../../utils/apiError';

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
  // For products built from components: how many units the item stock allows adding.
  const [capacity, setCapacity] = useState<ComponentCapacity | null>(null);
  const [capacityError, setCapacityError] = useState<string | null>(null);
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
    fetchLatest(productId)
      .then(async (latest) => {
        if (!active) return;
        setProduct(latest);
        setLoadFailed(!latest);
        if (latest?.components.length) {
          try {
            const loaded = await loadComponentCapacity(latest.components);
            if (active) setCapacity(loaded);
          } catch (err: unknown) {
            if (active) setCapacityError(getApiErrorMessage(err, "Couldn't check item stock for this product's components."));
          }
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
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

        // Additions use component item stock: re-check it now, not when the dialog opened.
        let maxAdd: number | null = null;
        if (mode === 'add' && latest.components.length > 0) {
          try {
            const fresh = await loadComponentCapacity(latest.components);
            setCapacity(fresh);
            maxAdd = fresh.maxAddable;
          } catch (err: unknown) {
            return { ok: false, quantityError: getApiErrorMessage(err, "Couldn't check item stock. Try again.") };
          }
        }

        const result = calculateNewStock(latest.stockQuantity, mode, quantity, maxAdd);
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

  return { product, isLoading, loadFailed, isSaving, adjust, capacity, capacityError };
};
