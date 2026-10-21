import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MailCheck, MailX } from 'lucide-react';
import { PaymentStatusBadge } from '../../order-tracking/components/PaymentStatusBadge';
import { TrackingStatusBadge } from '../../order-tracking/components/TrackingStatusBadge';
import { formatCurrency, formatDateTime, summarizeItems } from '../../order-tracking/utils/orderTracking.utils';
import { formatPaymentMethod } from '../../order-tracking/utils/payment.utils';
import { orderDetailPath, type OrderDetailLocationState } from '../../order-tracking/utils/orderTrackingRoutes';
import type { StoreSale } from '../types/storeSale.types';
import { EMAIL_STATUS_LABELS, formatAddress, sellerLabel } from '../utils/storeSale.utils';

interface Props {
  sales: StoreSale[];
  /** Show the seller column (every agent's sales). */
  showSeller?: boolean;
  /** Link order numbers to the customer order page (CUSTOMER_ORDER_VIEW). */
  canOpenOrder?: boolean;
  backLabel?: string;
}

const EMAIL_TONES = {
  PENDING: { className: 'text-amber-600 dark:text-amber-400', icon: Clock },
  SENT: { className: 'text-emerald-600 dark:text-emerald-400', icon: MailCheck },
  FAILED: { className: 'text-rose-600 dark:text-rose-400', icon: MailX },
} as const;

/** Whether the customer's order email (receipt and login details) went out. */
const EmailStatus: React.FC<{ sale: StoreSale }> = ({ sale }) => {
  if (!sale.customerEmailStatus) return <span className="text-gray-400">—</span>;
  const { className, icon: Icon } = EMAIL_TONES[sale.customerEmailStatus];
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${className}`} title={sale.customerEmailError ?? undefined}>
      <Icon className="w-3.5 h-3.5" /> {EMAIL_STATUS_LABELS[sale.customerEmailStatus]}
    </span>
  );
};

export const StoreSalesTable: React.FC<Props> = ({ sales, showSeller, canOpenOrder, backLabel = 'Back to store sales' }) => {
  const backState: OrderDetailLocationState = { backLabel };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs" aria-label="Store sales">
        <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
          <tr>
            <th className="pb-2 pr-3 font-semibold">Order</th>
            <th className="pb-2 pr-3 font-semibold">Customer</th>
            {showSeller && <th className="pb-2 pr-3 font-semibold">Sold by</th>}
            <th className="pb-2 pr-3 font-semibold">Items</th>
            <th className="pb-2 pr-3 font-semibold text-right">Total</th>
            <th className="pb-2 pr-3 font-semibold">Payment</th>
            <th className="pb-2 pr-3 font-semibold">Order status</th>
            <th className="pb-2 pr-3 font-semibold">Customer email</th>
            <th className="pb-2 font-semibold">Booked</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
          {sales.map((sale) => (
            <tr key={sale.orderNumber}>
              <td className="py-2.5 pr-3 font-mono font-semibold">
                {canOpenOrder ? (
                  <Link to={orderDetailPath(sale.orderNumber)} state={backState} className="text-[#0071e3] hover:underline">{sale.orderNumber}</Link>
                ) : (
                  sale.orderNumber
                )}
              </td>
              <td className="py-2.5 pr-3 max-w-[16rem]">
                {sale.customer?.name ?? '—'}
                <span className="block text-gray-400">{sale.customer?.phoneNumber}</span>
                {sale.customer?.email && <span className="block text-gray-400 break-all">{sale.customer.email}</span>}
                {sale.deliveryAddress && (
                  <span className="block text-gray-400" title="Delivery address">
                    {formatAddress(sale.deliveryAddress)}
                  </span>
                )}
              </td>
              {showSeller && <td className="py-2.5 pr-3">{sellerLabel(sale)}</td>}
              <td className="py-2.5 pr-3">{summarizeItems(sale.items)}</td>
              <td className="py-2.5 pr-3 text-right font-mono">{formatCurrency(sale.totalAmount)}</td>
              <td className="py-2.5 pr-3 space-y-1">
                <span className="block">{formatPaymentMethod(sale.paymentMethod)}{sale.cash?.receiptNumber ? ` · ${sale.cash.receiptNumber}` : ''}</span>
                <PaymentStatusBadge status={sale.paymentStatus} />
              </td>
              <td className="py-2.5 pr-3"><TrackingStatusBadge status={sale.orderStatus} /></td>
              <td className="py-2.5 pr-3 whitespace-nowrap"><EmailStatus sale={sale} /></td>
              <td className="py-2.5 whitespace-nowrap">{formatDateTime(sale.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
