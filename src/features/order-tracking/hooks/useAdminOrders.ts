import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderTrackingApi } from '../api/orderTrackingApi';
import type { AdminOrderListParams, AdminOrderSort, AdminOrderSummary } from '../types/orderTracking.types';
import type { PageResponse } from '../../../types/common.types';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

export const ADMIN_ORDERS_PAGE_SIZE = 20;
export const ADMIN_ORDERS_SEARCH_MAX_LENGTH = 100;

export interface AdminOrderFilters {
  search: string;
  status: string;
  fromDate: string;
  toDate: string;
  sort: AdminOrderSort;
}

const DEFAULT_SORT: AdminOrderSort = 'createdAt,desc';
const SORTS: readonly AdminOrderSort[] = [
  'createdAt,desc',
  'createdAt,asc',
  'totalAmount,desc',
  'totalAmount,asc',
  'orderNumber,asc',
  'orderNumber,desc',
  'orderStatus,asc',
  'orderStatus,desc',
];

// URL keys. The URL is the source of truth for list state, so it survives opening an
// order, the browser Back button and page refreshes.
const Q = { search: 'q', status: 'status', fromDate: 'from', toDate: 'to', sort: 'sort', page: 'page' } as const;

const readFilters = (params: URLSearchParams): AdminOrderFilters => {
  const sort = params.get(Q.sort) as AdminOrderSort | null;
  return {
    search: (params.get(Q.search) ?? '').slice(0, ADMIN_ORDERS_SEARCH_MAX_LENGTH),
    status: params.get(Q.status) ?? '',
    fromDate: params.get(Q.fromDate) ?? '',
    toDate: params.get(Q.toDate) ?? '',
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_SORT,
  };
};

const readPage = (params: URLSearchParams) => {
  const page = Number(params.get(Q.page) ?? 0);
  return Number.isInteger(page) && page > 0 ? page : 0;
};

/** Small in-memory cache so returning from an order shows the list instantly. */
const listCache = new Map<string, PageResponse<AdminOrderSummary>>();
const CACHE_LIMIT = 10;
const remember = (key: string, value: PageResponse<AdminOrderSummary>) => {
  listCache.delete(key);
  listCache.set(key, value);
  if (listCache.size > CACHE_LIMIT) listCache.delete(listCache.keys().next().value!);
};

/** Test helper. */
export const resetAdminOrdersCache = () => listCache.clear();

/** Server-side paginated admin order list (GET /admin/orders), with its state kept in the URL. */
export const useAdminOrders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const page = readPage(searchParams);

  // The input stays bound to `filters.search`; the API only sees the settled value.
  const debouncedSearch = useDebouncedValue(filters.search.trim());
  const dateRangeInvalid = !!filters.fromDate && !!filters.toDate && filters.fromDate > filters.toDate;

  const requestParams = useMemo<AdminOrderListParams>(
    () => ({
      page,
      size: ADMIN_ORDERS_PAGE_SIZE,
      sort: filters.sort,
      search: debouncedSearch,
      status: filters.status,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
    }),
    [page, filters.sort, debouncedSearch, filters.status, filters.fromDate, filters.toDate]
  );
  const cacheKey = JSON.stringify(requestParams);
  const cached = listCache.get(cacheKey);

  const [data, setData] = useState<PageResponse<AdminOrderSummary> | null>(cached ?? null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [errorKind, setErrorKind] = useState<ApiErrorKind | null>(null);

  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const fetchOrders = useCallback(async () => {
    if (dateRangeInvalid) return;
    const isCurrent = beginRequest();
    const hit = listCache.get(cacheKey);
    if (hit) setData(hit); // show cached rows immediately, refresh in the background
    setIsLoading(true);
    setErrorKind(null);
    try {
      const res = await orderTrackingApi.listOrders(requestParams);
      if (!isCurrent()) return;
      if (res.success && res.data) {
        remember(cacheKey, res.data);
        setData(res.data);
      } else {
        setErrorKind('unknown');
        notify.error(res.message || 'Failed to load orders.');
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setErrorKind(getApiErrorKind(err));
      notify.error(err, 'Failed to load orders.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [cacheKey, requestParams, dateRangeInvalid, beginRequest, notify]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const writeParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        // Filter edits replace the entry so Back leaves the page instead of undoing keystrokes.
        { replace: true }
      );
    },
    [setSearchParams]
  );

  /** Any filter change returns to the first page. */
  const updateFilter = useCallback(
    <K extends keyof AdminOrderFilters>(key: K, value: AdminOrderFilters[K]) => {
      writeParams((next) => {
        const isDefault = value === '' || (key === 'sort' && value === DEFAULT_SORT);
        if (isDefault) next.delete(Q[key]);
        else next.set(Q[key], String(value));
        next.delete(Q.page);
      });
    },
    [writeParams]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      writeParams((next) => {
        if (nextPage > 0) next.set(Q.page, String(nextPage));
        else next.delete(Q.page);
      });
    },
    [writeParams]
  );

  const resetFilters = useCallback(() => writeParams((next) => Object.values(Q).forEach((key) => next.delete(key))), [writeParams]);

  const hasActiveFilters = !!filters.search.trim() || !!filters.status || !!filters.fromDate || !!filters.toDate;

  return {
    orders: data?.content ?? [],
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
    page,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    dateRangeInvalid,
    hasLoaded: !!data,
    isLoading,
    errorKind,
    refetch: fetchOrders,
  };
};
