import { useEffect, useState } from 'react';
import { useNotify } from './useNotify';
import { useAccess } from './useAccess';
import type { Permission } from '../config/access';
import { itemApi } from '../features/item-management/api/itemApi';
import { supplierApi } from '../features/supplier-management/api/supplierApi';
import { stockApi } from '../features/stock-management/api/stockApi';
import type { StockResponse } from '../features/stock-management/types/stock.types';
import type { ItemResponse } from '../features/item-management/types/item.types';
import type { SupplierResponse } from '../features/supplier-management/types/supplier.types';
import { productApi } from '../features/products-management/api/productsApi';
import type { ProductResponse } from '../features/products-management/types/product.types';

/**
 * Shared, cached option lists for dropdowns (items, suppliers, products on sale).
 *
 * The paginated list hooks only return one page (10 rows), which is why the
 * order/stock dropdowns used to be truncated. These fetch the full list once,
 * dedupe concurrent callers and cache for a short TTL so several modals on the
 * same page share a single request. Each list loads only for someone holding the permission its endpoint
 * requires (none for a public one); everyone else gets an empty list without a request.
 */
const TTL_MS = 60_000;
// Upper bound for a dropdown. Replace with a dedicated `/lookup` endpoint once available.
const LOOKUP_PAGE_SIZE = 1000;

interface CacheEntry<T> {
  data: T[] | null;
  fetchedAt: number;
  inFlight: Promise<T[]> | null;
}

const EMPTY: never[] = [];

const createLookup = <T,>(requires: Permission | null, loader: () => Promise<T[]>) => {
  const entry: CacheEntry<T> = { data: null, fetchedAt: 0, inFlight: null };

  const load = (force = false): Promise<T[]> => {
    const fresh = entry.data && Date.now() - entry.fetchedAt < TTL_MS;
    if (!force && fresh) return Promise.resolve(entry.data as T[]);
    if (entry.inFlight) return entry.inFlight;

    entry.inFlight = loader()
      .then((data) => {
        entry.data = data;
        entry.fetchedAt = Date.now();
        return data;
      })
      .finally(() => {
        entry.inFlight = null;
      });
    return entry.inFlight;
  };

  const invalidate = () => {
    entry.fetchedAt = 0;
  };

  const useOptions = (wanted = true) => {
    const { can } = useAccess();
    const allowed = requires === null || can(requires);
    const enabled = wanted && allowed;
    const [options, setOptions] = useState<T[]>(allowed ? entry.data ?? [] : []);
    const [isLoading, setIsLoading] = useState(false);
    const notify = useNotify();

    useEffect(() => {
      if (!enabled) return;
      let active = true;
      setIsLoading(!entry.data);
      load()
        .then((data) => {
          if (active) setOptions(data);
        })
        .catch((err: unknown) => {
          if (active) notify.error(err, 'Failed to load dropdown options.');
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
      return () => {
        active = false;
      };
    }, [enabled, notify]);

    return { options: allowed ? options : EMPTY, isLoading, allowed };
  };

  return { load, invalidate, useOptions };
};

const itemLookup = createLookup<ItemResponse>('ITEM_VIEW', async () => {
  const res = await itemApi.getItems({ page: 0, size: LOOKUP_PAGE_SIZE, sort: 'name,asc' });
  return res.data?.content ?? [];
});

const supplierLookup = createLookup<SupplierResponse>('SUPPLIER_VIEW', async () => {
  const res = await supplierApi.getAllSuppliers({ page: 0, size: LOOKUP_PAGE_SIZE, sort: 'name,asc' });
  return res.data?.content ?? [];
});

// All stock entries (used to narrow item pickers to items that have stock).
const stockLookup = createLookup<StockResponse>('STOCK_VIEW', async () => {
  const res = await stockApi.getAllStocks();
  return Array.isArray(res.data) ? res.data : [];
});

// Storefront products on sale now (GET /products/active is public), e.g. to pick what a client demo shows
const activeProductLookup = createLookup<ProductResponse>(null, productApi.getActiveProducts);

export const useItemOptions = itemLookup.useOptions;
export const useActiveProductOptions = activeProductLookup.useOptions;
export const useStockOptions = stockLookup.useOptions;
export const invalidateStockOptions = stockLookup.invalidate;
export const useSupplierOptions = supplierLookup.useOptions;
export const invalidateItemOptions = itemLookup.invalidate;
export const invalidateSupplierOptions = supplierLookup.invalidate;
