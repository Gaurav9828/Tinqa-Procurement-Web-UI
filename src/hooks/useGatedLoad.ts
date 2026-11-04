import { useCallback, useEffect, useState } from 'react';
import type { ApiResponse } from '../types/common.types';
import { useNotify } from './useNotify';

/**
 * Loads one resource while `enabled` (its permission held and its view open), again whenever `load` changes or
 * `refresh()` is called. An older answer never overwrites a newer one. Failures go to the global alert unless `quiet`.
 * Pass a memoised `load` (useCallback) so it only changes with its inputs.
 */
export const useGatedLoad = <T,>(load: () => Promise<ApiResponse<T>>, enabled: boolean, failure: string, quiet = false) => {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ data: T | null; failed: boolean; load: unknown; version: number }>({
    data: null,
    failed: false,
    load: null,
    version: -1,
  });
  const notify = useNotify();

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    load()
      .then((res) => {
        if (!current) return;
        if (!res.success && !quiet) notify.error(res, failure);
        setResult({ data: res.success ? res.data : null, failed: !res.success, load, version });
      })
      .catch((err: unknown) => {
        if (!current) return;
        if (!quiet) notify.error(err, failure);
        setResult({ data: null, failed: true, load, version });
      });
    return () => {
      current = false;
    };
  }, [enabled, load, version, notify, failure, quiet]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const isLoading = enabled && (result.load !== load || result.version !== version);
  // Keep showing the previous answer while the next one loads
  return { data: result.data, isLoading, loadFailed: result.failed && !isLoading, refresh };
};
