import React from 'react';
import { Store } from 'lucide-react';
import type { AdminOrderDetail } from '../../order-tracking/types/orderTracking.types';

/** On a store sale's order page: who sold it and how it was paid. */
export const StoreSaleCard: React.FC<{ order: AdminOrderDetail }> = ({ order }) => {
  const cash = [...(order.payments ?? [])].reverse().find((payment) => payment.provider === 'CASH') ?? null;
  const seller = order.soldByName?.trim() || order.soldBy || '—';
  return (
    <section aria-label="Store sale" className="apple-card p-5 space-y-2">
      <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
        <Store className="w-4 h-4 text-[#0071e3]" /> Store sale
      </h2>
      <p className="text-gray-600 dark:text-neutral-300">
        Sold at the store by <strong>{seller}</strong>
        {order.soldByName && order.soldBy ? ` (${order.soldBy})` : ''}.{' '}
        {order.paymentMethod === 'CASH'
          ? 'Paid in cash to the agent; booked to the company account when the sale was recorded.'
          : 'The customer pays online from their account.'}
      </p>
      {cash?.receiptNumber && <p className="text-gray-500">Receipt {cash.receiptNumber}</p>}
    </section>
  );
};
