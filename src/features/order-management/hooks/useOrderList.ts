import { useState, useEffect, useCallback, useMemo } from 'react';
import { orderApi } from '../api/orderApi';
import type { OrderResponse } from '../types/order.types';
import type { OrderStatus } from '../../../types/common.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

interface UseOrderListOptions {
  /** Defer fetching (e.g. until a modal opens). */
  enabled?: boolean;
  initialStatus?: OrderStatus;
}

export const useOrderList = ({ enabled = true, initialStatus }: UseOrderListOptions = {}) => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(initialStatus);
  const [dealerFilter, setDealerFilter] = useState<number | undefined>();

  const notify = useNotify();

  const beginRequest = useLatestRequest();

  const fetchOrders = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const response = dealerFilter
        ? await orderApi.getOrdersByDealerId(dealerFilter)
        : statusFilter
          ? await orderApi.getOrdersByStatus(statusFilter)
          : await orderApi.getAllOrders();

      if (!isCurrent()) return;
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        notify.error(response.message || 'Failed to fetch orders');
      }
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Error fetching order catalog.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [notify, beginRequest, dealerFilter, statusFilter]);

  useEffect(() => {
    if (enabled) fetchOrders();
  }, [enabled, fetchOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.toLowerCase().trim();
    return orders.filter((order) => {
      // The dealer endpoint ignores status, so apply it here when both filters are set.
      if (dealerFilter && statusFilter && order.orderStatus !== statusFilter) return false;
      if (!query) return true;
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        (order.itemName?.toLowerCase().includes(query) ?? false) ||
        (order.dealerName?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [orders, search, dealerFilter, statusFilter]);

  return {
    orders: filteredOrders,
    totalElements: filteredOrders.length,
    isLoading,
    search,
    statusFilter,
    dealerFilter,
    updateSearch: setSearch,
    updateStatusFilter: setStatusFilter,
    updateDealerFilter: setDealerFilter,
    refetch: fetchOrders,
  };
};
