import { useCallback, useEffect, useState } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import type { TrackingStatusOption } from '../types/orderTracking.types';

// Statuses are static per deployment: once loaded successfully they are shared for the session.
let cached: TrackingStatusOption[] | null = null;
let inFlight: Promise<TrackingStatusOption[]> | null = null;

const loadStatuses = (): Promise<TrackingStatusOption[]> => {
  if (cached) return Promise.resolve(cached);
  if (!inFlight) {
    inFlight = orderTrackingApi
      .getTrackingStatuses()
      .then((res) => {
        if (!res.success || !Array.isArray(res.data)) {
          throw new Error(res.message || 'Failed to load tracking statuses.');
        }
        cached = res.data;
        return res.data;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
};

/** Test helper: forget the cached list. */
export const resetTrackingStatusCache = () => {
  cached = null;
  inFlight = null;
};

/**
 * Status choices from GET /admin/orders/tracking-statuses — the backend's single source
 * of truth. There is deliberately no bundled copy: if loading fails the caller shows a
 * retry and keeps the update actions disabled.
 */
export const useTrackingStatuses = () => {
  const [statuses, setStatuses] = useState<TrackingStatusOption[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!cached);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadStatuses()
      .then((list) => {
        if (!active) return;
        setStatuses(list);
        setHasError(false);
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setAttempt((n) => n + 1);
  }, []);

  return { statuses, isLoading, hasError, retry };
};
