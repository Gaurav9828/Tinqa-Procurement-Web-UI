import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, KeyRound, Trash2, Send, RefreshCw, HelpCircle } from 'lucide-react';

export type ConfirmationActionType =
  | 'APPROVE'
  | 'REJECT'
  | 'CHANGE_PASSWORD'
  | 'DELETE'
  | 'SUBMIT'
  | 'UPDATE'
  | 'CONFIRM'
  | null;

interface ConfirmationModalProps {
  isOpen: boolean;
  actionType: ConfirmationActionType;
  requestId?: number | string | null;
  title?: string;
  description?: string;
  rejectionReason?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

// Configuration helper for dynamic visual elements & text
const getModalConfig = (
  actionType: ConfirmationActionType,
  requestId?: number | string | null,
  customTitle?: string,
  customDescription?: string
) => {
  switch (actionType) {
    case 'APPROVE':
      return {
        icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
        iconBg: 'bg-emerald-500/10',
        title: customTitle || 'Confirm Approval',
        description:
          customDescription ||
          (requestId
            ? `Are you sure you want to approve request #${requestId}?`
            : 'Are you sure you want to approve this action?'),
        confirmBtnText: 'Yes, Approve',
        confirmBtnBg: 'bg-emerald-500 hover:bg-emerald-600',
      };

    case 'REJECT':
      return {
        icon: <AlertTriangle className="w-8 h-8 text-rose-500" />,
        iconBg: 'bg-rose-500/10',
        title: customTitle || 'Confirm Rejection',
        description:
          customDescription ||
          (requestId
            ? `Are you sure you want to reject request #${requestId}?`
            : 'Are you sure you want to reject this request?'),
        confirmBtnText: 'Yes, Reject',
        confirmBtnBg: 'bg-rose-500 hover:bg-rose-600',
      };

    case 'CHANGE_PASSWORD':
      return {
        icon: <KeyRound className="w-8 h-8 text-[#0071e3]" />,
        iconBg: 'bg-blue-500/10',
        title: customTitle || 'Change Password',
        description:
          customDescription ||
          'Are you sure you want to update your password? You may need to log in again after updating.',
        confirmBtnText: 'Update Password',
        confirmBtnBg: 'bg-[#0071e3] hover:bg-[#0077ed]',
      };

    case 'DELETE':
      return {
        icon: <Trash2 className="w-8 h-8 text-rose-500" />,
        iconBg: 'bg-rose-500/10',
        title: customTitle || 'Confirm Deletion',
        description:
          customDescription ||
          (requestId
            ? `Are you sure you want to delete item #${requestId}? This action cannot be undone.`
            : 'Are you sure you want to delete this item? This action cannot be undone.'),
        confirmBtnText: 'Yes, Delete',
        confirmBtnBg: 'bg-rose-500 hover:bg-rose-600',
      };

    case 'SUBMIT':
      return {
        icon: <Send className="w-8 h-8 text-[#0071e3]" />,
        iconBg: 'bg-blue-500/10',
        title: customTitle || 'Confirm Submission',
        description: customDescription || 'Are you sure you want to submit this request for processing?',
        confirmBtnText: 'Yes, Submit',
        confirmBtnBg: 'bg-[#0071e3] hover:bg-[#0077ed]',
      };

    case 'UPDATE':
      return {
        icon: <RefreshCw className="w-8 h-8 text-amber-500" />,
        iconBg: 'bg-amber-500/10',
        title: customTitle || 'Confirm Update',
        description: customDescription || 'Are you sure you want to save these changes?',
        confirmBtnText: 'Save Changes',
        confirmBtnBg: 'bg-amber-500 hover:bg-amber-600',
      };

    case 'CONFIRM':
    default:
      return {
        icon: <HelpCircle className="w-8 h-8 text-gray-500" />,
        iconBg: 'bg-gray-500/10',
        title: customTitle || 'Please Confirm',
        description: customDescription || 'Are you sure you want to proceed with this action?',
        confirmBtnText: 'Confirm',
        confirmBtnBg: 'bg-[#0071e3] hover:bg-[#0077ed]',
      };
  }
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  actionType,
  requestId,
  title,
  description,
  rejectionReason,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !actionType) return null;

  const config = getModalConfig(actionType, requestId, title, description);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-4 text-center">
        {/* Dynamic Icon */}
        <div className="flex justify-center">
          <div className={`p-3 rounded-full ${config.iconBg}`}>{config.icon}</div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-black dark:text-white">{config.title}</h3>

        {/* Description */}
        <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed">
          {config.description}
        </p>

        {/* Optional Rejection Reason Preview */}
        {actionType === 'REJECT' && rejectionReason && (
          <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-left border border-black/5 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
              Recorded Reason
            </span>
            <p className="text-xs italic text-gray-600 dark:text-neutral-300">
              "{rejectionReason}"
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${config.confirmBtnBg} disabled:opacity-50`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              config.confirmBtnText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};