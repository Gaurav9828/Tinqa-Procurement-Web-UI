import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  actionType: 'APPROVE' | 'REJECT' | null;
  requestId: number | null;
  rejectionReason?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  actionType,
  requestId,
  rejectionReason,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !actionType || requestId === null) return null;

  const isApprove = actionType === 'APPROVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-4 text-center">
        <div className="flex justify-center">
          {isApprove ? (
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : (
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full">
              <AlertTriangle className="w-8 h-8" />
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-black dark:text-white">
          Confirm {isApprove ? 'Approval' : 'Rejection'}
        </h3>

        <p className="text-xs text-gray-500 dark:text-neutral-400">
          Are you sure you want to {isApprove ? 'approve' : 'reject'} profile update request{' '}
          <span className="font-mono font-bold text-black dark:text-white">#REQ-{requestId}</span>?
        </p>

        {!isApprove && rejectionReason && (
          <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-left border border-black/5 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
              Recorded Reason
            </span>
            <p className="text-xs italic text-gray-600 dark:text-neutral-300">
              "{rejectionReason}"
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm flex items-center justify-center gap-2 ${
              isApprove ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
            } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              `Yes, ${isApprove ? 'Approve' : 'Reject'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};