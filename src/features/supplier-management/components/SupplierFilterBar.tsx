import React from 'react';
import { Search, Plus } from 'lucide-react';
import type { CategoryResponse } from '../types/supplier.types';

export interface SupplierFilterBarProps {
  searchQuery: string;
  /** Shared with the table's Categories column filter, which can pick several. */
  selectedCategoryIds: number[];
  categories: CategoryResponse[];
  onSearchChange: (value: string) => void;
  /** Enter in the search box: search now instead of waiting for typing to pause. */
  onSearchSubmit?: () => void;
  onCategoryChange: (categoryIds: number[]) => void;
  /** Hidden when absent (no permission). */
  onOpenCreateSupplierModal?: () => void;
}

const MULTIPLE = 'multiple';

export const SupplierFilterBar: React.FC<SupplierFilterBarProps> = ({
  searchQuery,
  selectedCategoryIds,
  categories,
  onSearchChange,
  onSearchSubmit,
  onCategoryChange,
  onOpenCreateSupplierModal,
}) => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-2xl">
    <div className="flex flex-1 items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
          placeholder="Search suppliers by name, GSTIN, phone, city..."
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
        />
      </div>
      <select
        aria-label="Category"
        value={selectedCategoryIds.length > 1 ? MULTIPLE : String(selectedCategoryIds[0] ?? '')}
        onChange={(e) => onCategoryChange(e.target.value ? [Number(e.target.value)] : [])}
        className="px-3 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white cursor-pointer"
      >
        <option value="">All Categories</option>
        {selectedCategoryIds.length > 1 && (
          <option value={MULTIPLE} disabled>
            {selectedCategoryIds.length} categories
          </option>
        )}
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
      {onOpenCreateSupplierModal && (
      <button
        type="button"
        onClick={onOpenCreateSupplierModal}
        className="px-4 py-2 bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Add Supplier
      </button>
      )}
    </div>
  </div>
);