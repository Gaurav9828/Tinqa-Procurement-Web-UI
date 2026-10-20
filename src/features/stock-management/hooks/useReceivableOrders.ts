import { useCallback, useEffect, useState } from 'react';
import { stockApi } from '../api/stockApi';
import type { OrderResponse } from '../../order-management/types/order.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/** Delivered purchase orders that can still be received into stock (GET /v1/stocks/receivable-orders). */
export const useReceivableOrders = (enabled: boolean) => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const fetchOrders = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await stockApi.getReceivableOrders();
      if (!isCurrent()) return;
      if (res.success && res.data) setOrders(res.data);
      else notify.error(res, 'Failed to load delivered orders.');
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Failed to load delivered orders.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [beginRequest, notify]);

  useEffect(() => {
    if (enabled) fetchOrders();
  }, [enabled, fetchOrders]);

  return { orders, isLoading, refetch: fetchOrders };
};
