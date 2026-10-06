import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { AdminOrderSummary } from '../types/orderTracking.types';
import { TrackingStatusBadge } from './TrackingStatusBadge';
import { formatCurrency, formatDateTime, formatUpdater, summarizeItems } from '../utils/orderTracking.utils';

interface Props {
  orders: AdminOrderSummary[];
  isLoading?: boolean;
  /** Order to highlight (e.g. the one the admin just came back from). */
  highlightedOrderNumber?: string | null;
  getOrderHref: (order: AdminOrderSummary) => string;
  onOpen: (order: AdminOrderSummary) => void;
}

const customerLabel = (order: AdminOrderSummary) => order.customer?.name || order.customer?.email || 'Unknown customer';
/** The order's latest change and who made it (order-level audit fields). */
const lastUpdatedAt = (order: AdminOrderSummary) => order.updatedAt ?? order.createdAt;

const TrackingCell: React.FC<{ order: AdminOrderSummary }> = ({ order }) =>
  order.currentTracking ? (
    <TrackingStatusBadge status={order.currentTracking.status} />
  ) : (
    <span className="text-[11px] text-gray-400">No tracking yet</span>
  );

/** Plain clicks open in-app (so the list position is saved); modified clicks keep native link behaviour. */
const isPlainLeftClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * Responsive order list: a table on wide screens, stacked cards on phones.
 * The whole row/card opens the order; the order number is also a real link
 * (keyboard focus, open-in-new-tab).
 */
export const OrderTrackingTable: React.FC<Props> = ({ orders, isLoading = false, highlightedOrderNumber, getOrderHref, onOpen }) => {
  const linkClick = (order: AdminOrderSummary) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    onOpen(order);
  };

  return (
    <div
      aria-busy={isLoading}
      className={`border border-black/10 dark:border-white/10 rounded-2xl text-xs overflow-hidden transition-opacity ${isLoading ? 'opacity-60' : ''}`}
    >
      <table className="w-full text-left border-collapse hidden md:table">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-gray-500">
            <th className="p-3 font-semibold">Order</th>
            <th className="p-3 font-semibold">Customer</th>
            <th className="p-3 font-semibold">Items</th>
            <th className="p-3 font-semibold text-right">Total</th>
            <th className="p-3 font-semibold">Order Status</th>
            <th className="p-3 font-semibold">Tracking Status</th>
            <th className="p-3 font-semibold">Last Update</th>
            <th className="p-3" aria-label="Open" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/10">
          {orders.map((order) => {
            const highlighted = order.orderNumber === highlightedOrderNumber;
            return (
              <tr
                key={order.orderNumber}
                data-order-number={order.orderNumber}
                data-highlighted={highlighted || undefined}
                onClick={() => onOpen(order)}
                className={`cursor-pointer transition-colors ${
                  highlighted ? 'bg-[#0071e3]/10' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                }`}
              >
                <td className="p-3 font-mono font-semibold text-black dark:text-white">
                  <Link to={getOrderHref(order)} onClick={linkClick(order)} className="hover:underline">
                    {order.orderNumber}
                  </Link>
                  <div className="font-sans font-normal text-[10px] text-gray-400">{formatDateTime(order.createdAt)}</div>
                </td>
                <td className="p-3 max-w-[200px]">
                  <div className="truncate text-black dark:text-white">{customerLabel(order)}</div>
                  {order.customer?.name && order.customer.email && (
                    <div className="truncate text-[10px] text-gray-400">{order.customer.email}</div>
                  )}
                </td>
                <td className="p-3 text-gray-600 dark:text-gray-300 max-w-sm truncate" title={summarizeItems(order.items, 50)}>
                  {summarizeItems(order.items)}
                  {order.itemCount > 0 && <span className="text-gray-400"> · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}</span>}
                </td>
                <td className="p-3 text-right font-semibold text-black dark:text-white whitespace-nowrap">
                  {formatCurrency(order.totalAmount)}
                </td>
                <td className="p-3">
                  <TrackingStatusBadge status={order.orderStatus} />
                </td>
                <td className="p-3">
                  <TrackingCell order={order} />
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div className="text-gray-600 dark:text-gray-300">{formatDateTime(lastUpdatedAt(order))}</div>
                  <div className={`text-[10px] ${order.updatedBy ? 'text-gray-400' : 'text-gray-400 italic'}`}>
                    by {formatUpdater(order.updatedBy)}
                  </div>
                </td>
                <td className="p-3 text-right text-gray-400">
                  <ChevronRight className="w-4 h-4 inline" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="md:hidden divide-y divide-black/10 dark:divide-white/10">
        {orders.map((order) => (
          <li key={order.orderNumber} data-highlighted={order.orderNumber === highlightedOrderNumber || undefined}>
            <Link
              to={getOrderHref(order)}
              onClick={linkClick(order)}
              aria-label={`Open order ${order.orderNumber}`}
              className={`block p-4 space-y-1.5 ${order.orderNumber === highlightedOrderNumber ? 'bg-[#0071e3]/10' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-black dark:text-white">{order.orderNumber}</span>
                <TrackingStatusBadge status={order.orderStatus} />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                Tracking: <TrackingCell order={order} />
              </div>
              <p className="text-gray-600 dark:text-gray-300 truncate">
                {customerLabel(order)} · {formatCurrency(order.totalAmount)}
              </p>
              <p className="text-gray-500 truncate">{summarizeItems(order.items)}</p>
              <p className="text-[11px] text-gray-400">
                Ordered {formatDateTime(order.createdAt)} · Updated {formatDateTime(lastUpdatedAt(order))} by{' '}
                {formatUpdater(order.updatedBy)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
