import React from 'react';
import { Search, Plus } from 'lucide-react';

interface ProductFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onOpenCreateModal: () => void;
}

export const ProductFilterBar: React.FC<ProductFilterBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenCreateModal,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-2xl text-xs">
      <div className="relative flex-1 min-w-[200px] w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by product title, tagline..."
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
        />
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white cursor-pointer w-full sm:w-auto"
        >
          <option value="ALL">All Statuses</option>
          <option value="ENABLED">Enabled</option>
          <option value="DISABLED">Disabled</option>
        </select>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Product
        </button>
      </div>
    </div>
  );
};