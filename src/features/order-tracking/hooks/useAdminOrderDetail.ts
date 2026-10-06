import { useCallback, useEffect, useState } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import type { AdminOrderDetail, OrderTrackingEntry } from '../types/orderTracking.types';
import { sortTimeline } from '../utils/orderTracking.utils';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

/**
 * Selected order via GET /admin/orders/{orderNumber}: customer, items, audit fields and the
 * full history. `refresh()` reloads it in the background after a status change so every
 * displayed value (status, current event, updater, timestamps) comes from the server.
 */
export const useAdminOrderDetail = (orderNumber: string | null) => {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [timeline, setTimeline] = useState<OrderTrackingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorKind, setErrorKind] = useState<ApiErrorKind | null>(null);

  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const load = useCallback(
    async (background: boolean) => {
      if (!orderNumber) {
        setOrder(null);
        setTimeline([]);
        setErrorKind(null);
        return;
      }
      const isCurrent = beginRequest();
      if (background) setIsRefreshing(true);
      else {
        setIsLoading(true);
        setErrorKind(null);
      }
      try {
        const res = await orderTrackingApi.getOrder(orderNumber);
        if (!isCurrent()) return;
        if (res.success && res.data) {
          setOrder(res.data);
          setTimeline(sortTimeline(res.data.tracking));
          setErrorKind(null);
        } else if (!background) {
          setOrder(null);
          setErrorKind('unknown');
          notify.error(res.message || 'Failed to load order details.');
        }
      } catch (err: unknown) {
        if (!isCurrent()) return;
        if (background) {
          // Keep showing the last known data; the save itself already succeeded.
          notify.error(err, 'Status was saved, but the order could not be refreshed.');
        } else {
          setOrder(null);
          setTimeline([]);
          setErrorKind(getApiErrorKind(err));
          notify.error(err, 'Failed to load order details.');
        }
      } finally {
        if (isCurrent()) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [orderNumber, beginRequest, notify]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const retry = useCallback(() => load(false), [load]);
  const refresh = useCallback(() => load(true), [load]);

  return { order, timeline, isLoading, isRefreshing, errorKind, retry, refresh };
};
