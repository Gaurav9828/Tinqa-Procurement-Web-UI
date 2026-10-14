import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi } from '../api/productsApi'
import type { ProductResponse } from '../types/product.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

export const useProductList = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const notify = useNotify();

  // `?search=` pre-fills the box, e.g. when following a product link from the Reviews screen.
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState<string>(() => searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

    // Search query matching title or tagline
    if (!search.trim()) return result;
    const query = search.toLowerCase().trim();
    return result.filter(
      (product) =>
        product.title.toLowerCase().includes(query) ||
        (product.tagline && product.tagline.toLowerCase().includes(query)) ||
        (product.description && product.description.toLowerCase().includes(query))
    );
  }, [products, search, statusFilter]);

  return {
    products: filteredProducts,
    totalElements: filteredProducts.length,
    isLoading,
    search,
    statusFilter,
    updateSearch: setSearch,
    updateStatusFilter: setStatusFilter,
    refetch: fetchProducts,
  };
};