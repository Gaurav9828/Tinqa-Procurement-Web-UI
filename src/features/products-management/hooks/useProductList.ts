import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi } from '../api/productsApi'
import type { ProductResponse } from '../types/product.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { moveItem, reorderInPlace } from '../utils/productOrder';

export const useProductList = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const notify = useNotify();

  // `?search=` pre-fills the box, e.g. when following a product link from the Reviews screen.
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState<string>(() => searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  // 'ALL' or a category slug
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const beginRequest = useLatestRequest();

  const fetchProducts = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const response = await productApi.getAllProducts();
      if (!isCurrent()) return;
      if (response.success && response.data) {
        setProducts(response.data);
      } else {
        notify.error(response, 'Failed to fetch products');
      }
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Error fetching product catalog.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [beginRequest, notify]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    let result = products;

    // Status filtering
    if (statusFilter === 'ENABLED') {
      result = result.filter((p) => p.enabled);
    } else if (statusFilter === 'DISABLED') {
      result = result.filter((p) => !p.enabled);
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter((p) => p.category?.slug === categoryFilter);
    }

    // Search query matching title or tagline
    if (!search.trim()) return result;
    const query = search.toLowerCase().trim();
    return result.filter(
      (product) =>
        product.title.toLowerCase().includes(query) ||
        (product.tagline && product.tagline.toLowerCase().includes(query)) ||
        (product.description && product.description.toLowerCase().includes(query)) ||
        (product.category && product.category.name.toLowerCase().includes(query))
    );
  }, [products, search, statusFilter, categoryFilter]);

  /**
   * Drag-and-drop: moves the listed product at `from` to `to` and saves the storefront order. Only the listed
   * products (e.g. one category's) swap places; the screen updates at once and reloads if saving fails.
   */
  const moveProduct = useCallback(
    async (from: number, to: number) => {
      if (from === to || isReordering) return;
      const orderedIds = moveItem(filteredProducts, from, to).map((product) => product.id);
      setProducts((current) => reorderInPlace(current, orderedIds));
      setIsReordering(true);
      try {
        const response = await productApi.reorderProducts(orderedIds);
        if (response.success) {
          notify.success(response.message || 'Product order saved.');
        } else {
          notify.error(response, 'Failed to save the product order.');
          void fetchProducts();
        }
      } catch (err: unknown) {
        notify.error(err, 'Failed to save the product order.');
        void fetchProducts();
      } finally {
        setIsReordering(false);
      }
    },
    [filteredProducts, isReordering, notify, fetchProducts]
  );

  return {
    products: filteredProducts,
    /** Every product, ignoring the search and status filter. */
    allProducts: products,
    totalElements: filteredProducts.length,
    isLoading,
    search,
    statusFilter,
    categoryFilter,
    updateSearch: setSearch,
    updateStatusFilter: setStatusFilter,
    updateCategoryFilter: setCategoryFilter,
    refetch: fetchProducts,
    isReordering,
    moveProduct,
  };
};