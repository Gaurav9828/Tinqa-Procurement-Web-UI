import { useCallback, useEffect, useState } from 'react';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { createSearchResultCache } from '../../../utils/searchResultCache';

/**
 * One page of a searchable list. `scope` holds every input except the search term and the page (JSON), so a query
 * already answered is served from the search cache instead of asked again; `pending` (typing not settled yet,
 * useSearchTerm) holds the request back. Nothing is loaded while `enabled` is false. `refresh` forgets the cache and
 * asks again, after a change to the list's data.
 */
export const usePagedSearch = <T,>(
  load: (term: string, page: number) => Promise<ApiResponse<PageResponse<T>>>,
  { scope, term, pending, page, enabled, failure, quiet = false }: { scope: string; term: string; pending: boolean; page: number; enabled: boolean; failure: string; quiet?: boolean }
) => {
  const [cache] = useState(() => createSearchResultCache<T, PageResponse<T>>());
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${scope}|${term}|${page}#${attempt}`;
  const [result, setResult] = useState<{ key: string; data: PageResponse<T> | null; failed: boolean }>({ key: '', data: null, failed: false });
  const beginRequest = useLatestRequest();
  const notify = useNotify();
  const query = { scope, term, page };
  const answered = enabled && !pending ? cache.get(query) : null;

  useEffect(() => {
    const seen = { scope, term, page };
    if (!enabled || pending || cache.get(seen)) return;
    const isCurrent = beginRequest();
    load(term, page)
      .then((res) => {
        if (!isCurrent()) return;
        if (res.success && res.data) {
          cache.set(seen, res.data);
          setResult({ key: requestKey, data: res.data, failed: false });
        } else {
          if (!quiet) notify.error(res, failure);
          setResult((prev) => ({ ...prev, key: requestKey, failed: true }));
        }
      })
      .catch((err: unknown) => {
        if (!isCurrent()) return;
        if (!quiet) notify.error(err, failure);
        setResult((prev) => ({ ...prev, key: requestKey, failed: true }));
      });
  }, [enabled, pending, scope, term, page, requestKey, cache, load, beginRequest, notify, failure, quiet]);

  const refresh = useCallback(() => {
    cache.clear();
    setAttempt((value) => value + 1);
  }, [cache]);

  const data = answered ?? result.data;
  const isLoading = enabled && (pending || (!answered && result.key !== requestKey));
  return { data, isLoading, loadFailed: !answered && !isLoading && result.failed, refresh };
};

/**
 * One record, loaded whenever `load` changes and `enabled`; an older answer never overwrites a newer one. `replace`
 * shows a record a mutation returned without another request.
 */
export const useRecord = <T,>(load: () => Promise<ApiResponse<T>>, enabled: boolean, failure: string) => {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ data: T | null; failed: boolean; load: unknown; version: number }>({ data: null, failed: false, load: null, version: -1 });
  const notify = useNotify();

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    load()
      .then((res) => {
        if (!current) return;
        if (!res.success) notify.error(res, failure);
        setResult((prev) => ({ data: res.success ? res.data : prev.data, failed: !res.success, load, version }));
      })
      .catch((err: unknown) => {
        if (!current) return;
        notify.error(err, failure);
        setResult((prev) => ({ ...prev, failed: true, load, version }));
      });
    return () => {
      current = false;
    };
  }, [enabled, load, version, notify, failure]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const replace = useCallback((data: T) => setResult((prev) => ({ ...prev, data })), []);
  const isLoading = enabled && (result.load !== load || result.version !== version);
  // Another record's data is never shown for this one
  const data = result.load === load ? result.data : null;
  return { data, isLoading, loadFailed: !isLoading && result.failed, refresh, replace };
};
