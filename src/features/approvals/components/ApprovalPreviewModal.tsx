import React from 'react';
import {
  X,
  FileText,
  UserCheck,
  Check,
  Clock,
  HardDrive,
  Tag,
  Mail,
  Phone,
  Building,
  Briefcase,
  User,
  Calendar,
  Download,
  Loader2,
} from 'lucide-react';
import type { UnifiedApprovalItem } from '../types/approval.types';

export interface PreviewModalProps {
  request: UnifiedApprovalItem | null;
  isOpen: boolean;
  isDownloading?: boolean;
  onClose: () => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
  onDownload?: (documentId: number, fileName: string) => void;
  formatTime: (isoString: string) => string;
}

export const ApprovalPreviewModal: React.FC<PreviewModalProps> = ({
  request,
  isOpen,
  isDownloading = false,
  onClose,
  onApprove,
  onReject,
  onDownload,
  formatTime,
}) => {
  if (!isOpen || !request) return null;

  const targetId = request.approvalType === 'DOCUMENT' ? request.id : request.requestId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              request.approvalType === 'DOCUMENT' 
                ? 'bg-blue-500/10 text-blue-500' 
                : 'bg-purple-500/10 text-purple-500'
            }`}>
              {request.approvalType === 'DOCUMENT' ? (
                <FileText className="w-5 h-5" />
              ) : (
                <UserCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-lg text-black dark:text-white">
                {request.approvalType === 'DOCUMENT' 
                  ? 'Document Approval Details' 
                  : 'Profile Update Details'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-neutral-400 font-mono">
                Ref ID: #{targetId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          
          {/* ================= DOCUMENT PREVIEW ================= */}
          {request.approvalType === 'DOCUMENT' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase">
                    File Name
                  </label>
                  <p className="font-semibold text-base text-black dark:text-white break-all">
                    {request.originalFileName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">File Size:</span>
                    <p className="font-medium font-mono text-black dark:text-white mt-0.5">
                      {(request.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">Content Type:</span>
                    <p className="font-medium text-black dark:text-white mt-0.5">
                      {request.contentType}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Tag className="w-3.5 h-3.5 text-blue-500" />
                    <span>Category</span>
                  </div>
                  <p className="font-medium text-black dark:text-white">{request.category}</p>
                </div>

                <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <HardDrive className="w-3.5 h-3.5 text-purple-500" />
                    <span>Purpose</span>
                  </div>
                  <p className="font-medium text-black dark:text-white">{request.purpose}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Submitted at: {formatTime(request.createdAt)}</span>
              </div>

              {/* Download Action Trigger (View Only Callback) */}
              <button
                type="button"
                onClick={() => onDownload?.(request.id, request.originalFileName)}
                disabled={isDownloading}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-500/20 transition-colors w-full justify-center text-xs cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading Document...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Document Attachment
                  </>
                )}
              </button>
            </div>
          )}

          {/* ================= PROFILE PREVIEW ================= */}
          {request.approvalType === 'PROFILE' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase">
                      Requester Employee
                    </label>
                    <p className="font-semibold text-lg text-black dark:text-white">
                      {request.displayName || `${request.firstName || ''} ${request.lastName || ''} ${request.employeeCode || ''}`.trim() || 'N/A'}
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Emp Code: {request.employeeCode}
                  </span>
                </div>

                <p className="text-xs text-gray-500">
                  Requested by: <span className="font-medium text-black dark:text-white">@{request.requestedByUsername}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="truncate">
                    <span className="text-gray-400 block text-[10px]">Email</span>
                    <span className="font-medium truncate text-black dark:text-white">{request.personalEmail || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">Phone</span>
                    <span className="font-medium text-black dark:text-white">{request.primaryPhone || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">Department</span>
                    <span className="font-medium text-black dark:text-white">{request.department || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">Designation</span>
                    <span className="font-medium text-black dark:text-white">{request.designation || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">Gender</span>
                    <span className="font-medium text-black dark:text-white">{request.gender || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-cyan-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">Date of Birth</span>
                    <span className="font-medium text-black dark:text-white">{request.dateOfBirth || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Requested at: {formatTime(request.requestedAt)}</span>
              </div>
            </div>
          )}

        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-black/10 dark:border-white/10 flex justify-end gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            onClick={() => onReject(targetId)}
            className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={() => onApprove(targetId)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" />
            Approve
          </button>
        </div>

      </div>
    </div>
  );
};