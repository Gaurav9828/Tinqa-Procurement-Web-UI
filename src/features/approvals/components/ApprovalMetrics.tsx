import React from 'react';
import type { UnifiedApprovalItem } from '../types/approval.types';

interface ApprovalMetricsProps {
  approvals: UnifiedApprovalItem[];
}

export const ApprovalMetrics: React.FC<ApprovalMetricsProps> = ({ approvals }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase">
          Pending Profiles
        </p>
        <p className="text-3xl font-bold mt-2 text-black dark:text-white">{approvals.length}</p>
      </div>
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase">
          Auction Approvals
        </p>
        <p className="text-3xl font-bold mt-2 text-amber-500">0</p>
      </div>
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase">
          Order / Payment Approvals
        </p>
        <p className="text-3xl font-bold mt-2 text-blue-500">{approvals.filter((a) => a.approvalType == 'ORDERS').length}</p>
      </div>
    </div>
  );
};