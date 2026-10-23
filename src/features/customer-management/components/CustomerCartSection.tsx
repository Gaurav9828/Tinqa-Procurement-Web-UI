import React from 'react';
import { ShoppingCart } from 'lucide-react';
import type { CustomerCartItem } from '../types/customer.types';
import { SectionState } from './SectionState';
import { formatCurrency, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import type { ApiErrorKind } from '../../../utils/apiErrorKind';

/** What the customer put in their cart and has not ordered yet: a reason to contact them. */
export const CustomerCartSection: React.FC<{
  items: CustomerCartItem[];
  isLoading: boolean;
  errorKind: ApiErrorKind | null;
  onRetry: () => void;
}> = ({ items, isLoading, errorKind, onRetry }) => (
  <section aria-label="Cart" className="apple-card overflow-hidden">
    <header className="px-5 py-3 border-b border-black/10 dark:border-white/10">
      <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-amber-500" /> In cart, not ordered
      </h2>
    </header>
    {items.length === 0 ? (
      <SectionState isLoading={isLoading} errorKind={errorKind} empty="The cart is empty." onRetry={onRetry} />
    ) : (
      <ul className="divide-y divide-black/10 dark:divide-white/10 text-xs">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3 p-4">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-black/5" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/10" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-black dark:text-white truncate">{item.title}</p>
              <p className="text-[11px] text-gray-500">
                {item.quantity} × {formatCurrency(item.unitPrice)} · added {formatDateTime(item.addedAt)}
              </p>
              {!item.available && <p className="text-[11px] text-amber-600">Out of stock or no longer listed</p>}
            </div>
            <span className="font-semibold text-black dark:text-white whitespace-nowrap">{formatCurrency(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);
