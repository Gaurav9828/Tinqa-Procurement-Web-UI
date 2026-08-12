import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, FileText, AlertTriangle } from 'lucide-react';
import type { ApprovalItem } from '../../../api/services/approvalService';

interface ApprovalReviewModalProps {
  item: ApprovalItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, action: 'APPROVE' | 'REJECT', reason?: string) => void;
}

export const ApprovalReviewModal: React.FC<ApprovalReviewModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!isOpen || !item) return null;

  const handleApprove = () => {
    onConfirm(item.id, 'APPROVE');
    onClose();
  };

  const handleReject = () => {
    if (!isRejecting) {
      setIsRejecting(true);
      return;
    }
    if (!rejectionReason.trim()) return;
    onConfirm(item.id, 'REJECT', rejectionReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl apple-card bg-apple-surface p-6 shadow-2xl space-y-6 relative border border-apple-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-apple-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-apple-sm bg-apple-blue/10 text-apple-blue">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Verification Review: {item.id}</h2>
              <p className="text-xs text-apple-subtext">Requester: {item.requesterName} ({item.requesterRole})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-apple-subtext hover:text-apple-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm bg-black/5 dark:bg-white/5 p-4 rounded-apple-sm">
            <div>
              <span className="text-xs text-apple-subtext block uppercase font-medium">Request Type</span>
              <span className="font-semibold">{item.type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-xs text-apple-subtext block uppercase font-medium">Submitted At</span>
              <span className="font-semibold">{item.submittedAt}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-apple-subtext uppercase">Submitted Details</h3>
            <div className="border border-apple-border rounded-apple-sm p-4 font-mono text-xs space-y-1 bg-black/5 dark:bg-white/5">
              {Object.entries(item.details || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-apple-border/50 py-1">
                  <span className="text-apple-subtext">{key}:</span>
                  <span className="text-apple-text font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rejection Reason Form Field */}
          {isRejecting && (
            <div className="p-4 rounded-apple-sm bg-rose-500/10 border border-rose-500/20 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Specify Rejection Reason</span>
              </div>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter detailed reason for rejecting this verification request..."
                className="w-full p-2.5 rounded-apple-sm bg-apple-surface border border-apple-border focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-xs"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-apple-border">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-apple-sm border border-apple-border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>

          {!isRejecting ? (
            <>
              <button
                onClick={() => setIsRejecting(true)}
                className="px-4 py-2.5 rounded-apple-sm bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>

              <button
                onClick={handleApprove}
                className="px-5 py-2.5 rounded-apple-sm bg-apple-blue hover:bg-blue-600 text-white transition-all text-xs font-medium flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Verify</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
              className="px-5 py-2.5 rounded-apple-sm bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white transition-all text-xs font-medium flex items-center gap-1.5 shadow-md"
            >
              <XCircle className="w-4 h-4" />
              <span>Confirm Rejection</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};