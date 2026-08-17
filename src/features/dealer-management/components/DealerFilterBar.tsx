import React from 'react';
import { Search, Plus } from 'lucide-react';
import type { CategoryResponse } from '../types/dealer.types';

export interface DealerFilterBarProps {
  searchQuery: string;
  selectedCategoryId?: number;
  categories: CategoryResponse[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (categoryId: number | undefined) => void;
  onOpenCreateDealerModal: () => void;
  onOpenCreateCategoryModal: () => void;
}

export const DealerFilterBar: React.FC<DealerFilterBarProps> = ({
  searchQuery,
  selectedCategoryId,
  categories,
  onSearchChange,
  onCategoryChange,
  onOpenCreateDealerModal,
  onOpenCreateCategoryModal,
}) => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-2xl">
    <div className="flex flex-1 items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search dealers by name, GSTIN, phone, city..."
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
        />
      </div>
      <select
        value={selectedCategoryId || ''}
        onChange={(e) =>
          onCategoryChange(e.target.value ? Number(e.target.value) : undefined)
        }
        className="px-3 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white cursor-pointer"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
      <button
        type="button"
        onClick={onOpenCreateCategoryModal}
        className="px-3 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
      >
        + Category
      </button>
      <button
        type="button"
        onClick={onOpenCreateDealerModal}
        className="px-4 py-2 bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Add Dealer
      </button>
    </div>
  </div>
);