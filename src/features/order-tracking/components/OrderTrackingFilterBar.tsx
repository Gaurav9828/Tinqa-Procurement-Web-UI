import React from 'react';
import { Search, X } from 'lucide-react';
import type { AdminOrderSort, TrackingStatusOption } from '../types/orderTracking.types';
import type { AdminOrderFilters } from '../hooks/useAdminOrders';
import { ADMIN_ORDERS_SEARCH_MAX_LENGTH } from '../hooks/useAdminOrders';
import { formatStatusLabel } from '../utils/orderTracking.utils';

const SORT_OPTIONS: { value: AdminOrderSort; label: string }[] = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'totalAmount,desc', label: 'Highest total' },
  { value: 'totalAmount,asc', label: 'Lowest total' },
  { value: 'orderNumber,asc', label: 'Order number (A–Z)' },
  { value: 'orderStatus,asc', label: 'Status (A–Z)' },
];

interface Props {
  filters: AdminOrderFilters;
  statuses: TrackingStatusOption[];
  hasActiveFilters: boolean;
  dateRangeInvalid: boolean;
  onFilterChange: <K extends keyof AdminOrderFilters>(key: K, value: AdminOrderFilters[K]) => void;
  onReset: () => void;
}

const controlClass =
  'px-3 py-2 text-xs rounded-xl border bg-white dark:bg-[#1c1c1e] focus:outline-none focus:ring-2 focus:ring-[#0071e3] cursor-pointer';

export const OrderTrackingFilterBar: React.FC<Props> = ({
  filters,
  statuses,
  hasActiveFilters,
  dateRangeInvalid,
  onFilterChange,
  onReset,
}) => {
  const dateBorder = dateRangeInvalid ? 'border-red-500/80' : 'border-black/10 dark:border-white/10';

  return (
    <div className="space-y-2">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            aria-label="Search orders"
            placeholder="Search order number, item, customer name or email"
            value={filters.search}
            maxLength={ADMIN_ORDERS_SEARCH_MAX_LENGTH}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className={`${controlClass} w-full pl-9 border-black/10 dark:border-white/10 cursor-text`}
          />
        </div>

        <div className="grid grid-cols-2 sm:flex gap-3">
          <select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className={`${controlClass} sm:w-48 border-black/10 dark:border-white/10`}
          >
            <option value="">All statuses</option>
            {statuses.map((option) => (
              <option key={option.status} value={option.status}>
                {formatStatusLabel(option.status)}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort orders"
            value={filters.sort}
            onChange={(e) => onFilterChange('sort', e.target.value as AdminOrderSort)}
            className={`${controlClass} sm:w-44 border-black/10 dark:border-white/10`}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            aria-label="From date"
            value={filters.fromDate}
            max={filters.toDate || undefined}
            onChange={(e) => onFilterChange('fromDate', e.target.value)}
            className={`${controlClass} ${dateBorder}`}
          />
          <input
            type="date"
            aria-label="To date"
            value={filters.toDate}
            min={filters.fromDate || undefined}
            onChange={(e) => onFilterChange('toDate', e.target.value)}
            className={`${controlClass} ${dateBorder}`}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 cursor-pointer whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>
      {dateRangeInvalid && (
        <p role="alert" className="text-[11px] text-red-500 px-1">
          "From date" must be on or before "To date".
        </p>
      )}
    </div>
  );
};
