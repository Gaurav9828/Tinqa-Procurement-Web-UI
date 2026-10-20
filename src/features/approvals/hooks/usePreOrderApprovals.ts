import { useCallback, useEffect, useState } from 'react';
import { orderTrackingApi } from '../../order-tracking/api/orderTrackingApi';
import type { AdminOrderSummary } from '../../order-tracking/types/orderTracking.types';
import { useAccess } from '../../../hooks/useAccess';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/** The first page is the queue: anything beyond it is reachable from the order list filtered to the same status. */
export const PRE_ORDER_QUEUE_SIZE = 100;

/**
 * Customer pre-orders waiting for approval (GET /admin/orders?status=PRE_ORDER_PENDING), oldest first. Loads only for
 * those who may approve them and read the order list. The approval itself happens on the order's page, which shows
 * stock readiness and payment.
 */
export const usePreOrderApprovals = () => {
  const { canAll } = useAccess();
  const allowed = canAll('CUSTOMER_ORDER_PRE_ORDER_APPROVE', 'CUSTOMER_ORDER_VIEW');
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!allowed) return;
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await orderTrackingApi.listOrders({ page: 0, size: PRE_ORDER_QUEUE_SIZE, sort: 'createdAt,asc', status: 'PRE_ORDER_PENDING' });
      if (!isCurrent()) return;
      if (res.success && res.data) {
        setOrders(res.data.content ?? []);
        setTotal(res.data.totalElements ?? 0);
      } else {
        notify.error(res, 'Pre-orders could not be loaded.');
      }
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Pre-orders could not be loaded.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [allowed, beginRequest, notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { allowed, orders, total, isLoading, refresh };
};
