import { useState, useEffect, useCallback } from 'react';
import { itemApi } from '../api/itemApi';
import type { ItemFilterParams, ItemResponse } from '../types/item.types';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

export const useItemList = () => {
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [filters, setFilters] = useState<ItemFilterParams>({
    page: 0,
    size: 10,
    search: '',
    categoryId: undefined,
  });

  const debouncedSearch = useDebouncedValue((filters.search || '').trim());
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const { page, size, categoryId } = filters;

  const fetchItems = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const response = await itemApi.getItems({ page, size, categoryId, search: debouncedSearch });
      if (!isCurrent()) return;
      if (response.success && response.data) {
        setItems(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
      } else {
        notify.error(response.message || 'Failed to fetch items');
      }
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Error fetching item catalog.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [notify, beginRequest, page, size, categoryId, debouncedSearch]);

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
    filters,
    updateSearch,
    updateCategoryFilter,
    updatePage,
    refetch: fetchItems,
  };
};
