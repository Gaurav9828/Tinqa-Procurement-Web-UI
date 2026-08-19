import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useApprovals } from './hooks/useApprovals';
import type { UnifiedApprovalItem } from './types/approval.types';

// Sub-components
import { ApprovalMetrics } from './components/ApprovalMetrics';
import { ApprovalTable } from './components/ApprovalTable';
import { ApprovalPreviewModal } from './components/ApprovalPreviewModal';
import { RejectionModal } from './components/RejectionModal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Alert } from '../../components/ui/Alert';
import type { ApprovalItem, ApprovalStatus, OrderStatus } from '../../types/common.types';

export const ApprovalsHub: React.FC = () => {
  const {
    approvals,
    actionSuccess,
    clearMessages,
    isLoading,
    error,
    isDownloading,
    refreshApprovals,
    processPendingApproval,
    downloadDocument } = useApprovals();

  // Modal States
  const [selectedRequest, setSelectedRequest] = useState<UnifiedApprovalItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Rejection Reason Modal State
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState<boolean>(false);
  const [rejectionTargetItem, setRejectionTargetItem] = useState<ApprovalItem | null>(null);
  const [pendingRejectionReason, setPendingRejectionReason] = useState<string>('');

  // Action Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<ApprovalStatus | OrderStatus | null>(null);
  const [confirmTargetItem, setConfirmTargetItem] = useState<ApprovalItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const formatTime = (isoString: string) => {
    if (!isoString) return 'N/A';

    try {
      const date = new Date(isoString);

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);

      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  const handleInitiateApprove = (item: ApprovalItem) => {
    switch(item.approvalType){
      case 'ORDERS': {
        setConfirmAction('DEALER_LEVEL_PENDING');
        break;
      }
      case 'DOCUMENT': {
        setConfirmAction('ACTIVE');
        break;
      }
      default: {
        setConfirmAction('APPROVED')
      }
    }
    setIsPreviewOpen(false);
    setConfirmTargetItem(item);
    setIsConfirmOpen(true);
  };

  const handleInitiateReject = (item: ApprovalItem) => {
    setIsPreviewOpen(false);
    setRejectionTargetItem(item);
    setIsRejectionModalOpen(true);
  };

  const handleRejectionReasonSubmit = (reason: string, approvalType?: string) => {
    switch(approvalType){
      case 'ORDERS': {
        setConfirmAction('CANCELLED');
        break;
      }
      case 'DOCUMENT': {
        setConfirmAction('REJECTED');
        break;
      }
      default: {
        setConfirmAction('REJECTED')
      }
    }
    setPendingRejectionReason(reason);
    setIsRejectionModalOpen(false);
    setConfirmTargetItem(rejectionTargetItem);
    setConfirmAction(approvalType == 'ORDERS' ? 'CANCELLED' : 'REJECTED');
    setIsConfirmOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!confirmTargetItem || !confirmAction) return;

    setIsSubmitting(true);
    try {
      await processPendingApproval(confirmTargetItem, {
        decision: confirmAction,
        rejectionReason: confirmAction === 'REJECTED' || confirmAction == 'CANCELLED' ? pendingRejectionReason : 'Approved by Admin L2',
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
      {/* Page Alerts */}
      {actionSuccess && (
        <Alert type="success" message={actionSuccess} onClose={clearMessages} />
      )}
      {error && (
        <Alert type="error" message={error} onClose={clearMessages} />
      )}

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
      <ApprovalMetrics approvals={approvals} />

      {/* Unified Data Table */}
      <ApprovalTable
        approvals={approvals}
        isLoading={isLoading}
        onPreview={(item) => {
          setSelectedRequest(item);
          setIsPreviewOpen(true);
        }}
        onInitiateApprove={(item) => {
          if (item) handleInitiateApprove(item);
        }}
        onInitiateReject={(item) => {
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
        onSubmit={(reason: string) => handleRejectionReasonSubmit(reason, rejectionTargetItem?.approvalType)}
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