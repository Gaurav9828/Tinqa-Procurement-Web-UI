import { useCallback, useEffect, useState } from 'react';
import { customersApi } from '../api/customersApi';
import type { CustomerCartItem, CustomerDetail, CustomerOrder } from '../types/customer.types';
import type { TicketSummary } from '../../support-tickets/types/supportTicket.types';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import { CUSTOMER_ORDERS_PAGE_SIZE, CUSTOMER_TICKETS_SIZE } from '../utils/customer.utils';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

interface Section<T> {
  data: T | null;
  isLoading: boolean;
  errorKind: ApiErrorKind | null;
}

const EMPTY = { data: null, isLoading: true, errorKind: null };

/** Loads one section of the page, ignoring answers to requests that a newer one replaced. */
const useSection = <T,>(fetch: () => Promise<ApiResponse<T>>, failure: string) => {
  const [section, setSection] = useState<Section<T>>(EMPTY);
  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const load = useCallback(async () => {
    const isCurrent = beginRequest();
    setSection((prev) => ({ ...prev, isLoading: true, errorKind: null }));
    try {
      const res = await fetch();
      if (!isCurrent()) return;
      if (res.success && res.data !== undefined && res.data !== null) {
        setSection({ data: res.data, isLoading: false, errorKind: null });
      } else {
        notify.error(res, failure);
        setSection((prev) => ({ ...prev, isLoading: false, errorKind: 'unknown' }));
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      notify.error(err, failure);
      setSection((prev) => ({ ...prev, isLoading: false, errorKind: getApiErrorKind(err) }));
    }
  }, [fetch, failure, beginRequest, notify]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...section, reload: load, set: (data: T) => setSection({ data, isLoading: false, errorKind: null }) };
};

/**
 * One customer's page (GET /admin/customers/{id} and its orders, cart and tickets). Every call needs CUSTOMER_VIEW,
 * which the route already requires. Each section loads and fails on its own, so a slow orders list never hides
 * the profile.
 */
export const useCustomer = (customerId: number) => {
  const [ordersPage, setOrdersPage] = useState(0);

  const detail = useSection<CustomerDetail>(
    useCallback(() => customersApi.get(customerId), [customerId]),
    'Failed to load the customer.'
  );
  const cart = useSection<CustomerCartItem[]>(
    useCallback(() => customersApi.cart(customerId), [customerId]),
    "Failed to load the customer's cart."
  );
  const orders = useSection<PageResponse<CustomerOrder>>(
    useCallback(() => customersApi.orders(customerId, ordersPage, CUSTOMER_ORDERS_PAGE_SIZE), [customerId, ordersPage]),
    "Failed to load the customer's orders."
  );
  const tickets = useSection<PageResponse<TicketSummary>>(
    useCallback(() => customersApi.tickets(customerId, 0, CUSTOMER_TICKETS_SIZE), [customerId]),
    "Failed to load the customer's tickets."
  );

  const refreshAll = useCallback(() => {
    detail.reload();
    cart.reload();
    orders.reload();
    tickets.reload();
  }, [detail, cart, orders, tickets]);

  return {
    customer: detail.data,
    applyCustomer: detail.set,
    detailLoading: detail.isLoading,
    detailError: detail.errorKind,
    retryDetail: detail.reload,
    cart: cart.data ?? [],
    cartLoading: cart.isLoading,
    cartError: cart.errorKind,
    retryCart: cart.reload,
    orders: orders.data?.content ?? [],
    ordersTotal: orders.data?.totalElements ?? 0,
    ordersTotalPages: orders.data?.totalPages ?? 0,
    ordersPage,
    setOrdersPage,
    ordersLoading: orders.isLoading,
    ordersError: orders.errorKind,
    retryOrders: orders.reload,
    tickets: tickets.data?.content ?? [],
    ticketsTotal: tickets.data?.totalElements ?? 0,
    ticketsLoading: tickets.isLoading,
    ticketsError: tickets.errorKind,
    retryTickets: tickets.reload,
    refreshAll,
  };
};
