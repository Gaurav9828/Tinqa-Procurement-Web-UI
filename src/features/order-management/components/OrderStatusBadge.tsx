import React from 'react';
import type { OrderStatus } from '../../../types/common.types';
import { orderStatusLabel } from '../utils/orderWorkflow';

const TONES = {
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
};

const STYLES: Record<OrderStatus, string> = {
  QUOTATION: TONES.gray,
  PENDING: TONES.amber,
  SUPPLIER_LEVEL_PENDING: TONES.orange,
  CONFIRMED: TONES.blue,
  SHIPPED: TONES.purple,
  DELIVERED: TONES.green,
  RETURN_REQUESTED: TONES.purple,
  RETURN_APPROVED: TONES.purple,
  RETURN_PICKED_UP: TONES.purple,
  RETURN_RECEIVED: TONES.purple,
  REFUND_INITIATED: TONES.amber,
  REFUND_FAILED: TONES.rose,
  REFUND_COMPLETED: TONES.green,
  RETURN_REJECTED: TONES.gray,
  CANCELLED: TONES.rose,
};

export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
  <span
    data-testid="order-status-badge"
    className={`inline-flex px-2.5 py-1 text-[10px] font-semibold rounded-full border whitespace-nowrap ${STYLES[status] ?? TONES.gray}`}
  >
    {orderStatusLabel(status)}
  </span>
);
