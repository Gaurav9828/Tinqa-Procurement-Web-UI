import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Store } from 'lucide-react';
import type { CustomerOrder } from '../types/customer.types';
import { SectionState } from './SectionState';
import { Pager } from '../../../components/ui/Pager';
import { PaymentStatusBadge } from '../../order-tracking/components/PaymentStatusBadge';
import { TrackingStatusBadge } from '../../order-tracking/components/TrackingStatusBadge';
import { formatCurrency, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { formatPaymentMethod } from '../../order-tracking/utils/payment.utils';
import { orderDetailPath } from '../../order-tracking/utils/orderTrackingRoutes';
import type { ApiErrorKind } from '../../../utils/apiErrorKind';

/** Purchase history, newest first: what was bought, when, how it was paid and where the order stands. */
export const CustomerOrdersSection: React.FC<{
  orders: CustomerOrder[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  errorKind: ApiErrorKind | null;
  /** Order Tracking opens only with CUSTOMER_ORDER_VIEW; otherwise the order number is plain text. */
  canOpenOrder: boolean;
  onPage: (page: number) => void;
  onRetry: () => void;
}> = ({ orders, total, page, totalPages, isLoading, errorKind, canOpenOrder, onPage, onRetry }) => (
  <section aria-label="Orders" className="apple-card overflow-hidden">
    <header className="flex items-center justify-between px-5 py-3 border-b border-black/10 dark:border-white/10">
      <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-[#0071e3]" /> Orders {total > 0 && <span className="text-gray-500 font-normal">({total})</span>}
      </h2>
      <Pager page={page} totalPages={totalPages} disabled={isLoading} onPage={onPage} />
    </header>
    {orders.length === 0 ? (
      <SectionState isLoading={isLoading} errorKind={errorKind} empty="No orders yet." onRetry={onRetry} />
    ) : (
      <ul className={`divide-y divide-black/10 dark:divide-white/10 text-xs ${isLoading ? 'opacity-60' : ''}`}>
        {orders.map((order) => (
          <li key={order.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {canOpenOrder ? (
                <Link to={orderDetailPath(order.orderNumber)} className="font-semibold text-[#0071e3] hover:underline">
                  #{order.orderNumber}
                </Link>
              ) : (
                <span className="font-semibold text-black dark:text-white">#{order.orderNumber}</span>
              )}
              <TrackingStatusBadge status={order.orderStatus} />
              <PaymentStatusBadge status={order.paymentStatus} />
              {order.salesChannel === 'STORE' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                  <Store className="w-3 h-3" /> Store sale{order.soldByName ? ` by ${order.soldByName}` : ''}
                </span>
              )}
              <span className="ml-auto font-semibold text-black dark:text-white">{formatCurrency(order.totalAmount)}</span>
            </div>
            <p className="text-[11px] text-gray-500">
              {formatDateTime(order.placedAt)} · {formatPaymentMethod(order.paymentMethod)}
            </p>
            <ul className="space-y-0.5 text-gray-700 dark:text-gray-300">
              {order.items.map((item, index) => (
                <li key={`${item.productId}-${index}`} className="flex justify-between gap-3">
                  <span className="truncate">
                    {item.title} × {item.quantity}
                  </span>
                  <span className="whitespace-nowrap">{formatCurrency(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
            {order.cancellationReason && <p className="text-[11px] text-rose-600">Cancelled: {order.cancellationReason}</p>}
          </li>
        ))}
      </ul>
    )}
  </section>
);
