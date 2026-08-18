import React from 'react';
import type { OrderStatus } from '../types/order.types';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const styles: Record<OrderStatus, string> = {
    PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    CONFIRMED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    SHIPPED: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    DELIVERED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  return (
    <span
      className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border ${
        styles[status] || styles.PENDING
      }`}
    >
      {status}
    </span>
  );
};