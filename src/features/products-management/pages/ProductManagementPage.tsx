import React, { useCallback, useMemo, useState } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { useProductList } from '../hooks/useProductList';
import { useProductActions } from '../hooks/useProductActions';
import { ProductFilterBar } from '../components/ProductFilterBar';
import { ProductTable } from '../components/ProductTable';
import { CreateProductModal } from '../components/CreateProductModal';
import { EditProductModal } from '../components/EditProductModal';
import { ProductPreviewModal } from '../components/ProductPreviewModal';
import { ProductStatusModal } from '../components/ProductStatusModal';
import { StockAdjustModal } from '../components/StockAdjustModal';
import type { StockAdjustMode } from '../utils/stockAdjustment';
import type { ProductResponse, CreateProductRequest, UpdateProductRequest } from '../types/product.types';
import type { ProductApprovalResponse, ProductChangeSummary } from '../types/productApproval.types';
import { useProductApprovals } from '../hooks/useProductApprovals';
import { ProductApprovalReviewModal } from '../components/ProductApprovalReviewModal';
import { getApprovalPermissions, getApprovalState } from '../utils/productApproval';
import { useAuthStore } from '../../../store/useAuthStore';

export const ProductManagementPage: React.FC = () => {
    const {
        products,
        totalElements,
        isLoading,
        search,
        statusFilter,
        updateSearch,
        updateStatusFilter,
        refetch,
    } = useProductList();

    // Admin L2 approval state of the listed products (Procurement backend).
    const productIds = useMemo(() => products.map((p) => p.id), [products]);
    const approvals = useProductApprovals(productIds);
    const { reload: reloadApprovals } = approvals;
    const refreshAll = useCallback(() => {
        refetch();
        reloadApprovals();
    }, [refetch, reloadApprovals]);

    const {
        isSubmitting,
        fieldErrors,
        clearFieldErrors,
        createProduct,
        updateProduct,
        updateProductStatus,
        requestProductUpdate,
        applyApprovedUpdate,
        submitForApproval,
        decideApproval,
    } = useProductActions(refreshAll);

    const isAdminL2 = useAuthStore((state) => state.user?.role) === 'ADMIN_L2';
    const [reviewRequest, setReviewRequest] = useState<ProductApprovalResponse | null>(null);

    const approvalFor = useCallback(
        (product: ProductResponse) => {
            const latest = approvals.byProductId.get(product.id);
            return { state: getApprovalState(product, latest, approvals.loaded), latest };
        },
        [approvals.byProductId, approvals.loaded]
    );
    const canActivate = (product: ProductResponse) => getApprovalPermissions(approvalFor(product).state).canActivate;

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
    const [previewProduct, setPreviewProduct] = useState<ProductResponse | null>(null);
    const [statusModalProduct, setStatusModalProduct] = useState<ProductResponse | null>(null);
    const [stockTarget, setStockTarget] = useState<{ product: ProductResponse; mode: StockAdjustMode } | null>(null);

    const handleCreateProductSubmit = async (payload: CreateProductRequest) => {
        const success = await createProduct(payload);
        if (success) {
            setIsCreateModalOpen(false);
        }
        return success;
    };

    const handleEditProductSubmit = async (id: number, payload: UpdateProductRequest, changes: ProductChangeSummary[]) => {
        const target = products.find((p) => p.id === id);
        if (!target) return false;
        const permissions = getApprovalPermissions(approvalFor(target).state);
        if (!permissions.canEdit) return false;
        // Approved products change only after Admin L2 approves; never-approved (inactive) ones are saved directly
        // and stay inactive until their own approval.
        const success = permissions.editNeedsApproval
            ? await requestProductUpdate(target, payload, changes)
            : await updateProduct(id, permissions.canActivate ? payload : { ...payload, enabled: false });
        if (success) {
            setEditingProduct(null);
        }
        return success;
    };

    const handleStatusUpdateSubmit = async (id: number, isEnabled: boolean) => {
        const target = products.find((p) => p.id === id);
        if (isEnabled && target && !canActivate(target)) return false; // needs Admin L2 approval first
        const success = await updateProductStatus(id, { isEnabled });
        if (success) {
            setStatusModalProduct(null);
        }
        return success;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#0071e3]" /> Product Management
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Manage catalog items, pricing, inventory specifications, and publishing states ({totalElements} total entries)
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Filter Bar */}
            <ProductFilterBar
                search={search}
                statusFilter={statusFilter}
                onSearchChange={updateSearch}
                onStatusFilterChange={updateStatusFilter}
                onOpenCreateModal={() => {
                    clearFieldErrors();
                    setIsCreateModalOpen(true);
                }}
            />

            {/* Products Table */}
            <ProductTable
                products={products}
                isLoading={isLoading || isSubmitting}
                onPreview={(product) => setPreviewProduct(product)}
                onEdit={(product) => {
                    clearFieldErrors();
                    setEditingProduct(product);
                }}
                onAdjustStock={(product, mode) => setStockTarget({ product, mode })}
                approvalFor={approvalFor}
                canReview={isAdminL2}
                onSubmitForApproval={(product, isResubmission) => {
                    void submitForApproval(product, isResubmission);
                }}
                onReview={setReviewRequest}
                onApplyUpdate={(request) => {
                    void applyApprovedUpdate(request);
                }}
            />

            {approvals.error && (
                <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">
                    Approval status couldn't be loaded ({approvals.error}). Inactive products can't be activated until it loads.{' '}
                    <button type="button" onClick={reloadApprovals} className="underline cursor-pointer">
                        Retry
                    </button>
                </p>
            )}

            <ProductApprovalReviewModal
                key={reviewRequest?.id ?? 'none'}
                request={reviewRequest}
                isSubmitting={isSubmitting}
                onClose={() => setReviewRequest(null)}
                onDecide={async (decision, reason) => {
                    if (!reviewRequest) return false;
                    const ok = await decideApproval(reviewRequest, decision, reason);
                    if (ok) setReviewRequest(null);
                    return ok;
                }}
            />

            {/* Modals */}
            <CreateProductModal
                isOpen={isCreateModalOpen}
                isSubmitting={isSubmitting}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateProductSubmit}
                serverFieldErrors={fieldErrors}
            />

            <EditProductModal
                product={editingProduct}
                approval={editingProduct ? approvalFor(editingProduct) : undefined}
                isSubmitting={isSubmitting}
                onClose={() => setEditingProduct(null)}
                onSubmit={handleEditProductSubmit}
                serverFieldErrors={fieldErrors}
            />

            <ProductPreviewModal
                product={previewProduct}
                onClose={() => setPreviewProduct(null)}
            />

            {stockTarget && (
                <StockAdjustModal
                    key={`${stockTarget.product.id}-${stockTarget.mode}`}
                    product={stockTarget.product}
                    initialMode={stockTarget.mode}
                    updateProduct={updateProduct}
                    onClose={() => setStockTarget(null)}
                />
            )}

            <ProductStatusModal
                product={statusModalProduct}
                isSubmitting={isSubmitting}
                onClose={() => setStatusModalProduct(null)}
                onSubmit={handleStatusUpdateSubmit}
            />
        </div>
    );
};