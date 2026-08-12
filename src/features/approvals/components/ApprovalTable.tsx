import React from 'react';
import { Loader2, Eye, Check, X } from 'lucide-react';
import type { ProfileApprovalRequest } from '../types/approval.types';

interface ApprovalTableProps {
  approvals: ProfileApprovalRequest[];
  isLoading: boolean;
  onPreview: (item: ProfileApprovalRequest) => void;
  onInitiateApprove: (requestId: number) => void;
  onInitiateReject: (requestId: number) => void;
  formatTime: (isoString: string) => string;
}

export const ApprovalTable: React.FC<ApprovalTableProps> = ({
  approvals,
  isLoading,
  onPreview,
  onInitiateApprove,
  onInitiateReject,
  formatTime,
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-black/[0.02] dark:bg-white/[0.02]">
        <h2 className="font-semibold text-base text-black dark:text-white">Action Required</h2>
        <span className="text-xs text-gray-500 dark:text-neutral-400">
          Showing {approvals.length} pending requests
        </span>
      </div>

      {isLoading ? (
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-xs">Fetching profile approvals...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-xs text-gray-500 dark:text-neutral-400 uppercase bg-black/5 dark:bg-white/5">
                <th className="py-3 px-4 font-medium">Request ID</th>
                <th className="py-3 px-4 font-medium">Employee Code</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Requester</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 font-medium">Time</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10 text-sm">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-neutral-400 text-sm">
                    No pending profile approvals found.
                  </td>
                </tr>
              ) : (
                approvals.map((item) => (
                  <tr
                    key={item.requestId}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black dark:text-white"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs">REQ-{item.requestId}</td>
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold">{item.employeeCode}</td>
                    <td className="py-3.5 px-4 font-medium">Profile Update</td>
                    <td className="py-3.5 px-4 text-gray-500 dark:text-neutral-400">
                      @{item.requestedByUsername}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 dark:text-neutral-400 text-xs">
                      {item.department || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 dark:text-neutral-400 text-xs">
                      {formatTime(item.requestedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onPreview(item)}
                          title="Preview Details"
                          className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onInitiateApprove(item.requestId)}
                          title="Approve Request"
                          className="p-2 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onInitiateReject(item.requestId)}
                          title="Reject Request"
                          className="p-2 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};