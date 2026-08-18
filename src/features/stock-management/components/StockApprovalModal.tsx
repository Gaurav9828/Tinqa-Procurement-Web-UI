import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import type { ApprovalDecisionRequest, StockResponse } from '../types/stock.types';

interface Props {
  isOpen: boolean;
  stock: StockResponse | null;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onRequestSubmit: (payload: ApprovalDecisionRequest) => void;
}

export const StockApprovalModal: React.FC<Props> = ({
  isOpen,
  stock,
  isSubmitting,
  error: externalError,
  onClose,
  onRequestSubmit,
}) => {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Sync external API error
  useEffect(() => {
    if (externalError) {
      setDisplayError(externalError);
    }
  }, [externalError]);

  // Reset state when modal visibility changes
  useEffect(() => {
    if (isOpen) {
      setDecision('APPROVED');
      setRejectionReason('');
      setDisplayError(null);
    }
  }, [isOpen]);

  if (!isOpen || !stock) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (decision === 'REJECTED' && !rejectionReason.trim()) {
      setDisplayError('Please provide a reason for rejection.');
      return;
    }

    setDisplayError(null);
    onRequestSubmit({
      status: decision,
      rejectionReason: decision === 'REJECTED' ? rejectionReason.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-2xl border border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
          <h3 className="text-base font-semibold text-black dark:text-white">
            Admin L2 Approval Decision
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server / Form Error Alert */}
          {displayError && (
            <Alert
              type="error"
              message={displayError}
              onClose={() => setDisplayError(null)}
            />
          )}

          <p className="text-xs text-gray-500">
            Stock Identity: <span className="font-mono text-black dark:text-white font-semibold">{stock.stockIdentityNumber}</span>
          </p>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setDisplayError(null);
                setDecision('APPROVED');
              }}
              className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer ${
                decision === 'APPROVED'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                  : 'border-black/10 dark:border-white/10 text-gray-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => {
                setDisplayError(null);
                setDecision('REJECTED');
              }}
              className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer ${
                decision === 'REJECTED'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                  : 'border-black/10 dark:border-white/10 text-gray-500'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>

          {decision === 'REJECTED' && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => {
                  setDisplayError(null);
                  setRejectionReason(e.target.value);
                }}
                placeholder="State rejection cause..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (decision === 'REJECTED' && !rejectionReason.trim())}
              className="px-4 py-2 text-xs font-medium bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Processing...' : 'Submit Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};