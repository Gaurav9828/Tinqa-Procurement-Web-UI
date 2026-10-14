import { useEffect, useState } from 'react';
import { productApi } from '../../products-management/api/productsApi';
import { useNotify } from '../../../hooks/useNotify';

export interface ReviewProductOption {
  id: number;
  title: string;
}

/** Products for the Reviews product filter (GET /api/products), sorted by title. */
export const useReviewProductOptions = () => {
  const [options, setOptions] = useState<ReviewProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    let cancelled = false;
    productApi
      .getAllProducts()
      .then((res) => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) {
          setOptions(
            res.data
              .map((product) => ({ id: product.id, title: product.title }))
              .sort((a, b) => a.title.localeCompare(b.title))
          );
        } else {
          notify.warning('Products could not be loaded, so the product filter is unavailable.');
        }
      })
      .catch(() => {
        // The review list still works without the picker, so this is only a warning.
        if (!cancelled) notify.warning('Products could not be loaded, so the product filter is unavailable.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notify]);

  return { options, isLoading };
};
