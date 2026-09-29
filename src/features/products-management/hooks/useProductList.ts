import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { productApi } from '../api/productsApi'
import type { ProductResponse } from '../types/product.types';
import { useDispatch } from 'react-redux';
import { showAlert } from '../../../store/alertSlice';

export const useProductList = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dispatch = useDispatch();

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const isFetchingRef = useRef(false);

  const fetchProducts = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setIsLoading(true);
    try {
      const response = await productApi.getAllProducts();
      if (response.success && response.data) {
        setProducts(response.data);
      } else {
        dispatch(showAlert({ message: response.message || 'Failed to fetch products', type: 'error' }));
      }
    } catch (err: any) {
      dispatch(showAlert({ message: err?.response?.data?.message || 'Error fetching product catalog.', type: 'error' }));
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

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