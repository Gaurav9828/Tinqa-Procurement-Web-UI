import React, { useState } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { useProductList } from '../hooks/useProductList';
import { useProductActions } from '../hooks/useProductActions';
import { ProductFilterBar } from '../components/ProductFilterBar';
import { ProductTable } from '../components/ProductTable';
import { CreateProductModal } from '../components/CreateProductModal';
import { EditProductModal } from '../components/EditProductModal';
import { ProductPreviewModal } from '../components/ProductPreviewModal';
import { ProductStatusModal } from '../components/ProductStatusModal';
import type { ProductResponse, CreateProductRequest, UpdateProductRequest } from '../types/product.types';
import { Alert } from '../../../components/ui/Alert';

export const ProductManagementPage: React.FC = () => {
    const {
        products,
        totalElements,
        isLoading,
        error,
        search,
        statusFilter,
        updateSearch,
        updateStatusFilter,
        refetch,
    } = useProductList();

    const {
        isSubmitting,
        actionError,
        actionSuccess,
        clearMessages,
        createProduct,
        updateProduct,
        updateProductStatus,
    } = useProductActions(refetch);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
    const [previewProduct, setPreviewProduct] = useState<ProductResponse | null>(null);
    const [statusModalProduct, setStatusModalProduct] = useState<ProductResponse | null>(null);

    const handleCreateProductSubmit = async (payload: CreateProductRequest) => {
        const success = await createProduct(payload);
        if (success) {
            setIsCreateModalOpen(false);
        }
        return success;
    };

    const handleEditProductSubmit = async (id: number, payload: UpdateProductRequest) => {
        const success = await updateProduct(id, payload);
        if (success) {
            setEditingProduct(null);
        }
        return success;
    };

    const handleStatusUpdateSubmit = async (id: number, isEnabled: boolean) => {
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

            {actionSuccess && (
                <Alert type="success" message={actionSuccess} onClose={clearMessages} />
            )}
            {(error || actionError) && (
                <Alert type="error" message={actionError || error} onClose={clearMessages} />
            )}

            {/* Filter Bar */}
            <ProductFilterBar
                search={search}
                statusFilter={statusFilter}
                onSearchChange={updateSearch}
                onStatusFilterChange={updateStatusFilter}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />

            {/* Products Table */}
            <ProductTable
                products={products}
                isLoading={isLoading || isSubmitting}
                onPreview={(product) => setPreviewProduct(product)}
                onEdit={(product) => setEditingProduct(product)}
            />

            {/* Modals */}
            <CreateProductModal
                isOpen={isCreateModalOpen}
                isSubmitting={isSubmitting}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateProductSubmit}
            />

            <EditProductModal
                product={editingProduct}
                isSubmitting={isSubmitting}
                onClose={() => setEditingProduct(null)}
                onSubmit={handleEditProductSubmit}
            />

            <ProductPreviewModal
                product={previewProduct}
                onClose={() => setPreviewProduct(null)}
            />

            <ProductStatusModal
                product={statusModalProduct}
                isSubmitting={isSubmitting}
                onClose={() => setStatusModalProduct(null)}
                onSubmit={handleStatusUpdateSubmit}
            />
        </div>
    );
};