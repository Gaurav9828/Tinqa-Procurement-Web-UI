import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import type { TicketOrderContext } from '../types/supportTicket.types';
import { TrackingStatusBadge } from '../../order-tracking/components/TrackingStatusBadge';
import { formatCurrency, formatStatusLabel } from '../../order-tracking/utils/orderTracking.utils';
import { orderDetailPath, type OrderDetailLocationState } from '../../order-tracking/utils/orderTrackingRoutes';

interface Props {
  orderNumber: string | null | undefined;
  order: TicketOrderContext | null | undefined;
  /** The admin may open the order tracking page (UX only; the backend authorizes the request). */
  canOpenOrder: boolean;
}

const BACK_TO_TICKET: OrderDetailLocationState = { backLabel: 'Back to ticket' };

/**
 * The order a ticket was raised about. Renders nothing for tickets without an order.
 *
 * The number links to the existing admin order detail/tracking page only while the order still
 * exists (the ticket API returns `order` context for it); a deleted order keeps its number as a
 * plain snapshot. Tracking history lives on that page — this card shows the summary only.
 */
export const TicketOrderSection: React.FC<Props> = ({ orderNumber, order, canOpenOrder }) => {
  if (!orderNumber && !order) return null;

  const linkable = !!orderNumber && !!order && canOpenOrder;
  const items = order?.items ?? [];

  return (
    <section aria-label="Linked order" className="apple-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#0071e3]" /> Linked order
        </h2>
        {order && <TrackingStatusBadge status={order.status} />}
      </div>

      {orderNumber &&
        (linkable ? (
          <Link
            to={orderDetailPath(orderNumber)}
            state={BACK_TO_TICKET}
            className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-[#0071e3] dark:text-blue-400 hover:underline"
          >
            Order #{orderNumber}
            <ExternalLink className="w-3 h-3" aria-hidden />
          </Link>
        ) : (
          <p className="font-mono text-sm font-semibold text-black dark:text-white" data-testid="order-number-text">
            Order #{orderNumber}
          </p>
        ))}

      {order ? (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Total</dt>
              <dd className="mt-0.5 text-black dark:text-white font-semibold">{formatCurrency(order.total)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Payment</dt>
              <dd className="mt-0.5 text-black dark:text-white">{order.paymentStatus ? formatStatusLabel(order.paymentStatus) : '—'}</dd>
            </div>
          </dl>

          {items.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Items</h3>
              <ul aria-label="Order items" className="space-y-1 text-gray-700 dark:text-gray-300">
                {items.map((item, index) => (
                  <li key={`${item.productId}-${index}`} className="flex justify-between gap-2">
                    <span className="break-words">{item.title}</span>
                    <span className="shrink-0 text-gray-500">×{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-[11px] text-gray-500 dark:text-neutral-400">
          Order details are no longer available — the order may have been removed.
        </p>
      )}
    </section>
  );
};
