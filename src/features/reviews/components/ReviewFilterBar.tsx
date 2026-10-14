import React from 'react';
import { X } from 'lucide-react';
import { ProductPicker } from './ProductPicker';
import type { AdminReviewFilters } from '../hooks/useAdminReviews';
import type { ReviewProductOption } from '../hooks/useReviewProductOptions';
import { REVIEW_RATINGS, type ReviewStatusFilter } from '../types/review.types';

interface Props {
  filters: AdminReviewFilters;
  productOptions: ReviewProductOption[];
  isLoadingProducts: boolean;
  hasActiveFilters: boolean;
  onFilterChange: <K extends keyof AdminReviewFilters>(key: K, value: AdminReviewFilters[K]) => void;
  onReset: () => void;
}

const selectClass =
  'px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] cursor-pointer';

export const ReviewFilterBar: React.FC<Props> = ({
  filters,
  productOptions,
  isLoadingProducts,
  hasActiveFilters,
  onFilterChange,
  onReset,
}) => (
  <div className="flex flex-col lg:flex-row gap-3">
    <ProductPicker
      className="flex-1 min-w-0"
      options={productOptions}
      isLoading={isLoadingProducts}
      value={filters.productId}
      onChange={(productId) => onFilterChange('productId', productId)}
    />

    <div className="grid grid-cols-2 sm:flex gap-3">
      <select
        aria-label="Filter by rating"
        value={filters.rating ?? ''}
        onChange={(e) => onFilterChange('rating', e.target.value ? Number(e.target.value) : null)}
        className={`${selectClass} sm:w-36`}
      >
        <option value="">All ratings</option>
        {REVIEW_RATINGS.map((rating) => (
          <option key={rating} value={rating}>
            {rating} star{rating === 1 ? '' : 's'}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by status"
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value as ReviewStatusFilter)}
        className={`${selectClass} sm:w-36`}
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="hidden">Hidden</option>
      </select>

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
);
