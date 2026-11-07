import React, { useCallback, useMemo, useState } from 'react';
import { GripVertical, Package, RefreshCw } from 'lucide-react';
import { useProductList } from '../hooks/useProductList';
import { useProductActions } from '../hooks/useProductActions';
import { ProductFilterBar } from '../components/ProductFilterBar';
import { ProductTable } from '../components/ProductTable';
import { CreateProductModal } from '../components/CreateProductModal';
import { EditProductModal } from '../components/EditProductModal';
import { ProductPreviewModal } from '../components/ProductPreviewModal';
import { ProductStatusModal } from '../components/ProductStatusModal';
import { StockAdjustModal } from '../components/StockAdjustModal';
import { ResubmitProductModal } from '../components/ResubmitProductModal';
import type { StockAdjustMode } from '../utils/stockAdjustment';
import type { ProductResponse, CreateProductRequest, UpdateProductRequest } from '../types/product.types';
import type { ProductApprovalResponse, ProductChangeSummary, ProductCostSummary } from '../types/productApproval.types';
import { useProductApprovals } from '../hooks/useProductApprovals';
import { ProductApprovalReviewModal } from '../components/ProductApprovalReviewModal';
import { getApprovalPermissions, getApprovalState } from '../utils/productApproval';
import { useAccess } from '../../../hooks/useAccess';
import { useProductCategories } from '../hooks/useProductCategories';
import { StockEntryPanel } from '../components/StockEntryPanel';
import { useProductPageTab } from '../hooks/useProductPageTab';
import { ProductPageTabs } from '../components/ProductPageTabs';

export const ProductManagementPage: React.FC = () => {
    const {
        products,
        allProducts,
        totalElements,
        isLoading,
        search,
        statusFilter,
        categoryFilter,
        updateSearch,
        updateStatusFilter,
        updateCategoryFilter,
        refetch,
        isReordering,
        moveProduct,
    } = useProductList();
    const categories = useProductCategories(allProducts);
    const { can } = useAccess();

    const canAdjustStock = can('STOREFRONT_STOCK_UPDATE');
    // Only the open tab is rendered, so a hidden tab fetches nothing
    const { tab, openProductId, showTab, forgetOpenProduct } = useProductPageTab(canAdjustStock);

    // Admin L2 approval state of the listed products (Procurement backend); the Stock entry tab offers every product.
    const productIds = useMemo(() => (tab === 'stock-entry' ? allProducts : products).map((p) => p.id), [tab, allProducts, products]);
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
        saveDraft,
        createNewVersion,
        updateProduct,
        updateProductStatus,
        requestProductUpdate,
        applyApprovedUpdate,
        submitForApproval,
        decideApproval,
    } = useProductActions(refreshAll);

    const canReview = can('PRODUCT_APPROVAL_DECIDE');
    const productActions = useMemo(
        () => ({
            canEdit: can('PRODUCT_UPDATE'),
            canAdjustStock,
            canSubmit: can('PRODUCT_APPROVAL_SUBMIT'),
            canPublish: can('PRODUCT_PUBLISH'),
        }),
        [can, canAdjustStock]
    );
    const [reviewRequest, setReviewRequest] = useState<ProductApprovalResponse | null>(null);

    // Storefront order: PRODUCT_PUBLISH decides what the storefront shows, so also where. A search shows a scattered
    // subset, so dragging waits until it is cleared.
    const canReorder = can('PRODUCT_PUBLISH');
    const isSearching = search.trim() !== '';
    const reorderCategory = categories.find((category) => category.slug === categoryFilter);
    let reorderHint = 'Drag a product by its handle to set the order of the whole catalog on the storefront. Choose a category to arrange only its products.';
    if (isSearching) reorderHint = 'Clear the search to drag products into a new order.';
    else if (reorderCategory) {
        reorderHint = `Drag a product by its handle to set where it appears among ${reorderCategory.name} on the storefront. Other categories don't move.`;
    }

    const approvalFor = useCallback(
        (product: ProductResponse) => {
            const latest = approvals.byProductId.get(product.id);
            return { state: getApprovalState(product, latest, approvals.loaded), latest };
        },
        [approvals.byProductId, approvals.loaded]
    );
    const canActivate = (product: ProductResponse) => getApprovalPermissions(approvalFor(product).state).canActivate;
    // Units are added in the Stock entry tab, one row per unit; reducing stays a pop-up
    const onAdjustStock = (product: ProductResponse, mode: StockAdjustMode) => {
        if (mode === 'add') showTab('stock-entry', product.id);
        else setReducing(product);
    };
    const canAddStockTo = useCallback(
        (product: ProductResponse) => getApprovalPermissions(approvalFor(product).state).canAddStock,
        [approvalFor]
    );

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
    const [previewProduct, setPreviewProduct] = useState<ProductResponse | null>(null);
    const [statusModalProduct, setStatusModalProduct] = useState<ProductResponse | null>(null);
    // Reducing stock is a pop-up; adding opens the product's stock entry
    const [reducing, setReducing] = useState<ProductResponse | null>(null);
    const [resubmitting, setResubmitting] = useState<ProductResponse | null>(null);
    // A saved draft being finished, in its own copy of the create form
    const [openDraft, setOpenDraft] = useState<ProductResponse | null>(null);
    const canCreate = can('PRODUCT_CREATE');

    // A new version opens straight away in the draft form (PRODUCT_CREATE)
    const onCreateVersion = canCreate
        ? (product: ProductResponse) =>
              void createNewVersion(product).then((created) => {
                  if (!created) return;
                  setEditingProduct(null);
                  setOpenDraft(created);
              })
        : undefined;

    const handleCreateProductSubmit = async (payload: CreateProductRequest, costSummary?: ProductCostSummary) => {
        const success = await createProduct(payload, costSummary);
        if (success) {
            setIsCreateModalOpen(false);
        }
        return success;
    };

    const handleEditProductSubmit = async (
        id: number,
        payload: UpdateProductRequest,
        changes: ProductChangeSummary[],
        costSummary?: ProductCostSummary
    ) => {
        const target = products.find((p) => p.id === id);
        if (!target) return false;
        const permissions = getApprovalPermissions(approvalFor(target).state);
        if (!permissions.canEdit) return false;
        // Approved products change only after Admin L2 approves; never-approved (inactive) ones are saved directly
        // and stay inactive until their own approval.
        const success = permissions.editNeedsApproval
            ? await requestProductUpdate(target, payload, changes, (productId) => allProducts.find((p) => p.id === productId)?.title, costSummary)
            : await updateProduct(id, permissions.canActivate ? payload : { ...payload, enabled: false });
        if (success) {
            setEditingProduct(null);
        }
        return success;
    };

    const handleStatusUpdateSubmit = async (id: number, isEnabled: boolean) => {
        const target = products.find((p) => p.id === id);
        if (isEnabled && target && !canActivate(target)) return false; // needs approval first
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

            {canAdjustStock && <ProductPageTabs tab={tab} onChange={(next) => showTab(next)} />}

            {tab === 'stock-entry' && (
                <StockEntryPanel
                    products={allProducts}
                    canAddStockTo={canAddStockTo}
                    openProductId={openProductId}
                    onOpenedProduct={forgetOpenProduct}
                    onStockAdded={refreshAll}
                />
            )}

            {tab === 'products' && (
            <>
            {/* Filter Bar */}
            <ProductFilterBar
                search={search}
                statusFilter={statusFilter}
                onSearchChange={updateSearch}
                onStatusFilterChange={updateStatusFilter}
                categories={categories}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={updateCategoryFilter}
                onOpenCreateModal={
                    canCreate
                        ? () => {
                              clearFieldErrors();
                              setIsCreateModalOpen(true);
                          }
                        : undefined
                }
            />

            {canReorder && allProducts.length > 1 && (
                <p className="flex items-center gap-1.5 -mt-3 text-xs text-gray-500">
                    <GripVertical className="w-3.5 h-3.5 shrink-0" /> {reorderHint}
                </p>
            )}

            {/* Products Table */}
            <ProductTable
                products={products}
                isLoading={isLoading || isSubmitting}
                onPreview={(product) => setPreviewProduct(product)}
                onEdit={(product) => {
                    clearFieldErrors();
                    (product.draft ? setOpenDraft : setEditingProduct)(product);
                }}
                onAdjustStock={onAdjustStock}
                approvalFor={approvalFor}
                canReview={canReview}
                actions={productActions}
                onSubmitForApproval={(product, isResubmission) => {
                    // A resubmitted product's units in stock are scanned again (the rejection released them)
                    if (isResubmission && product.stockQuantity > 0) setResubmitting(product);
                    else void submitForApproval(product, isResubmission);
                }}
                onReview={setReviewRequest}
                onApplyUpdate={(request) => {
                    void applyApprovedUpdate(request);
                }}
                onMove={canReorder && !isSearching ? (from, to) => void moveProduct(from, to) : undefined}
                isReordering={isReordering}
                allProducts={allProducts}
                onCreateVersion={onCreateVersion}
            />

            {approvals.error && (
                <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">
                    Approval status couldn't be loaded ({approvals.error}). Inactive products can't be activated until it loads.{' '}
                    <button type="button" onClick={reloadApprovals} className="underline cursor-pointer">
                        Retry
                    </button>
                </p>
            )}
            </>
            )}

            {resubmitting && (
                <ResubmitProductModal
                    product={resubmitting}
                    isSubmitting={isSubmitting}
                    onClose={() => setResubmitting(null)}
                    onSubmit={(units) => submitForApproval(resubmitting, true, units)}
                />
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
                onSaveDraft={(payload) => saveDraft(payload)}
                serverFieldErrors={fieldErrors}
                products={allProducts}
                categories={categories}
            />

            {openDraft && (
                <CreateProductModal
                    key={openDraft.id}
                    draft={openDraft}
                    isOpen
                    isSubmitting={isSubmitting}
                    onClose={() => setOpenDraft(null)}
                    onSubmit={(payload, costSummary) =>
                        createProduct(payload, costSummary, openDraft.id).then((submitted) => {
                            if (submitted) setOpenDraft(null);
                            return submitted;
                        })
                    }
                    // Saving a draft again is an edit (PRODUCT_UPDATE, held with PRODUCT_CREATE)
                    onSaveDraft={(payload) => saveDraft(payload, openDraft.id)}
                    serverFieldErrors={fieldErrors}
                    products={allProducts.filter((p) => p.id !== openDraft.id)}
                    categories={categories}
                />
            )}

            <EditProductModal
                product={editingProduct}
                approval={editingProduct ? approvalFor(editingProduct) : undefined}
                isSubmitting={isSubmitting}
                onClose={() => setEditingProduct(null)}
                onSubmit={handleEditProductSubmit}
                serverFieldErrors={fieldErrors}
                products={allProducts}
                categories={categories}
                onCreateVersion={onCreateVersion}
            />

            <ProductPreviewModal
                product={previewProduct}
                onClose={() => setPreviewProduct(null)}
            />

            {reducing && (
                <StockAdjustModal key={reducing.id} product={reducing} updateProduct={updateProduct} onClose={() => setReducing(null)} />
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