import React, { useState, useEffect } from 'react';
import {
    Package,
    RefreshCw,
    AlertTriangle,
    Power,
    CheckCircle,
    Edit3,
    PackageSearch,
} from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { useItemList } from '../hooks/useItemList';
import { useItemActions } from '../hooks/useItemActions';
import { itemApi } from '../api/itemApi';
import type {
    CategoryResponse,
    ItemResponse,
    CreateItemRequest,
    UpdateItemRequest,
} from '../types/item.types';

import { ItemFilterBar } from '../components/ItemFilterBar';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { ItemFormModal } from '../components/ItemFormModal';
import { ItemStatusBadge } from '../components/ItemStatusBadge';

export const ItemManagementPage: React.FC = () => {
    const {
        items,
        totalPages,
        totalElements,
        isLoading,
        error,
        filters,
        updateSearch,
        updateCategoryFilter,
        updatePage,
        refetch,
    } = useItemList();

    const {
        isSubmitting,
        actionError,
        actionSuccess,
        clearMessages,
        createCategory,
        createItem,
        updateItem,
        toggleItemStatus,
    } = useItemActions(refetch);

    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ItemResponse | null>(null);
    const [targetItemStatusToggle, setTargetItemStatusToggle] =
        useState<ItemResponse | null>(null);

    const loadCategories = async () => {
        try {
            const res = await itemApi.getAllCategories();
            if (res.success && res.data) {
                setCategories(res.data);
            }
        } catch {
            // Handled silently
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleCreateCategory = async (data: any) => {
        const success = await createCategory(data);
        if (success) {
            await loadCategories();
        }
        return success;
    };

    const handleOpenCreateItem = () => {
        clearMessages();
        setSelectedItem(null);
        setIsItemModalOpen(true);
    };

    const handleOpenEditItem = (item: ItemResponse) => {
        clearMessages();
        setSelectedItem(item);
        setIsItemModalOpen(true);
    };

    const handleCloseItemModal = () => {
        setIsItemModalOpen(false);
    };

    const handleItemSubmit = async (
        data: CreateItemRequest | UpdateItemRequest
    ) => {
        if (selectedItem) {
            return await updateItem(selectedItem.id, data as UpdateItemRequest);
        }
        return await createItem(data as CreateItemRequest);
    };

    const handleConfirmStatusToggle = async () => {
        if (!targetItemStatusToggle) return;
        const nextStatus = !targetItemStatusToggle.isActive;

        // Pass the item object and next status
        const ok = await toggleItemStatus(targetItemStatusToggle, nextStatus);
        if (ok) setTargetItemStatusToggle(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                        <Package className="w-6 h-6 text-[#0071e3]" /> Item Catalog
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                        Manage product items, MRP pricing details, and categories.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-gray-500 transition-colors cursor-pointer"
                        title="Refresh Catalog"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-[#0071e3] border border-blue-500/20">
                        Total: {totalElements}
                    </span>
                </div>
            </div>

            {/* Page Alerts */}
            {actionSuccess && (
                <Alert
                    type="success"
                    message={actionSuccess}
                    onClose={clearMessages}
                />
            )}
            {!isItemModalOpen && actionError && (
                <Alert type="error" message={actionError} onClose={clearMessages} />
            )}

            {/* Toolbar */}
            <ItemFilterBar
                searchQuery={filters.search || ''}
                selectedCategoryId={filters.categoryId}
                categories={categories}
                onSearchChange={updateSearch}
                onCategoryChange={updateCategoryFilter}
                onOpenCreateItemModal={handleOpenCreateItem}
                onOpenCreateCategoryModal={() => setIsCategoryModalOpen(true)}
            />

            {/* Item Table */}
            {error ? (
                <Alert type="error" message={error} />
            ) : isLoading ? (
                <div className="apple-card p-12 text-center text-gray-500 dark:text-neutral-400">
                    <div className="inline-block w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-sm">Loading item catalog...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="apple-card p-12 text-center space-y-2">
                    <PackageSearch className="w-8 h-8 text-gray-400 mx-auto" />
                    <h3 className="text-sm font-semibold">No Items Found</h3>
                    <p className="text-xs text-gray-500">
                        Try adjusting your search criteria or adding new items.
                    </p>
                </div>
            ) : (
                <div className="apple-card overflow-hidden border border-black/10 dark:border-white/10">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Item Details</th>
                                    <th className="p-4">SKU</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">UOM</th>
                                    <th className="p-4">MRP</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="p-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-black dark:text-white">
                                                        {item.name}
                                                    </span>
                                                    {item.brand && (
                                                        <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-medium text-gray-600 dark:text-neutral-300">
                                                            {item.brand}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.description && (
                                                    <span className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 block">
                                                        {item.description}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono font-medium text-[#0071e3]">
                                            {item.sku || '—'}
                                        </td>
                                        <td className="p-4 font-medium text-black dark:text-white">
                                            {item.categoryName || `Category #${item.categoryId}`}
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-neutral-300 font-medium">
                                            {item.unitOfMeasure}
                                        </td>
                                        <td className="p-4 font-semibold text-black dark:text-white">
                                            {item.mrp !== undefined && item.mrp !== null
                                                ? `₹${Number(item.mrp).toLocaleString('en-IN', {
                                                    minimumFractionDigits: 2,
                                                })}`
                                                : 'N/A'}
                                        </td>
                                        <td className="p-4">
                                            <ItemStatusBadge active={item.isActive} />
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditItem(item)}
                                                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors cursor-pointer"
                                                    title="Edit Item"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>

                                                {/* Inline Status Toggle Buttons */}
                                                {item.isActive ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setTargetItemStatusToggle(item)}
                                                        className="p-2 hover:bg-amber-500/10 text-amber-600 rounded-lg transition-colors cursor-pointer"
                                                        title="Inactivate Item"
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setTargetItemStatusToggle(item)}
                                                        className="p-2 hover:bg-emerald-500/10 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                                        title="Activate Item"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                    <span>
                        Page {(filters.page || 0) + 1} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={(filters.page || 0) === 0}
                            onClick={() => updatePage((filters.page || 0) - 1)}
                            className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            disabled={(filters.page || 0) + 1 >= totalPages}
                            onClick={() => updatePage((filters.page || 0) + 1)}
                            className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Category Creation Modal */}
            <CategoryFormModal
                isOpen={isCategoryModalOpen}
                isSubmitting={isSubmitting}
                onClose={() => setIsCategoryModalOpen(false)}
                onSubmit={handleCreateCategory}
            />

            {/* Item Form Modal */}
            <ItemFormModal
                isOpen={isItemModalOpen}
                isSubmitting={isSubmitting}
                apiError={actionError}
                categories={categories}
                items={items}
                initialData={selectedItem}
                onClose={handleCloseItemModal}
                onSubmit={handleItemSubmit}
            />

            {/* Inactivation / Activation Confirmation Modal */}
            {targetItemStatusToggle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-4">
                        <div
                            className={`flex items-center gap-3 ${targetItemStatusToggle.isActive
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                }`}
                        >
                            <div
                                className={`p-2 rounded-xl ${targetItemStatusToggle.isActive
                                        ? 'bg-amber-500/10'
                                        : 'bg-emerald-500/10'
                                    }`}
                            >
                                {targetItemStatusToggle.isActive ? (
                                    <AlertTriangle className="w-6 h-6" />
                                ) : (
                                    <CheckCircle className="w-6 h-6" />
                                )}
                            </div>
                            <h3 className="font-bold text-base text-black dark:text-white">
                                {targetItemStatusToggle.isActive
                                    ? 'Inactivate Item'
                                    : 'Activate Item'}
                            </h3>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-neutral-400">
                            Are you sure you want to mark{' '}
                            <span className="font-semibold text-black dark:text-white">
                                "{targetItemStatusToggle.name}"
                            </span>{' '}
                            ({targetItemStatusToggle.sku}) as{' '}
                            <span
                                className={`font-semibold ${targetItemStatusToggle.isActive
                                        ? 'text-amber-600'
                                        : 'text-emerald-600'
                                    }`}
                            >
                                {targetItemStatusToggle.isActive ? 'Inactive' : 'Active'}
                            </span>
                            ?
                        </p>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setTargetItemStatusToggle(null)}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmStatusToggle}
                                disabled={isSubmitting}
                                className={`px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${targetItemStatusToggle.isActive
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                            >
                                {targetItemStatusToggle.isActive ? (
                                    <Power className="w-3.5 h-3.5" />
                                ) : (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                Confirm{' '}
                                {targetItemStatusToggle.isActive
                                    ? 'Inactivation'
                                    : 'Activation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};