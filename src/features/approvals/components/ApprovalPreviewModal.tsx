import React from 'react';
import { X, Clock, User, Building, Phone, Mail, Calendar } from 'lucide-react';
import type { ProfileApprovalRequest } from '../types/approval.types';
import { DetailCard } from './DetailCard';

interface PreviewModalProps {
  request: ProfileApprovalRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
  formatTime: (isoString: string) => string;
}

export const ApprovalPreviewModal: React.FC<PreviewModalProps> = ({
  request,
  isOpen,
  onClose,
  onApprove,
  onReject,
  formatTime,
}) => {
  if (!isOpen || !request) return null;

  const modifiedFieldsCount = [
    request.displayName,
    request.firstName,
    request.middleName,
    request.lastName,
    request.department,
    request.designation,
    request.primaryPhone,
    request.alternatePhone,
    request.personalEmail,
    request.dateOfBirth,
    request.gender,
  ].filter((val) => val !== null && val !== undefined && val !== '').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="apple-card w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-black dark:text-white">Profile Update Request</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                REQ-{request.requestId}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
              Target Employee Code: <span className="font-mono font-semibold text-black dark:text-white">{request.employeeCode}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/50 text-xs">
            <div>
              <span className="text-gray-400 block mb-1">Requested By</span>
              <span className="font-semibold text-sm text-black dark:text-white">@{request.requestedByUsername}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Submitted</span>
              <span className="font-semibold text-sm flex items-center gap-1 text-black dark:text-white">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {formatTime(request.requestedAt)}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {request.status}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
              Proposed Field Modifications ({modifiedFieldsCount})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailCard icon={<User className="w-4 h-4 text-blue-500" />} label="First Name" value={request.firstName} />
              <DetailCard icon={<User className="w-4 h-4 text-blue-500" />} label="Middle Name" value={request.middleName} />
              <DetailCard icon={<User className="w-4 h-4 text-blue-500" />} label="Last Name" value={request.lastName} />
              <DetailCard icon={<User className="w-4 h-4 text-blue-500" />} label="Display Name" value={request.displayName} />
              <DetailCard icon={<Building className="w-4 h-4 text-amber-500" />} label="Department" value={request.department} />
              <DetailCard icon={<Building className="w-4 h-4 text-amber-500" />} label="Designation" value={request.designation} />
              <DetailCard icon={<Phone className="w-4 h-4 text-emerald-500" />} label="Primary Phone" value={request.primaryPhone} />
              <DetailCard icon={<Phone className="w-4 h-4 text-emerald-500" />} label="Alternate Phone" value={request.alternatePhone} />
              <DetailCard icon={<Mail className="w-4 h-4 text-purple-500" />} label="Personal Email" value={request.personalEmail} />
              <DetailCard icon={<Calendar className="w-4 h-4 text-rose-500" />} label="Date of Birth" value={request.dateOfBirth} />
              <DetailCard icon={<User className="w-4 h-4 text-gray-500" />} label="Gender" value={request.gender} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onReject(request.requestId)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1.5"
            >
              Reject Request
            </button>
            <button
              onClick={() => onApprove(request.requestId)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-sm"
            >
              Approve Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};