import { useState, useEffect, useCallback } from 'react';
import { itemApi } from '../api/itemApi';
import type { ItemFilterParams, ItemResponse } from '../types/item.types';

export const useItemList = () => {
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ItemFilterParams>({
    page: 0,
    size: 10,
    search: '',
    categoryId: undefined,
  });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await itemApi.getItems(filters);
      if (response.success && response.data) {
        setItems(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
      } else {
        setError(response.message || 'Failed to fetch items');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error fetching item catalog.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 0 }));
  };

  const updateCategoryFilter = (categoryId: number | undefined) => {
    setFilters((prev) => ({ ...prev, categoryId, page: 0 }));
  };

  const updatePage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return {
    items,
    totalPages,
    totalElements,
    isLoading,
    error,
    filters,
    updateSearch,
    updateCategoryFilter,
    updatePage,
    refetch: fetchItems,
  };
};