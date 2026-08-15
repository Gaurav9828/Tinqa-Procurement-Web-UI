import { useState } from 'react';
import {
  Loader2,
  Eye,
  Check,
  X,
  FileText,
  UserCheck,
  Tag,
  Clock,
  HardDrive,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import type { ProfileApprovalRequest, DocumentApprovalItem } from '../types/approval.types';

export type ApprovalItem = DocumentApprovalItem | ProfileApprovalRequest | Record<string, any>;

interface ApprovalTableProps<T extends ApprovalItem = ApprovalItem> {
  approvals: T[];
  isLoading: boolean;
  onPreview: (item: T) => void;
  onInitiateApprove: (id: number) => void;
  onInitiateReject: (id: number) => void;
  formatTime: (isoString: string) => string;
}

export const ApprovalTable = <T extends ApprovalItem>({
  approvals,
  isLoading,
  onPreview,
  onInitiateApprove,
  onInitiateReject,
  formatTime,
}: ApprovalTableProps<T>) => {
  const [alertState, setAlertState] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const getItemId = (item: T): number => {
    if ('id' in item && typeof item.id === 'number') return item.id;
    if ('requestId' in item && typeof item.requestId === 'number') return item.requestId;
    return 0;
  };

  const getItemTime = (item: T): string => {
    if ('createdAt' in item && item.createdAt) return item.createdAt;
    if ('requestedAt' in item && item.requestedAt) return item.requestedAt;
    return '';
  };

  const getItemTitle = (item: T): { title: string; subtitle?: string } => {
    if ('originalFileName' in item && item.originalFileName) {
      return {
        title: item.originalFileName,
        subtitle: item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} KB` : undefined,
      };
    }
    if ('employeeCode' in item && item.employeeCode) {
      return {
        title: `Emp Code: ${item.employeeCode}`,
        subtitle: item.requestedByUsername ? `@${item.requestedByUsername}` : undefined,
      };
    }
    return { title: `Request #${getItemId(item)}` };
  };

  const renderTypeBadge = (item: T) => {
    if ('originalFileName' in item || 'category' in item) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <FileText className="w-3.5 h-3.5" />
          Document
        </span>
      );
    }
    if ('employeeCode' in item || 'displayName' in item) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <UserCheck className="w-3.5 h-3.5" />
          Profile Update
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
        <HelpCircle className="w-3.5 h-3.5" />
        General
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {alertState && (
        <Alert
          type={alertState.type}
          message={alertState.message}
          onClose={() => setAlertState(null)}
        />
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base text-black dark:text-white">Action Required</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {approvals.length} Pending
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-neutral-400 hidden sm:inline">
            Review and take action on incoming submissions
          </span>
        </div>

        {isLoading ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-neutral-400">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            <p className="text-xs font-medium">Loading approval queue...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-xs text-gray-500 dark:text-neutral-400 uppercase bg-black/5 dark:bg-white/5 font-semibold">
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Approval Type</th>
                  <th className="py-3 px-4">Subject / Item Details</th>
                  <th className="py-3 px-4">Category & Purpose</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10 text-sm">
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-neutral-400 text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                        <p className="font-medium text-black dark:text-white">All caught up!</p>
                        <p className="text-xs text-gray-400">There are no pending requests requiring your approval.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  approvals.map((item) => {
                    const id = getItemId(item);
                    const { title, subtitle } = getItemTitle(item);
                    const rawTime = getItemTime(item);

                    return (
                      <tr
                        key={id}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-black dark:text-white"
                      >
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-700 dark:text-neutral-300">
                          #{id}
                        </td>

                        <td className="py-3.5 px-4">
                          {renderTypeBadge(item)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm truncate max-w-xs">{title}</span>
                            {subtitle && (
                              <span className="text-xs text-gray-400 font-mono mt-0.5">{subtitle}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-neutral-400">
                          <div className="space-y-1">
                            {'category' in item && item.category && (
                              <div className="flex items-center gap-1">
                                <Tag className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="font-medium text-black dark:text-white">{item.category}</span>
                              </div>
                            )}
                            {'purpose' in item && item.purpose && (
                              <div className="flex items-center gap-1 text-gray-400 truncate max-w-[180px]">
                                <HardDrive className="w-3 h-3 text-gray-400 shrink-0" />
                                <span>{item.purpose}</span>
                              </div>
                            )}
                            {'department' in item && item.department && (
                              <span className="inline-block px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 font-medium text-gray-700 dark:text-neutral-300">
                                {item.department}
                              </span>
                            )}
                            {!('category' in item) && !('purpose' in item) && !('department' in item) && (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-neutral-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{rawTime ? formatTime(rawTime) : 'N/A'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onPreview(item)}
                              title="Preview Request Details"
                              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onInitiateApprove(id)}
                              title="Approve Request"
                              className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onInitiateReject(id)}
                              title="Reject Request"
                              className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};