import { useCallback, useEffect, useRef } from 'react';

/**
 * "Latest request wins" guard for list fetching.
 *
 * Each call to `begin()` returns an `isCurrent()` check. Responses from older
 * requests (or after unmount) are ignored, so fast typing or a refetch fired
 * mid-flight can never overwrite the list with stale results — and, unlike an
 * "is fetching" flag, a newer request is never silently dropped.
 */
export const useLatestRequest = () => {
  const latestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(() => {
    const id = ++latestId.current;
    return () => mounted.current && id === latestId.current;
  }, []);
};
