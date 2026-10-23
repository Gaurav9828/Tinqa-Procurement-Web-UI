import { useEffect, useMemo, useState } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { productCategoryApi } from '../api/productCategoryApi';
import type { ProductCategory, ProductResponse } from '../types/product.types';
import { mergeCategories } from '../utils/productCategory';

let cachedCategories: ProductCategory[] | undefined;

/**
 * Every product category, for the product form and the list filter. The list is loaded once per session (when
 * `enabled`, for PRODUCT_VIEW holders) and merged with the categories of the loaded products, so a category created
 * with a product shows up as soon as the product list is reloaded, without asking again.
 */
export const useProductCategories = (products: readonly ProductResponse[], enabled = true): ProductCategory[] => {
  const { can } = useAccess();
  const notify = useNotify();
  const allowed = can('PRODUCT_VIEW');
  const [listed, setListed] = useState<ProductCategory[]>(cachedCategories ?? []);

  useEffect(() => {
    if (!allowed || !enabled || cachedCategories !== undefined) return;
    let alive = true;
    productCategoryApi
      .getCategories()
      .then((res) => {
        if (!res.success || !Array.isArray(res.data)) {
          notify.error(res, 'Failed to load product categories');
          return;
        }
        cachedCategories = res.data;
        if (alive) setListed(res.data);
      })
      .catch((err: unknown) => {
        // The categories of the loaded products are still offered
        if (alive) notify.error(err, 'Failed to load product categories');
      });
    return () => {
      alive = false;
    };
  }, [allowed, enabled, notify]);

  return useMemo(
    () => mergeCategories(cachedCategories ?? listed, products.map((product) => product.category)),
    [listed, products]
  );
};

/** Test hook: forget the session's categories. */
export const resetProductCategoriesCache = () => {
  cachedCategories = undefined;
};
