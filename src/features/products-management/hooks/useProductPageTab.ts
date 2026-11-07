import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type ProductPageTab = 'products' | 'stock-entry';

const productParam = (value: string | null): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Product Management's tabs: Products, or Stock entry (adding units, scanned row by row) for holders of
 * STOREFRONT_STOCK_UPDATE. `?tab=stock-entry&product=12` opens product 12's stock entry.
 */
export const useProductPageTab = (canAdjustStock: boolean) => {
  const [params, setParams] = useSearchParams();
  const tab: ProductPageTab = params.get('tab') === 'stock-entry' && canAdjustStock ? 'stock-entry' : 'products';
  const openProductId = tab === 'stock-entry' ? productParam(params.get('product')) : null;

  const showTab = useCallback(
    (next: ProductPageTab, productId?: number) =>
      setParams(next === 'products' ? {} : { tab: next, ...(productId ? { product: String(productId) } : {}) }, { replace: true }),
    [setParams]
  );
  const forgetOpenProduct = useCallback(() => showTab('stock-entry'), [showTab]);

  return { tab, openProductId, showTab, forgetOpenProduct };
};
