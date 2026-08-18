import React from 'react';
import type { ApprovalStatus } from '../../../types/common.types';

interface Props {
  status: ApprovalStatus;
}

export const StockStatusBadge: React.FC<Props> = ({ status }) => {
  const styles: Record<ApprovalStatus, string> = {
    APPROVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    REJECTED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
        styles[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  );
};