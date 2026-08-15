import React from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { EmployeeConstants } from '../types/employee.types';
import type { EmployeeStatus } from '../types/employee.types';

interface Props {
  searchQuery: string;
  selectedStatus: EmployeeStatus | '';
  onSearchChange: (value: string) => void;
  onStatusChange: (status: EmployeeStatus | '') => void;
  onOpenCreateModal: () => void;
}

export const EmployeeFilterBar: React.FC<Props> = ({
  searchQuery,
  selectedStatus,
  onSearchChange,
  onStatusChange,
  onOpenCreateModal,
}) => {
  return (
    <div className="apple-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-1 items-center gap-3 w-full">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, code, department, phone..."
            className="w-full pl-10 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#0071e3] transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="relative min-w-[180px]">
          <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as EmployeeStatus | '')}
            className="w-full pl-10 pr-8 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#0071e3] transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value={EmployeeConstants.ACTIVE}>ACTIVE</option>
            <option value={EmployeeConstants.FIRST_LOGIN}>FIRST_LOGIN</option>
            <option value={EmployeeConstants.BLOCKED}>BLOCKED</option>
            <option value={EmployeeConstants.IN_ACTIVE}>IN_ACTIVE</option>
            <option value={EmployeeConstants.WAITING_FOR_DELETION}>
              WAITING_FOR_DELETION
            </option>
          </select>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onOpenCreateModal}
        className="w-full md:w-auto px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm"
      >
        <Plus className="w-4 h-4" /> Add Employee
      </button>
    </div>
  );
};