import React, { useState } from 'react';
import { ArrowRight, RefreshCw, Undo2 } from 'lucide-react';
import { REQUEST_QUEUE_PERMISSIONS, useApprovals } from './hooks/useApprovals';
import { ORDER_QUEUES, isOrderApprovalType, isRejectDecision } from './utils/orderQueues';
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
import { useAccess } from '../../hooks/useAccess';
import { VouchersPanel } from '../finance/components/VouchersPanel';
import { SupplierApprovalsPanel } from './components/SupplierApprovalsPanel';
import { useApprovalSummary } from './hooks/useApprovalSummary';
import { PreOrderApprovalsPanel } from './components/PreOrderApprovalsPanel';
import { ReturnRequestApprovalsPanel } from './components/ReturnRequestApprovalsPanel';
import { usePreOrderApprovals } from './hooks/usePreOrderApprovals';
import { CompanyProfileApprovalsPanel } from './components/CompanyProfileApprovalsPanel';
import { useCompanyProfileApprovals } from './hooks/useCompanyProfileApprovals';
import { BarcodeRequestsPanel } from '../barcodes/components/BarcodeRequestsPanel';
import { useBarcodeRequests } from '../barcodes/hooks/useBarcodeRequests';
import { ClientDemoApprovalsPanel } from '../client-demos/components/ClientDemoApprovalsPanel';
import { useWaitingDemos } from '../client-demos/hooks/useClientDemoData';
import { CareerApprovalsPanel } from '../careers/components/CareerApprovalsPanel';
import { SupplierPaymentApprovalsPanel } from './components/SupplierPaymentApprovalsPanel';
import { SupplierReturnApprovalsPanel } from './components/SupplierReturnApprovalsPanel';
import { SupplierRepaymentChecksPanel } from './components/SupplierRepaymentChecksPanel';
import { WarrantyClaimApprovalsPanel } from './components/WarrantyClaimApprovalsPanel';

type HubTab =
  | 'requests' | 'refunds' | 'return-requests' | 'expenses' | 'suppliers' | 'supplier-payments' | 'supplier-returns' | 'supplier-repayments' | 'pre-orders'
  | 'company-profile' | 'barcodes' | 'client-demos' | 'careers' | 'warranty-claims';
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
  { id: 'return-requests', label: 'Return requests' },
  { id: 'warranty-claims', label: 'Warranty claims' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'supplier-payments', label: 'Supplier payments' },
  { id: 'supplier-returns', label: 'Supplier returns' },
  { id: 'supplier-repayments', label: 'Supplier repayments' },
  { id: 'pre-orders', label: 'Pre-orders' },
  { id: 'company-profile', label: 'Company profile' },
  { id: 'barcodes', label: 'Barcodes' },
  { id: 'client-demos', label: 'Client demos' },
  { id: 'careers', label: 'Careers' },
];

export const ApprovalsHub: React.FC = () => {
  const [selectedTab, setTab] = useState<HubTab>(readTab);
  const { can, canAll, canAny } = useAccess();
  // Requests: the documents / profiles / stock / quotations / orders / returns / products / employees queues; every other tab is one queue
  const tabAllowed = (id: HubTab): boolean => {
    switch (id) {
      case 'pre-orders':
        return canAll('CUSTOMER_ORDER_PRE_ORDER_APPROVE', 'CUSTOMER_ORDER_VIEW');
      case 'company-profile':
        return canAll('COMPANY_PROFILE_APPROVE', 'COMPANY_PROFILE_VIEW');
      case 'refunds':
        return can('REFUND_APPROVE');
      case 'return-requests':
        // Customer Support's return requests: Store Managers (both levels) decide them
        return can('RETURN_ENABLE');
      case 'warranty-claims':
        return canAll('WARRANTY_CLAIM_DECIDE', 'WARRANTY_CLAIM_VIEW');
      case 'expenses':
        return can('EXPENSE_APPROVE');
      case 'barcodes':
        return can('BARCODE_APPROVE');
      case 'client-demos':
        return can('DEMO_APPROVE');
      case 'careers':
        return canAll('CAREER_DECISION_APPROVE', 'CAREER_APPLICATION_VIEW');
      case 'suppliers':
        return canAny('SUPPLIER_LOGIN_APPROVE', 'SUPPLIER_QUOTATION_CHANGE_APPROVE');
      case 'supplier-payments':
        // The Super Admin approves payment requests; the Finance Manager makes the approved payments
        return canAll('SUPPLIER_PAYMENT_APPROVE', 'PROCUREMENT_ORDER_VIEW') || canAll('SUPPLIER_PAYMENT_RECORD', 'PROCUREMENT_ORDER_VIEW');
      case 'supplier-returns':
        // Returns of failed pieces: the Super Admin approves them
        return canAll('SUPPLIER_RETURN_APPROVE', 'PROCUREMENT_ORDER_VIEW');
      case 'supplier-repayments':
        // Money suppliers paid back: the Finance Manager checks it arrived
        return canAll('SUPPLIER_PAYMENT_RECORD', 'PROCUREMENT_ORDER_VIEW');
      default:
        return canAny(...REQUEST_QUEUE_PERMISSIONS);
    }
  };
  const availableTabs = TABS.filter(({ id }) => tabAllowed(id));
  const tab: HubTab = availableTabs.some(({ id }) => id === selectedTab) ? selectedTab : availableTabs[0]?.id ?? 'requests';
  // Every badge comes from the approval summary (one call per backend); a queue's list loads only while its tab is open
  const summary = useApprovalSummary();
  const refreshSummary = summary.refresh;
  const pendingRefundCount = summary.count('REFUNDS');
  const preOrders = usePreOrderApprovals({ enabled: tab === 'pre-orders' });
  const companyProfile = useCompanyProfileApprovals();
  const barcodeRequests = useBarcodeRequests({ quiet: true, enabled: tab === 'barcodes' });
  const waitingDemos = useWaitingDemos(tab === 'client-demos');
  // Opening a tab loads its list afresh (its hook is enabled again); the summary refreshes every badge in the same go
  const selectTab = (next: HubTab) => {
    setTab(next);
    refreshSummary();
    if (next === 'company-profile') void companyProfile.refresh();
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
    refreshApprovals: reloadRequests,
    processPendingApproval,
    downloadDocument } = useApprovals({ enabled: tab === 'requests' });
  const refreshApprovals = async () => {
    refreshSummary();
    await reloadRequests();
  };

  // Each tab's badge, so nothing waiting is hidden behind another tab.
  const pendingCounts: Record<HubTab, { count: number; noun: string }> = {
    requests: {
      count: summary.count('DOCUMENTS', 'PROFILE_CHANGES', 'STOCK', 'QUOTATIONS', 'ORDERS', 'RETURNS', 'PRODUCTS', 'EMPLOYEES'),
      noun: 'requests',
    },
    refunds: { count: pendingRefundCount, noun: 'refunds' },
    'return-requests': { count: summary.count('RETURN_REQUESTS'), noun: 'return requests' },
    'warranty-claims': { count: summary.count('WARRANTY_CLAIMS'), noun: 'warranty claims' },
    expenses: { count: summary.count('EXPENSES'), noun: 'expenses' },
    suppliers: { count: summary.count('SUPPLIER_LOGINS', 'QUOTATION_CHANGES'), noun: 'supplier requests' },
    'supplier-payments': { count: summary.count('SUPPLIER_PAYMENTS', 'SUPPLIER_PAYMENTS_TO_MAKE'), noun: 'supplier payments' },
    'supplier-returns': { count: summary.count('SUPPLIER_RETURNS'), noun: 'supplier returns' },
    'supplier-repayments': { count: summary.count('SUPPLIER_REPAYMENTS'), noun: 'supplier repayments to check' },
    'pre-orders': { count: summary.count('PRE_ORDERS'), noun: 'pre-orders' },
    'company-profile': { count: summary.count('COMPANY_PROFILE'), noun: 'company profile changes' },
    barcodes: { count: summary.count('BARCODES'), noun: 'barcode requests' },
    'client-demos': { count: summary.count('CLIENT_DEMOS'), noun: 'client demos' },
    careers: { count: summary.count('CAREER_DECISIONS'), noun: 'shortlists and selections' },
  };

  // Every tab but Requests is one queue with its own panel
  const queuePanel = (current: HubTab): React.ReactNode => {
    switch (current) {
      case 'barcodes':
        return (
          <BarcodeRequestsPanel
            requests={barcodeRequests.requests}
            isLoading={barcodeRequests.isLoading}
            isSubmitting={barcodeRequests.isSubmitting}
            onRefresh={barcodeRequests.refresh}
            onDecide={async (request, decision) => {
              const ok = await barcodeRequests.decide(request, decision);
              if (ok) refreshSummary();
              return ok;
            }}
          />
        );
      case 'careers':
        return <CareerApprovalsPanel enabled={tab === 'careers'} onChanged={refreshSummary} />;
      case 'client-demos':
        return <ClientDemoApprovalsPanel demos={waitingDemos.data ?? []} isLoading={waitingDemos.isLoading} onRefresh={waitingDemos.refresh} />;
      case 'pre-orders':
        return <PreOrderApprovalsPanel orders={preOrders.orders} total={preOrders.total} isLoading={preOrders.isLoading} onRefresh={preOrders.refresh} />;
      case 'company-profile':
        return <CompanyProfileApprovalsPanel pending={companyProfile.pending} isLoading={companyProfile.isLoading} onRefresh={companyProfile.refresh} />;
      case 'suppliers':
        return <SupplierApprovalsPanel onChanged={refreshSummary} />;
      case 'supplier-payments':
        return <SupplierPaymentApprovalsPanel enabled={tab === 'supplier-payments'} onChanged={refreshSummary} />;
      case 'supplier-returns':
        return <SupplierReturnApprovalsPanel enabled={tab === 'supplier-returns'} onChanged={refreshSummary} />;
      case 'supplier-repayments':
        return <SupplierRepaymentChecksPanel enabled={tab === 'supplier-repayments'} onChanged={refreshSummary} />;
      case 'refunds':
        return <RefundsQueue onChanged={refreshSummary} />;
      case 'return-requests':
        return <ReturnRequestApprovalsPanel enabled={tab === 'return-requests'} onChanged={refreshSummary} />;
      case 'warranty-claims':
        return <WarrantyClaimApprovalsPanel enabled={tab === 'warranty-claims'} />;
      case 'expenses':
        return (
          <VouchersPanel
            title="Expenses awaiting approval"
            description="Expenses, shipping costs and other vouchers raised by the team. Approving posts the money to the company account; you can't approve what you raised."
            defaultStatus="SUBMITTED"
            onChanged={refreshSummary}
          />
        );
      default:
        return null;
    }
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
    const type: unknown = item.approvalType;
    if (isOrderApprovalType(type)) {
      setConfirmAction(ORDER_QUEUES[type].approveTo);
    } else {
      setConfirmAction(type === 'DOCUMENT' ? 'ACTIVE' : 'APPROVED');
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
    setPendingRejectionReason(reason);
    setIsRejectionModalOpen(false);
    setConfirmTargetItem(rejectionTargetItem);
    setConfirmAction(isOrderApprovalType(approvalType) ? ORDER_QUEUES[approvalType].rejectTo : 'REJECTED');
    setIsConfirmOpen(true);
  };

  // Order queues word the confirmation for what the decision does (submit a quotation, approve a return…)
  const confirmType: unknown = confirmTargetItem?.approvalType;
  const confirmQueue = isOrderApprovalType(confirmType) ? ORDER_QUEUES[confirmType] : null;
  const confirmIsReject = isRejectDecision(confirmAction);
  const confirmText = confirmQueue
    ? {
        title: confirmIsReject ? confirmQueue.rejectTitle : confirmQueue.approveTitle,
        description: confirmIsReject ? undefined : confirmQueue.approveDescription(String((confirmTargetItem as { orderNumber?: string } | null)?.orderNumber ?? '')),
        confirmLabel: confirmIsReject ? confirmQueue.rejectLabel : confirmQueue.approveLabel,
        tone: confirmIsReject ? ('danger' as const) : ('approve' as const),
      }
    : {};

  const handleExecuteAction = async () => {
    if (!confirmTargetItem || !confirmAction) return;

    setIsSubmitting(true);
    try {
      // The hook reports success/failure through the global alert.
      const ok = await processPendingApproval(confirmTargetItem, {
        decision: confirmAction,
        rejectionReason: isRejectDecision(confirmAction) ? pendingRejectionReason : 'Approved by Admin L2',
      });
      if (!ok) return; // keep the dialog open so the user can retry
      refreshSummary();

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
            Every request waiting for your decision: documents, profile updates, new employees, stock, supplier quotations,
            orders, returns, products, refunds, expenses, suppliers, supplier payments, returns of failed pieces and repayments, pre-orders,
            the company profile, barcodes, client demos and careers shortlists and selections.
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

      {queuePanel(tab) ?? (
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
        {...confirmText}
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteAction}
      />
    </div>
  );
};