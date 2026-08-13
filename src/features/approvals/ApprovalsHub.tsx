import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { approvalService } from './services/approvalService';
import type { ProfileApprovalRequest } from './types/approval.types';
import type { ProcessApprovalPayload } from './services/approvalService';
import { useAuthStore } from '../../store/useAuthStore';

// Sub-components
import { ApprovalMetrics } from './components/ApprovalMetrics';
import { ApprovalTable } from './components/ApprovalTable';
import { ApprovalPreviewModal } from './components/ApprovalPreviewModal';
import { RejectionModal } from './components/RejectionModal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

export const ApprovalsHub: React.FC = () => {
  // Data State
  const [approvals, setApprovals] = useState<ProfileApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [selectedRequest, setSelectedRequest] = useState<ProfileApprovalRequest | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Rejection Reason Modal State
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState<boolean>(false);
  const [rejectionTargetId, setRejectionTargetId] = useState<number | null>(null);
  const [pendingRejectionReason, setPendingRejectionReason] = useState<string>('');

  // Action Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { user } = useAuthStore();

  const fetchApprovals = useCallback(async () => {
    if (user?.role !== 'ADMIN_L2') return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await approvalService.getProfileApprovals();
      setApprovals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pending profile approvals.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const formatTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const handleInitiateApprove = (requestId: number) => {
    setIsPreviewOpen(false);
    setConfirmTargetId(requestId);
    setConfirmAction('APPROVE');
    setIsConfirmOpen(true);
  };

  const handleInitiateReject = (requestId: number) => {
    setIsPreviewOpen(false);
    setRejectionTargetId(requestId);
    setIsRejectionModalOpen(true);
  };

  const handleRejectionReasonSubmit = (reason: string) => {
    setPendingRejectionReason(reason);
    setIsRejectionModalOpen(false);
    setConfirmTargetId(rejectionTargetId);
    setConfirmAction('REJECT');
    setIsConfirmOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!confirmTargetId || !confirmAction) return;

    setIsSubmitting(true);
    try {
      const payload: ProcessApprovalPayload = {
        decision: confirmAction,
        rejectionReason: confirmAction === 'REJECT' ? pendingRejectionReason : 'Approved by Admin',
      };

      await approvalService.processProfileApproval(confirmTargetId, payload);

      setIsConfirmOpen(false);
      setIsPreviewOpen(false);
      setPendingRejectionReason('');
      setConfirmTargetId(null);
      setConfirmAction(null);
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || `Failed to ${confirmAction.toLowerCase()} request.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Pending Approvals
          </h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
            Review and action profile update requests submitted by users.
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Section */}
      <ApprovalMetrics pendingCount={approvals.length} />

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <ApprovalTable
        approvals={approvals}
        isLoading={isLoading}
        onPreview={(item) => {
          setSelectedRequest(item);
          setIsPreviewOpen(true);
        }}
        onInitiateApprove={handleInitiateApprove}
        onInitiateReject={handleInitiateReject}
        formatTime={formatTime}
      />

      {/* Modals */}
      <ApprovalPreviewModal
        request={selectedRequest}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedRequest(null);
        }}
        onApprove={handleInitiateApprove}
        onReject={handleInitiateReject}
        formatTime={formatTime}
      />

      <RejectionModal
        isOpen={isRejectionModalOpen}
        requestId={rejectionTargetId}
        onClose={() => setIsRejectionModalOpen(false)}
        onSubmit={handleRejectionReasonSubmit}
      />

      <ConfirmationModal
        isOpen={isConfirmOpen}
        actionType={confirmAction}
        requestId={confirmTargetId}
        rejectionReason={pendingRejectionReason}
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteAction}
      />
    </div>
  );
};