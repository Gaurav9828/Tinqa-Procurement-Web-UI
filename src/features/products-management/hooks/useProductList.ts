import { useState, useEffect, useCallback, useMemo } from 'react';
import { productApi } from '../api/productsApi'
import type { ProductResponse } from '../types/product.types';
import { useDispatch } from 'react-redux';
import { showAlert } from '../../../store/alertSlice';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { getApiErrorMessage } from '../../../utils/apiError';

export const useProductList = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dispatch = useDispatch();

  const [search, setSearch] = useState<string>('');
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
        dispatch(showAlert({ message: response.message || 'Failed to fetch products', type: 'error' }));
      }
    } catch (err: unknown) {
      if (isCurrent()) dispatch(showAlert({ message: getApiErrorMessage(err, 'Error fetching product catalog.'), type: 'error' }));
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [beginRequest, dispatch]);

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