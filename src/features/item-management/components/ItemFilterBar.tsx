import React from 'react';
import { Search, Plus, Filter, FolderPlus } from 'lucide-react';
import type { CategoryResponse } from '../types/item.types';

interface Props {
  searchQuery: string;
  selectedCategoryId?: number;
  categories: CategoryResponse[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (categoryId: number | undefined) => void;
  onOpenCreateItemModal: () => void;
  onOpenCreateCategoryModal: () => void;
}

export const ItemFilterBar: React.FC<Props> = ({
  searchQuery,
  selectedCategoryId,
  categories,
  onSearchChange,
  onCategoryChange,
  onOpenCreateItemModal,
  onOpenCreateCategoryModal,
}) => {
  return (
    <div className="apple-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-1 items-center gap-3 w-full">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by item name or code..."
            className="w-full pl-10 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#0071e3] transition-colors"
          />
        </div>

        <div className="relative min-w-[180px]">
          <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={selectedCategoryId || ''}
            onChange={(e) =>
              onCategoryChange(e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full pl-10 pr-8 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#0071e3] transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <button
          onClick={onOpenCreateCategoryModal}
          className="flex-1 md:flex-none px-3 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <FolderPlus className="w-4 h-4 text-[#0071e3]" /> Add Category
        </button>
        <button
          onClick={onOpenCreateItemModal}
          className="flex-1 md:flex-none px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>
    </div>
  );
};