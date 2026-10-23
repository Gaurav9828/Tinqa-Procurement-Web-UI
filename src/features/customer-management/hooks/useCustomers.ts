import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customersApi, type CustomerListParams } from '../api/customersApi';
import type { CustomerSummary } from '../types/customer.types';
import { CUSTOMERS_PAGE_SIZE, CUSTOMER_SEARCH_MAX_LENGTH } from '../utils/customer.utils';
import type { PageResponse } from '../../../types/common.types';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';
import { createSearchResultCache } from '../../../utils/searchResultCache';

// URL keys: the list state survives opening a customer, Back and refreshes.
const Q = { search: 'q', withCart: 'cart', page: 'page' } as const;

const readPage = (params: URLSearchParams) => {
  const page = Number(params.get(Q.page) ?? 0);
  return Number.isInteger(page) && page > 0 ? page : 0;
};

/** Server-paginated customer list (GET /admin/customers): search by name, email or phone, or only those with a cart. */
export const useCustomers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = (searchParams.get(Q.search) ?? '').slice(0, CUSTOMER_SEARCH_MAX_LENGTH);
  const withCart = searchParams.get(Q.withCart) === '1';
  const page = readPage(searchParams);

  const { term, pending, flush } = useSearchTerm(search);
  // Queries already answered are not asked again. No local narrowing: the backend matches "first last" while the
  // row's name also has the middle name, so a local filter could drop rows the server would return.
  const [seen] = useState(() => createSearchResultCache<CustomerSummary, PageResponse<CustomerSummary>>());

  const params = useMemo<CustomerListParams>(
    () => ({ search: term, withCart, page, size: CUSTOMERS_PAGE_SIZE }),
    [term, withCart, page]
  );
  const seenQuery = useMemo(() => ({ scope: JSON.stringify({ withCart }), term, page }), [withCart, term, page]);

  // Refresh bumps the attempt, so the same query is asked again
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${JSON.stringify(params)}#${attempt}`;
  // The last answer (kept on screen while the next one loads) and the request it answered
  const [result, setResult] = useState<{ key: string; data: PageResponse<CustomerSummary> | null; errorKind: ApiErrorKind | null }>({
    key: '',
    data: null,
    errorKind: null,
  });
  const answered = pending ? null : seen.get(seenQuery);
  const beginRequest = useLatestRequest();
  const notify = useNotify();

  useEffect(() => {
    if (pending || seen.get(seenQuery)) return;
    const isCurrent = beginRequest();
    customersApi
      .list(params)
      .then((res) => {
        if (!isCurrent()) return;
        if (res.success && res.data) {
          seen.set(seenQuery, res.data);
          setResult({ key: requestKey, data: res.data, errorKind: null });
        } else {
          notify.error(res, 'Failed to load customers.');
          setResult((prev) => ({ ...prev, key: requestKey, errorKind: 'unknown' }));
        }
      })
      .catch((err: unknown) => {
        if (!isCurrent()) return;
        notify.error(err, 'Failed to load customers.');
        setResult((prev) => ({ ...prev, key: requestKey, errorKind: getApiErrorKind(err) }));
      });
  }, [pending, params, seen, seenQuery, requestKey, beginRequest, notify]);

  const refetch = useCallback(() => {
    seen.clear();
    setAttempt((value) => value + 1);
  }, [seen]);

  const data = answered ?? result.data;
  const isLoading = pending || (!answered && result.key !== requestKey);
  const errorKind = answered || isLoading ? null : result.errorKind;

  const write = useCallback(
    (mutate: (next: URLSearchParams) => void) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  const setSearch = useCallback(
    (value: string) =>
      write((next) => {
        if (value) next.set(Q.search, value.slice(0, CUSTOMER_SEARCH_MAX_LENGTH));
        else next.delete(Q.search);
        next.delete(Q.page);
      }),
    [write]
  );

  const setWithCart = useCallback(
    (value: boolean) =>
      write((next) => {
        if (value) next.set(Q.withCart, '1');
        else next.delete(Q.withCart);
        next.delete(Q.page);
      }),
    [write]
  );

  const setPage = useCallback(
    (value: number) =>
      write((next) => {
        if (value > 0) next.set(Q.page, String(value));
        else next.delete(Q.page);
      }),
    [write]
  );

  return {
    customers: data?.content ?? [],
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
    page,
    setPage,
    search,
    setSearch,
    searchNow: flush,
    withCart,
    setWithCart,
    hasLoaded: !!data,
    isLoading,
    errorKind,
    refetch,
  };
};
