import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  requestId: number | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  requestId,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || requestId === null) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Rejection reason is mandatory.');
      return;
    }
    setError('');
    onSubmit(reason.trim());
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-3">
          <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">
            Reject Request #REQ-{requestId}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-black dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase mb-2">
              Reason for Rejection <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Provide a clear reason for rejecting this profile update..."
              className="w-full p-3 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
            {error && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-sm"
            >
              Proceed to Confirmation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};