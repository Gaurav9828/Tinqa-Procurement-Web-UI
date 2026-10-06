import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Truck } from 'lucide-react';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { useTrackingStatuses } from '../hooks/useTrackingStatuses';
import { OrderTrackingFilterBar } from '../components/OrderTrackingFilterBar';
import { OrderTrackingTable } from '../components/OrderTrackingTable';
import { OrderTrackingStateMessage } from '../components/OrderTrackingStateMessage';
import { clearListPosition, peekListPosition, saveListPosition } from '../../../utils/listReturnPosition';
import { orderDetailPath, type OrderDetailLocationState } from '../utils/orderTrackingRoutes';
import type { AdminOrderSummary } from '../types/orderTracking.types';

const HIGHLIGHT_MS = 2500;
const LIST_KEY = 'orderTracking';

/** Order list: /order-tracking. Opening an order navigates to its own full-width page. */
export const OrderTrackingPage: React.FC = () => {
  const list = useAdminOrders();
  const statusList = useTrackingStatuses();
  const navigate = useNavigate();
  const location = useLocation();

  // Where the admin was when they opened an order from this exact list view (read once on mount).
  const [returnPosition] = useState(() => peekListPosition(LIST_KEY, location.search));
  const [highlighted, setHighlighted] = useState<string | null>(returnPosition?.itemId ?? null);
  const restored = useRef(false);

  // Restore the scroll offset before paint as soon as rows are on screen
  // (immediately when the list comes from cache).
  useLayoutEffect(() => {
    if (restored.current || !returnPosition || !list.hasLoaded) return;
    restored.current = true;
    window.scrollTo(0, returnPosition.scrollY);
    clearListPosition(LIST_KEY);
  }, [returnPosition, list.hasLoaded]);

  // Briefly highlight the order the admin came back from.
  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const openOrder = (order: AdminOrderSummary) => {
    saveListPosition(LIST_KEY, location.search, order.orderNumber);
    const state: OrderDetailLocationState = { fromList: true };
    navigate(orderDetailPath(order.orderNumber), { state });
  };

  const renderList = () => {
    if (!list.hasLoaded) {
      if (list.isLoading) {
        return (
          <div role="status" className="apple-card p-12 text-center text-xs text-gray-500 dark:text-neutral-400">
            Loading orders...
          </div>
        );
      }
      if (list.errorKind) return <OrderTrackingStateMessage variant={list.errorKind} onRetry={list.refetch} />;
    }
    if (list.errorKind && list.orders.length === 0) {
      return <OrderTrackingStateMessage variant={list.errorKind} onRetry={list.refetch} />;
    }
    if (list.orders.length === 0) {
      return <OrderTrackingStateMessage variant={list.hasActiveFilters ? 'noResults' : 'empty'} />;
    }
    return (
      <>
        <OrderTrackingTable
          orders={list.orders}
          isLoading={list.isLoading}
          highlightedOrderNumber={highlighted}
          getOrderHref={(order) => orderDetailPath(order.orderNumber)}
          onOpen={openOrder}
        />
        {list.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between pt-3 text-xs text-gray-500">
            <span>
              Page {list.page + 1} of {list.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={list.page === 0 || list.isLoading}
                onClick={() => list.setPage(list.page - 1)}
                className="flex items-center gap-1 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={list.page + 1 >= list.totalPages || list.isLoading}
                onClick={() => list.setPage(list.page + 1)}
                className="flex items-center gap-1 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </nav>
        )}
      </>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#0071e3]" /> Order Tracking
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Follow ecommerce orders through fulfilment and record tracking updates
            {list.hasLoaded ? ` (${list.totalElements} orders)` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => list.refetch()}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${list.isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <OrderTrackingFilterBar
        filters={list.filters}
        statuses={statusList.statuses}
        hasActiveFilters={list.hasActiveFilters}
        dateRangeInvalid={list.dateRangeInvalid}
        onFilterChange={list.updateFilter}
        onReset={list.resetFilters}
      />

      {renderList()}
    </div>
  );
};
