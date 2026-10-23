import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShoppingCart, Store } from 'lucide-react';
import type { CustomerSummary } from '../types/customer.types';
import { customerPath } from '../utils/customer.utils';
import { formatCurrency, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';

const isPlainLeftClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export const CartBadge: React.FC<{ units: number }> = ({ units }) =>
  units > 0 ? (
    <span
      title="Items waiting in the cart, not ordered yet"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 whitespace-nowrap"
    >
      <ShoppingCart className="w-3 h-3" /> {units} in cart
    </span>
  ) : null;

export const ClosedBadge: React.FC = () => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 whitespace-nowrap">
    Account closed
  </span>
);

/** Customer list: the whole row opens the customer; the name is a real link (keyboard, open in a new tab). */
export const CustomerTable: React.FC<{
  customers: CustomerSummary[];
  isLoading: boolean;
  onOpen: (customer: CustomerSummary) => void;
}> = ({ customers, isLoading, onOpen }) => (
  <ul
    aria-label="Customers"
    aria-busy={isLoading}
    className={`apple-card divide-y divide-black/10 dark:divide-white/10 overflow-hidden text-xs transition-opacity ${isLoading ? 'opacity-60' : ''}`}
  >
    {customers.map((customer) => (
      <li
        key={customer.id}
        onClick={() => onOpen(customer)}
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={customerPath(customer.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (!isPlainLeftClick(e)) return;
                e.preventDefault();
                onOpen(customer);
              }}
              className="text-sm font-semibold text-black dark:text-white hover:underline truncate"
            >
              {customer.name}
            </Link>
            <CartBadge units={customer.cartUnits} />
            {customer.status === 'DELETED' && <ClosedBadge />}
            {customer.registeredBy && (
              <span title={`Registered by ${customer.registeredBy}`} className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                <Store className="w-3 h-3" /> Store
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-neutral-400">
            <span>{customer.email}</span>
            <span>{customer.phoneNumber}</span>
            <span>Joined {formatDateTime(customer.registeredAt)}</span>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-right shrink-0">
          <div>
            <dt className="text-[10px] text-gray-500">Orders</dt>
            <dd className="font-semibold text-black dark:text-white">{customer.orderCount}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-gray-500">Paid</dt>
            <dd className="font-semibold text-black dark:text-white">{formatCurrency(customer.totalSpent)}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-gray-500">Last order</dt>
            <dd className="text-black dark:text-white whitespace-nowrap">{customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : '—'}</dd>
          </div>
        </dl>
        <ChevronRight className="hidden sm:block w-4 h-4 text-gray-400 shrink-0" />
      </li>
    ))}
  </ul>
);
