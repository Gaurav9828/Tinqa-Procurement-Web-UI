import React, { useState } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { useStockList } from '../hooks/useStockList';
import { useStockActions } from '../hooks/useStockActions';
import type {
  StockResponse,
  CreateStockFromOrderRequest,
  UpdateStockRequest,
  QuantityAdjustmentRequest,
  ApprovalDecisionRequest,
} from '../types/stock.types';

import { StockFilterBar } from '../components/StockFilterBar';
import { StockTable } from '../components/StockTable';
import { StockFormModal } from '../components/StockFormModal';
import { StockPreviewModal } from '../components/StockPreviewModal';
import { StockEditModal } from '../components/StockEditModal'; // <--- Import Edit Modal
import { QuantityAdjustmentModal } from '../components/QuantityAdjustmentModal';
import { StockApprovalModal } from '../components/StockApprovalModal';
import { ActionConfirmationModal } from '../components/ActionConfirmationModal';

export const StockManagementPage: React.FC = () => {
  const {
    stocks,
    isLoading,
    error,
    search,
    approvalStatusFilter,
    updateSearch,
    updateApprovalStatusFilter,
    refetch,
  } = useStockList();

  const {
    isSubmitting,
    actionError,
    actionSuccess,
    createStockFromOrder,
    updateStock, // <--- Make sure your useStockActions hook exposes updateStock
    adjustQuantity,
    processApproval,
  } = useStockActions(refetch);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    stock: StockResponse | null;
  }>({ isOpen: false, stock: null });

  const [editState, setEditState] = useState<{
    isOpen: boolean;
    stock: StockResponse | null;
  }>({ isOpen: false, stock: null });

  const [adjustmentState, setAdjustmentState] = useState<{
    isOpen: boolean;
    type: 'ADD' | 'REDUCE';
    stock: StockResponse | null;
  }>({ isOpen: false, type: 'ADD', stock: null });

  const [approvalModalState, setApprovalModalState] = useState<{
    isOpen: boolean;
    stock: StockResponse | null;
  }>({ isOpen: false, stock: null });

  const [pendingFormPayload, setPendingFormPayload] = useState<CreateStockFromOrderRequest | null>(null);
  const [isConfirmFormOpen, setIsConfirmFormOpen] = useState(false);

  const [pendingEditPayload, setPendingEditPayload] = useState<{ id: number; data: UpdateStockRequest } | null>(null);
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);

  const [pendingAdjustmentPayload, setPendingAdjustmentPayload] = useState<QuantityAdjustmentRequest | null>(null);
  const [isConfirmAdjustmentOpen, setIsConfirmAdjustmentOpen] = useState(false);

  const [pendingApprovalPayload, setPendingApprovalPayload] = useState<ApprovalDecisionRequest | null>(null);
  const [isConfirmApprovalOpen, setIsConfirmApprovalOpen] = useState(false);

  const isAnyModalActive =
    isFormModalOpen || previewState.isOpen || editState.isOpen || adjustmentState.isOpen || approvalModalState.isOpen;

  // --- Handlers ---

  const handleFormSubmitRequest = (data: CreateStockFromOrderRequest) => {
    setPendingFormPayload(data);
    setIsConfirmFormOpen(true);
  };

  const executeFormSubmit = async () => {
    if (!pendingFormPayload) return;
    const ok = await createStockFromOrder(pendingFormPayload);
    setIsConfirmFormOpen(false);
    if (ok) {
      setIsFormModalOpen(false);
      setPendingFormPayload(null);
    }
  };

  const handleEditSubmitRequest = (id: number, data: UpdateStockRequest) => {
    setPendingEditPayload({ id, data });
    setIsConfirmEditOpen(true);
  };

  const executeEditSubmit = async () => {
    if (!pendingEditPayload) return;
    const ok = await updateStock(pendingEditPayload.id, pendingEditPayload.data);
    setIsConfirmEditOpen(false);
    if (ok) {
      setEditState({ isOpen: false, stock: null });
      setPendingEditPayload(null);
    }
  };

  const handleAdjustmentSubmitRequest = (payload: QuantityAdjustmentRequest) => {
    setPendingAdjustmentPayload(payload);
    setIsConfirmAdjustmentOpen(true);
  };

  const executeAdjustmentSubmit = async () => {
    if (!pendingAdjustmentPayload || !adjustmentState.stock) return;
    const ok = await adjustQuantity(
      adjustmentState.stock.id,
      adjustmentState.type,
      pendingAdjustmentPayload
    );
    setIsConfirmAdjustmentOpen(false);
    if (ok) {
      setAdjustmentState({ isOpen: false, type: 'ADD', stock: null });
      setPendingAdjustmentPayload(null);
    }
  };

  const handleApprovalSubmitRequest = (payload: ApprovalDecisionRequest) => {
    setPendingApprovalPayload(payload);
    setIsConfirmApprovalOpen(true);
  };

  const executeApprovalSubmit = async () => {
    if (!pendingApprovalPayload || !approvalModalState.stock) return;
    const ok = await processApproval(approvalModalState.stock.id, pendingApprovalPayload);
    setIsConfirmApprovalOpen(false);
    if (ok) {
      setApprovalModalState({ isOpen: false, stock: null });
      setPendingApprovalPayload(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0071e3]/10 text-[#0071e3] rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black dark:text-white">Stock Management</h1>
            <p className="text-xs text-gray-500">Track and manage inventory batches, quantities, and approvals</p>
          </div>
        </div>
        <button
          onClick={refetch}
          className="p-2 border border-black/10 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 cursor-pointer"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <Alert type="error" message={error} />}
      {!isAnyModalActive && actionError && <Alert type="error" message={actionError} />}
      {actionSuccess && <Alert type="success" message={actionSuccess} />}

      <StockFilterBar
        searchQuery={search}
        selectedStatus={approvalStatusFilter}
        onSearchChange={updateSearch}
        onStatusChange={updateApprovalStatusFilter}
        onOpenCreateModal={() => setIsFormModalOpen(true)}
      />

      <StockTable
        stocks={stocks}
        isLoading={isLoading}
        onView={(stock) => setPreviewState({ isOpen: true, stock })}
        onEdit={(stock) => setEditState({ isOpen: true, stock })} // <--- Wired Table Edit button if available
        onAdjustQuantity={(stock, type) => setAdjustmentState({ isOpen: true, type, stock })}
        onApproval={(stock) => setApprovalModalState({ isOpen: true, stock })}
      />

      {/* Stock Preview Modal */}
      <StockPreviewModal
        isOpen={previewState.isOpen}
        stock={previewState.stock}
        onClose={() => setPreviewState({ isOpen: false, stock: null })}
        onEdit={(stock) => setEditState({ isOpen: true, stock })} // <--- Wired Preview Edit button
      />

      {/* Stock Edit Modal */}
      <StockEditModal
        isOpen={editState.isOpen}
        stock={editState.stock}
        isSubmitting={isSubmitting}
        error={editState.isOpen ? actionError : null}
        onClose={() => setEditState({ isOpen: false, stock: null })}
        onRequestSubmit={handleEditSubmitRequest}
      />

      {/* Stock Form Modal */}
      <StockFormModal
        isOpen={isFormModalOpen}
        isSubmitting={isSubmitting}
        error={isFormModalOpen ? actionError : null}
        onClose={() => setIsFormModalOpen(false)}
        onRequestSubmit={handleFormSubmitRequest}
      />

      {/* Quantity Adjustment Modal */}
      <QuantityAdjustmentModal
        isOpen={adjustmentState.isOpen}
        type={adjustmentState.type}
        stockIdentity={adjustmentState.stock?.stockIdentityNumber || ''}
        isSubmitting={isSubmitting}
        error={adjustmentState.isOpen ? actionError : null}
        onClose={() => setAdjustmentState({ isOpen: false, type: 'ADD', stock: null })}
        onRequestSubmit={handleAdjustmentSubmitRequest}
      />

      {/* Admin L2 Approval Modal */}
      <StockApprovalModal
        isOpen={approvalModalState.isOpen}
        stock={approvalModalState.stock}
        isSubmitting={isSubmitting}
        error={approvalModalState.isOpen ? actionError : null}
        onClose={() => setApprovalModalState({ isOpen: false, stock: null })}
        onRequestSubmit={handleApprovalSubmitRequest}
      />

      {/* Confirmation Modals */}
      <ActionConfirmationModal
        isOpen={isConfirmFormOpen}
        title="Confirm Stock Creation"
        description="Are you sure you want to submit this stock entry from order for Admin L2 approval?"
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmFormOpen(false)}
        onConfirm={executeFormSubmit}
      />

      <ActionConfirmationModal
        isOpen={isConfirmEditOpen}
        title="Confirm Stock Update"
        description={`Are you sure you want to save changes for stock entry ${editState.stock?.stockIdentityNumber}?`}
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmEditOpen(false)}
        onConfirm={executeEditSubmit}
      />

      <ActionConfirmationModal
        isOpen={isConfirmAdjustmentOpen}
        title={`Confirm Quantity ${adjustmentState.type === 'ADD' ? 'Addition' : 'Reduction'}`}
        description={`Are you sure you want to ${adjustmentState.type.toLowerCase()} quantity for stock entry ${adjustmentState.stock?.stockIdentityNumber}?`}
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmAdjustmentOpen(false)}
        onConfirm={executeAdjustmentSubmit}
      />

      <ActionConfirmationModal
        isOpen={isConfirmApprovalOpen}
        title="Confirm Approval Decision"
        description={`Are you sure you want to mark stock entry ${approvalModalState.stock?.stockIdentityNumber} as ${pendingApprovalPayload?.status}?`}
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmApprovalOpen(false)}
        onConfirm={executeApprovalSubmit}
      />
    </div>
  );
};