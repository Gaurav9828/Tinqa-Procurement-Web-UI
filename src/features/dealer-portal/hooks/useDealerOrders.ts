import { useCallback, useEffect, useState } from 'react';
import { dealerPortalApi } from '../api/dealerPortalApi';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import type {
  CreateQuotationRequest,
  DealerItem,
  DealerOrder,
  OrderResponseRequest,
  QuotationChangeRequest,
} from '../types/dealerPortal.types';

/**
 * The signed-in dealer's quotations and orders, and what they can do with them. Loads only for dealer logins
 * (DEALER_PORTAL_VIEW); the item list loads only when a quotation form needs it.
 */
export const useDealerOrders = () => {
  const { can } = useAccess();
  const canView = can('DEALER_PORTAL_VIEW');
  const canQuote = can('DEALER_QUOTATION_SUBMIT');
  const notify = useNotify();
  const beginRequest = useLatestRequest();

  const [orders, setOrders] = useState<DealerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(canView);
  const [items, setItems] = useState<DealerItem[] | null>(null);

  const refresh = useCallback(async () => {
    if (!canView) return;
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await dealerPortalApi.getOrders();
      if (!isCurrent()) return;
      if (res.success) setOrders(res.data ?? []);
      else notify.error(res, 'Your orders could not be loaded.');
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Your orders could not be loaded.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [beginRequest, canView, notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadItems = useCallback(async () => {
    if (!canQuote || items) return;
    try {
      const res = await dealerPortalApi.getItems();
      if (res.success) setItems(res.data ?? []);
      else notify.error(res, 'Items could not be loaded.');
    } catch (err: unknown) {
      notify.error(err, 'Items could not be loaded.');
    }
  }, [canQuote, items, notify]);

  const { isSubmitting, run } = useApiAction(refresh);

  const createQuotation = (payload: CreateQuotationRequest) =>
    run(() => dealerPortalApi.createQuotation(payload), {
      success: 'Quotation created.',
      failure: 'The quotation could not be created.',
    });

  const requestChange = (orderId: number, payload: QuotationChangeRequest) =>
    run(() => dealerPortalApi.requestChange(orderId, payload), {
      success: 'Change sent for approval.',
      failure: 'The change could not be sent.',
    });

  const withdrawChange = (changeId: number) =>
    run(() => dealerPortalApi.withdrawChange(changeId), {
      success: 'Change withdrawn.',
      failure: 'The change could not be withdrawn.',
    });

  const respondToOrder = (orderId: number, payload: OrderResponseRequest) =>
    run(() => dealerPortalApi.respondToOrder(orderId, payload), {
      success: payload.decision === 'ACCEPT' ? 'Order confirmed.' : 'Order rejected.',
      failure: 'Your answer could not be saved.',
    });

  const markShipped = (orderId: number) =>
    run(() => dealerPortalApi.markShipped(orderId), {
      success: 'Order marked as shipped.',
      failure: 'The order could not be marked as shipped.',
    });

  return {
    orders,
    isLoading,
    refresh,
    items: items ?? [],
    loadItems,
    canQuote,
    canRequestChange: can('DEALER_QUOTATION_CHANGE_REQUEST'),
    canRespond: can('DEALER_ORDER_RESPOND'),
    canShip: can('DEALER_ORDER_SHIP'),
    isSubmitting,
    createQuotation,
    requestChange,
    withdrawChange,
    respondToOrder,
    markShipped,
  };
};
