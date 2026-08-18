import React from 'react';
import { Search, Plus } from 'lucide-react';
import type { ApprovalStatus } from '../../../types/common.types';

interface StockFilterBarProps {
  searchQuery: string;
  selectedStatus?: ApprovalStatus;
  onSearchChange: (val: string) => void;
  onStatusChange: (status?: ApprovalStatus) => void;
  onOpenCreateModal: () => void;
}

export const StockFilterBar: React.FC<StockFilterBarProps> = ({
  searchQuery,
  selectedStatus,
  onSearchChange,
  onStatusChange,
  onOpenCreateModal,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-2xl">
      <div className="flex flex-1 items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search stocks by batch or identity..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
          />
        </div>
        <select
          value={selectedStatus || ''}
          onChange={(e) => onStatusChange(e.target.value ? (e.target.value as ApprovalStatus) : undefined)}
          className="px-3 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white cursor-pointer"
        >
          <option value="">All Approval Statuses</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PENDING">PENDING</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>
      <button
        type="button"
        onClick={onOpenCreateModal}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl text-xs font-medium shadow-sm transition-all cursor-pointer w-full sm:w-auto justify-center"
      >
        <Plus className="w-4 h-4" />
        <span>Add Stock</span>
      </button>
    </div>
  );
};