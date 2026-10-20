import { useState, useEffect, useCallback } from 'react';
import { itemApi } from '../api/itemApi';
import type { ItemResponse } from '../types/item.types';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { isActiveFromStatuses } from '../../../utils/activeStatusFilter';
import { containsTerm, createSearchResultCache, type SearchPage } from '../../../utils/searchResultCache';

export const ITEM_PAGE_SIZE = 20;

export interface ItemListFilters {
  page: number;
  search: string;
  categoryIds: number[];
  unitsOfMeasure: string[];
  /** Header filter values ('Active' / 'Inactive'). */
  statuses: string[];
}

const INITIAL_FILTERS: ItemListFilters = { page: 0, search: '', categoryIds: [], unitsOfMeasure: [], statuses: [] };

// The backend's item search fields (ItemServiceImpl#matching).
const matchesItem = (item: ItemResponse, term: string) => containsTerm(term, item.name, item.sku, item.brand);

/** Server-side paginated item catalog: search and every filter are applied by the backend across all pages. */
export const useItemList = () => {
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<ItemListFilters>(INITIAL_FILTERS);

  const { term: search, pending: searchPending, flush: searchNow } = useSearchTerm(filters.search);
  const [cache] = useState(() => createSearchResultCache<ItemResponse>({ matches: matchesItem }));
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const { page, categoryIds, unitsOfMeasure, statuses } = filters;

  const fetchItems = useCallback(async () => {
    const isCurrent = beginRequest();
    const query = { scope: JSON.stringify({ categoryIds, unitsOfMeasure, statuses }), term: search, page };
    const show = (data: SearchPage<ItemResponse>) => {
      // An action can empty the last page (e.g. inactivating its only row under an "Active" filter); step back.
      if (page > 0 && page >= data.totalPages) {
        setFilters((prev) => ({ ...prev, page: Math.max(0, data.totalPages - 1) }));
        return;
      }
      setItems(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    };
    const cached = cache.get(query);
    if (cached) {
      show(cached);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await itemApi.getItems({
        page,
        size: ITEM_PAGE_SIZE,
        sort: 'name,asc',
        search,
        categoryIds,
        unitsOfMeasure,
        isActive: isActiveFromStatuses(statuses),
      });
      if (!isCurrent()) return;
      if (response.success && response.data) {
        cache.set(query, response.data);
        show(response.data);
      } else {
        notify.error(response, 'Failed to fetch items');
      }
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Error fetching item catalog.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [notify, beginRequest, cache, page, search, categoryIds, unitsOfMeasure, statuses]);

  useEffect(() => {
    if (!searchPending) fetchItems();
  }, [fetchItems, searchPending]);

  /** After a change to the data: drop remembered results and load again. */
  const refetch = useCallback(() => {
    cache.clear();
    return fetchItems();
  }, [cache, fetchItems]);

  /** Any filter change returns to the first page. */
  const updateFilter = useCallback(
    <K extends Exclude<keyof ItemListFilters, 'page'>>(key: K, value: ItemListFilters[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value, page: 0 })),
    []
  );

  const updatePage = useCallback((next: number) => setFilters((prev) => ({ ...prev, page: next })), []);

  return {
    items,
    totalPages,
    totalElements,
    isLoading,
    filters,
    updateFilter,
    updatePage,
    searchNow,
    refetch,
  };
};
