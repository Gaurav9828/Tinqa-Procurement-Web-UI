import { useCallback, useEffect, useState } from 'react';
import { storeSaleApi } from '../api/storeSaleApi';
import type { StoreProduct } from '../types/storeSale.types';
import { useAccess } from '../../../hooks/useAccess';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/**
 * Every product on sale, loaded once for agents who may book orders; the picker filters it in the browser,
 * so typing never calls the server.
 */
export const useStoreProducts = () => {
  const allowed = useAccess().can('STORE_ORDER_CREATE');
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!allowed) return;
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await storeSaleApi.listProducts();
      if (!isCurrent()) return;
      if (res.success && res.data) setProducts(res.data);
      else notify.error(res, 'Products could not be loaded.');
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Products could not be loaded.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [allowed, beginRequest, notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { products, isLoading, refresh };
};
