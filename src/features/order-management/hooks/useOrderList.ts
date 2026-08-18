import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { orderApi } from '../api/orderApi';
import type { OrderResponse, OrderStatus } from '../types/order.types';

export const useOrderList = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [dealerFilter, setDealerFilter] = useState<number | undefined>();

  // Track active fetch requests to prevent race conditions & redundant calls
  const isFetchingRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    // If already fetching, bypass execution
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setIsLoading(true);
    setError(null);
    try {
      let response;
      if (dealerFilter) {
        response = await orderApi.getOrdersByDealerId(dealerFilter);
      } else if (statusFilter) {
        response = await orderApi.getOrdersByStatus(statusFilter);
      } else {
        response = await orderApi.getAllOrders();
      }

      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setError(response.message || 'Failed to fetch orders');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error fetching order catalog.');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [dealerFilter, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    const executeFetch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let response;
        if (dealerFilter) {
          response = await orderApi.getOrdersByDealerId(dealerFilter);
        } else if (statusFilter) {
          response = await orderApi.getOrdersByStatus(statusFilter);
        } else {
          response = await orderApi.getAllOrders();
        }

        if (isMounted) {
          if (response.success && response.data) {
            setOrders(response.data);
          } else {
            setError(response.message || 'Failed to fetch orders');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || 'Error fetching order catalog.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    executeFetch();

    return () => {
      isMounted = false;
    };
  }, [dealerFilter, statusFilter]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const query = search.toLowerCase().trim();
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        (order.itemName && order.itemName.toLowerCase().includes(query)) ||
        (order.dealerName && order.dealerName.toLowerCase().includes(query))
    );
  }, [orders, search]);

  return {
    orders: filteredOrders,
    totalElements: filteredOrders.length,
    isLoading,
    error,
    search,
    statusFilter,
    dealerFilter,
    updateSearch: setSearch,
    updateStatusFilter: setStatusFilter,
    updateDealerFilter: setDealerFilter,
    refetch: fetchOrders,
  };
};