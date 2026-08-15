import React, { useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useApprovals } from './hooks/useApprovals';
import type { UnifiedApprovalItem } from './types/approval.types';

// Sub-components
import { ApprovalMetrics } from './components/ApprovalMetrics';
import { ApprovalTable } from './components/ApprovalTable';
import { ApprovalPreviewModal } from './components/ApprovalPreviewModal';
import { RejectionModal } from './components/RejectionModal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

export const ApprovalsHub: React.FC = () => {
  const { approvals, isLoading, error, isDownloading, refreshApprovals, processApproval, downloadDocument } = useApprovals();

  // Modal States
  const [selectedRequest, setSelectedRequest] = useState<UnifiedApprovalItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Rejection Reason Modal State
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState<boolean>(false);
  const [rejectionTargetItem, setRejectionTargetItem] = useState<UnifiedApprovalItem | null>(null);
  const [pendingRejectionReason, setPendingRejectionReason] = useState<string>('');

  // Action Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [confirmTargetItem, setConfirmTargetItem] = useState<UnifiedApprovalItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const handleInitiateApprove = (item: UnifiedApprovalItem) => {
    setIsPreviewOpen(false);
    setConfirmTargetItem(item);
    setConfirmAction('APPROVE');
    setIsConfirmOpen(true);
  };

  const handleInitiateReject = (item: UnifiedApprovalItem) => {
    setIsPreviewOpen(false);
    setRejectionTargetItem(item);
    setIsRejectionModalOpen(true);
  };

  const handleRejectionReasonSubmit = (reason: string) => {
    setPendingRejectionReason(reason);
    setIsRejectionModalOpen(false);
    setConfirmTargetItem(rejectionTargetItem);
    setConfirmAction('REJECT');
    setIsConfirmOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!confirmTargetItem || !confirmAction) return;

    setIsSubmitting(true);
    try {
      await processApproval(confirmTargetItem, {
        decision: confirmAction,
        rejectionReason: confirmAction === 'REJECT' ? pendingRejectionReason : 'Approved by Admin L2',
      });

      setIsConfirmOpen(false);
      setIsPreviewOpen(false);
      setPendingRejectionReason('');
      setConfirmTargetItem(null);
      setConfirmAction(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || `Failed to ${confirmAction.toLowerCase()} request.`);
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
            Approval Hub
          </h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
            Review and action incoming requests across documents and user profile updates.
          </p>
        </div>
        <button
          onClick={refreshApprovals}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer"
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

      {/* Unified Data Table */}
      <ApprovalTable
        approvals={approvals}
        isLoading={isLoading}
        onPreview={(item) => {
          setSelectedRequest(item);
          setIsPreviewOpen(true);
        }}
        onInitiateApprove={(id) => {
          const item = approvals.find((a) => ('id' in a ? a.id === id : a.requestId === id));
          if (item) handleInitiateApprove(item);
        }}
        onInitiateReject={(id) => {
          const item = approvals.find((a) => ('id' in a ? a.id === id : a.requestId === id));
          if (item) handleInitiateReject(item);
        }}
        formatTime={formatTime}
      />

      <ApprovalPreviewModal
        request={selectedRequest}
        isOpen={isPreviewOpen}
        isDownloading={isDownloading}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedRequest(null);
        }}
        onApprove={() => selectedRequest && handleInitiateApprove(selectedRequest)}
        onReject={() => selectedRequest && handleInitiateReject(selectedRequest)}
        onDownload={(id, fileName) => downloadDocument(id, fileName)}
        formatTime={formatTime}
      />

      <RejectionModal
        isOpen={isRejectionModalOpen}
        requestId={rejectionTargetItem ? ('id' in rejectionTargetItem ? rejectionTargetItem.id : rejectionTargetItem.requestId) : null}
        onClose={() => setIsRejectionModalOpen(false)}
        onSubmit={handleRejectionReasonSubmit}
      />

      <ConfirmationModal
        isOpen={isConfirmOpen}
        actionType={confirmAction}
        requestId={confirmTargetItem ? ('id' in confirmTargetItem ? confirmTargetItem.id : confirmTargetItem.requestId) : null}
        rejectionReason={pendingRejectionReason}
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteAction}
      />
    </div>
  );
};