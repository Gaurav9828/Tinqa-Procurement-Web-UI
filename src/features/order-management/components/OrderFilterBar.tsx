import React from 'react';
import { Search, Plus } from 'lucide-react';


import type { DealerResponse } from '../../dealer-management/types/dealer.types';
import { ORDER_STATUS, type OrderStatus } from '../../../types/common.types';

interface OrderFilterBarProps {
  searchQuery: string;
  selectedStatus?: OrderStatus;
  selectedDealerId?: number;
  dealers: DealerResponse[];
  onSearchChange: (val: string) => void;
  onStatusChange: (status?: OrderStatus) => void;
  onDealerChange: (dealerId?: number) => void;
  onOpenCreateOrderModal: () => void;
}

export const OrderFilterBar: React.FC<OrderFilterBarProps> = ({
  searchQuery,
  selectedStatus,
  selectedDealerId,
  dealers,
  onSearchChange,
  onStatusChange,
  onDealerChange,
  onOpenCreateOrderModal,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-2xl">
      <div className="flex flex-1 flex-wrap items-center gap-2 w-full">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by order number or item..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={selectedStatus || ''}
          onChange={(e) => onStatusChange(e.target.value ? (e.target.value as OrderStatus) : undefined)}
          className="px-3 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white cursor-pointer"
        >
          <option value="">All Statuses</option>
          {ORDER_STATUS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* Dealer Dropdown */}
        <select
          value={selectedDealerId || ''}
          onChange={(e) => onDealerChange(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white cursor-pointer"
        >
          <option value="">All Dealers</option>
          {dealers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onOpenCreateOrderModal}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
      >
        <Plus className="w-4 h-4" /> Create Order
      </button>
    </div>
  );
};