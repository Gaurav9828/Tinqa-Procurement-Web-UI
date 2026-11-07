import React from 'react';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';

/** The order's total before GST (shipment included), shown under every tab of the order form. */
export const OrderTotal: React.FC<{ total: number | null }> = ({ total }) => (
  <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-3 text-sm">
    <span className="text-gray-500 dark:text-neutral-400">Total before GST (incl. shipment)</span>
    <span className="font-semibold font-mono" data-testid="order-total">
      {total === null ? '—' : formatCurrency(total)}
    </span>
  </div>
);
