import React, { useState } from 'react';
import { ArrowRight, RefreshCw, Undo2 } from 'lucide-react';
import { useApprovals } from './hooks/useApprovals';
import type { UnifiedApprovalItem } from './types/approval.types';

// Sub-components
import { ApprovalMetrics } from './components/ApprovalMetrics';
import { ApprovalTable } from './components/ApprovalTable';
import { ApprovalPreviewModal } from './components/ApprovalPreviewModal';
import { RejectionModal } from './components/RejectionModal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import type { ApprovalItem, ApprovalStatus, OrderStatus } from '../../types/common.types';
import { ProductApprovalReviewModal } from '../products-management/components/ProductApprovalReviewModal';
import { useProductActions } from '../products-management/hooks/useProductActions';
import type { ProductApprovalResponse } from '../products-management/types/productApproval.types';
import { RefundsQueue } from '../refunds/components/RefundsQueue';
import { usePendingRefundCount } from '../refunds/hooks/usePendingRefundCount';
import { useAccess } from '../../hooks/useAccess';
import { VouchersPanel } from '../finance/components/VouchersPanel';
import { usePendingVoucherCount } from '../finance/hooks/useFinanceData';
import { DealerApprovalsPanel } from './components/DealerApprovalsPanel';
import { useDealerApprovals } from './hooks/useDealerApprovals';
import { PreOrderApprovalsPanel } from './components/PreOrderApprovalsPanel';
import { usePreOrderApprovals } from './hooks/usePreOrderApprovals';
import { CompanyProfileApprovalsPanel } from './components/CompanyProfileApprovalsPanel';
import { useCompanyProfileApprovals } from './hooks/useCompanyProfileApprovals';

type HubTab = 'requests' | 'refunds' | 'expenses' | 'dealers' | 'pre-orders' | 'company-profile';
const TAB_STORAGE_KEY = 'approvals.tab';

/** Remembered per browser tab, so Back from an order opened in the refunds queue returns to it. */
const readTab = (): HubTab => {
  try {
    const saved = sessionStorage.getItem(TAB_STORAGE_KEY);
    return TABS.find(({ id }) => id === saved)?.id ?? 'requests';
  } catch {
    return 'requests';
  }
};

const TABS: { id: HubTab; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'dealers', label: 'Dealers' },
  { id: 'pre-orders', label: 'Pre-orders' },
  { id: 'company-profile', label: 'Company profile' },
];

export const ApprovalsHub: React.FC = () => {
  const [selectedTab, setTab] = useState<HubTab>(readTab);
  const { can, canAll, canAny } = useAccess();
  // Requests: the documents / profiles / stock / orders / products / employees queues; every other tab is one queue
  const availableTabs = TABS.filter(({ id }) =>
    id === 'pre-orders'
      ? canAll('CUSTOMER_ORDER_PRE_ORDER_APPROVE', 'CUSTOMER_ORDER_VIEW')
      : id === 'company-profile'
      ? canAll('COMPANY_PROFILE_APPROVE', 'COMPANY_PROFILE_VIEW')
      : id === 'refunds'
      ? can('REFUND_APPROVE')
      : id === 'expenses'
      ? can('EXPENSE_APPROVE')
      : id === 'dealers'
      ? canAny('DEALER_LOGIN_APPROVE', 'DEALER_QUOTATION_CHANGE_APPROVE')
      : canAny('DOCUMENT_APPROVE', 'EMPLOYEE_PROFILE_CHANGE_APPROVE', 'STOCK_APPROVE', 'PROCUREMENT_ORDER_APPROVE',
          'PRODUCT_APPROVAL_DECIDE', 'EMPLOYEE_APPROVE')
  );
  const tab: HubTab = availableTabs.some(({ id }) => id === selectedTab) ? selectedTab : availableTabs[0]?.id ?? 'requests';
  // Refunds live in their own tab; the count keeps them visible from the Requests tab.
  const pendingRefunds = usePendingRefundCount();
  const pendingRefundCount = pendingRefunds.count ?? 0;
  const pendingVouchers = usePendingVoucherCount();
  const pendingVoucherCount = pendingVouchers.count ?? 0;
  const pendingDealers = useDealerApprovals({ quiet: true });
  const preOrders = usePreOrderApprovals();
  const companyProfile = useCompanyProfileApprovals();
  const selectTab = (next: HubTab) => {
    setTab(next);
    pendingRefunds.refresh();
    pendingVouchers.refresh();
    pendingDealers.refresh();
    preOrders.refresh();
    companyProfile.refresh();
    try {
      sessionStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the tab just isn't remembered.
    }
  };

  const {
    approvals,
    isLoading,
    isDownloading,
    refreshApprovals,
    processPendingApproval,
    downloadDocument } = useApprovals();

  // Each tab's badge, so nothing waiting is hidden behind another tab.
  const pendingCounts: Record<HubTab, { count: number; noun: string }> = {
    requests: { count: approvals.length, noun: 'requests' },
    refunds: { count: pendingRefundCount, noun: 'refunds' },
    expenses: { count: pendingVoucherCount, noun: 'expenses' },
    dealers: { count: pendingDealers.count, noun: 'dealer requests' },
    'pre-orders': { count: preOrders.total, noun: 'pre-orders' },
    'company-profile': { count: companyProfile.pending ? 1 : 0, noun: 'company profile changes' },
  };

  // Products have their own review (snapshot + Approve / Reject / Cancel), which also activates the product.
  const [productReview, setProductReview] = useState<ProductApprovalResponse | null>(null);
  const { decideApproval, isSubmitting: isDecidingProduct } = useProductActions(refreshApprovals);
  const openProductReview = (item: ApprovalItem | null | undefined): boolean => {
    if (item?.approvalType !== 'PRODUCTS') return false;
    setProductReview(item as ProductApprovalResponse);
    return true;
  };

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
    if (openProductReview(item)) return;
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
    if (openProductReview(item)) return;
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
      // The hook reports success/failure through the global alert.
      const ok = await processPendingApproval(confirmTargetItem, {
        decision: confirmAction,
        rejectionReason: confirmAction === 'REJECTED' || confirmAction === 'CANCELLED' ? pendingRejectionReason : 'Approved by Admin L2',
      });
      if (!ok) return; // keep the dialog open so the user can retry

      setIsConfirmOpen(false);
      setIsPreviewOpen(false);
      setPendingRejectionReason('');
      setConfirmTargetItem(null);
      setConfirmAction(null);
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
            Every request waiting for your decision: documents, profile updates, new employees, stock, orders, products,
            refunds, expenses, dealers, pre-orders and the company profile.
          </p>
        </div>
        {tab === 'requests' && (
          <button
            onClick={refreshApprovals}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Approval queues" className="inline-flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
        {availableTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => selectTab(id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === id ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'
            }`}
          >
            {label}
            {pendingCounts[id].count > 0 && (
              <span
                aria-label={`${pendingCounts[id].count} ${pendingCounts[id].noun} awaiting approval`}
                className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold"
              >
                {pendingCounts[id].count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'pre-orders' ? (
        <PreOrderApprovalsPanel orders={preOrders.orders} total={preOrders.total} isLoading={preOrders.isLoading} onRefresh={preOrders.refresh} />
      ) : tab === 'company-profile' ? (
        <CompanyProfileApprovalsPanel pending={companyProfile.pending} isLoading={companyProfile.isLoading} onRefresh={companyProfile.refresh} />
      ) : tab === 'dealers' ? (
        <DealerApprovalsPanel onChanged={pendingDealers.refresh} />
      ) : tab === 'refunds' ? (
        <RefundsQueue onChanged={pendingRefunds.refresh} />
      ) : tab === 'expenses' ? (
        <VouchersPanel
          title="Expenses awaiting approval"
          description="Expenses, shipping costs and other vouchers raised by the team. Approving posts the money to the company account; you can't approve what you raised."
          defaultStatus="SUBMITTED"
          onChanged={pendingVouchers.refresh}
        />
      ) : (
        <>
          {pendingRefundCount > 0 && (
            <div
              role="note"
              aria-label="Refunds awaiting approval"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-800 dark:text-amber-300"
            >
              <span className="flex items-center gap-2">
                <Undo2 className="w-4 h-4 shrink-0" />
                {pendingRefundCount === 1 ? '1 refund is' : `${pendingRefundCount} refunds are`} awaiting approval.
              </span>
              <button
                type="button"
                onClick={() => selectTab('refunds')}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer"
              >
                Review refunds <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {/* Metrics Section */}
          <ApprovalMetrics approvals={approvals} />

          {/* Unified Data Table */}
          <ApprovalTable
            approvals={approvals}
            isLoading={isLoading}
            onPreview={(item) => {
              if (openProductReview(item)) return;
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
        </>
      )}

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

      <ProductApprovalReviewModal
        key={productReview?.id ?? 'none'}
        request={productReview}
        isSubmitting={isDecidingProduct}
        onClose={() => setProductReview(null)}
        onDecide={async (decision, reason) => {
          if (!productReview) return false;
          const ok = await decideApproval(productReview, decision, reason);
          if (ok) setProductReview(null);
          return ok;
        }}
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