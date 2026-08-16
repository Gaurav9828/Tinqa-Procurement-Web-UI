import React, { useState, useEffect, useMemo } from 'react';
import {
    Boxes,
    RefreshCw,
    AlertTriangle,
    Power,
    CheckCircle,
    Edit3,
    PackageSearch,
    Eye,
} from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { Tooltip } from '../../../components/ui/Tooltip';
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
import { ItemPreviewModal } from '../components/ItemPreviewModal';
import { HeaderColumnFilter } from '../components/HeaderColumnFilter';

export const ItemManagementPage: React.FC = () => {
    const {
        items,
        totalElements,
        isLoading,
        error,
        filters,
        updateSearch,
        updateCategoryFilter,
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
    const [previewItem, setPreviewItem] = useState<ItemResponse | null>(null);
    const [targetItemStatusToggle, setTargetItemStatusToggle] =
        useState<ItemResponse | null>(null);

    // Column Header Specific Filters State
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedUoms, setSelectedUoms] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

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

    // Unique options derived dynamically from fetched item set
    const uomOptions = useMemo(() => {
        return Array.from(new Set(items.map((i) => i.unitOfMeasure).filter(Boolean)));
    }, [items]);

    const categoryOptions = useMemo(() => {
        return Array.from(
            new Set(items.map((i) => i.categoryName || `Category #${i.categoryId}`).filter(Boolean))
        );
    }, [items]);

    const statusOptions = ['Active', 'Inactive'];

    // Client-side filtering across column header filters
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const catName = item.categoryName || `Category #${item.categoryId}`;
            const matchesCat =
                selectedCategories.length === 0 || selectedCategories.includes(catName);

            const matchesUom =
                selectedUoms.length === 0 || selectedUoms.includes(item.unitOfMeasure);

            const itemStatus = item.isActive ? 'Active' : 'Inactive';
            const matchesStatus =
                selectedStatuses.length === 0 || selectedStatuses.includes(itemStatus);

            return matchesCat && matchesUom && matchesStatus;
        });
    }, [items, selectedCategories, selectedUoms, selectedStatuses]);

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
        const ok = await toggleItemStatus(targetItemStatusToggle, nextStatus);
        if (ok) setTargetItemStatusToggle(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                        <Boxes className="w-6 h-6 text-[#0071e3]" /> Item Catalog
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
                <Alert type="success" message={actionSuccess} onClose={clearMessages} />
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
            ) : filteredItems.length === 0 ? (
                <div className="apple-card p-12 text-center space-y-2">
                    <PackageSearch className="w-8 h-8 text-gray-400 mx-auto" />
                    <h3 className="text-sm font-semibold">No Items Found</h3>
                    <p className="text-xs text-gray-500">
                        Try adjusting your search criteria or header column filter options.
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
                                    <th className="p-4">
                                        <HeaderColumnFilter
                                            title="Category"
                                            options={categoryOptions}
                                            selectedValues={selectedCategories}
                                            onChange={setSelectedCategories}
                                        />
                                    </th>
                                    <th className="p-4">
                                        <HeaderColumnFilter
                                            title="UOM"
                                            options={uomOptions}
                                            selectedValues={selectedUoms}
                                            onChange={setSelectedUoms}
                                        />
                                    </th>
                                    <th className="p-4">MRP</th>
                                    <th className="p-4">
                                        <HeaderColumnFilter
                                            title="Status"
                                            options={statusOptions}
                                            selectedValues={selectedStatuses}
                                            onChange={setSelectedStatuses}
                                        />
                                    </th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {filteredItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="p-4 max-w-xs">
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
                                                    <div className="mt-0.5">
                                                        <Tooltip title={item.name} content={item.description}>
                                                            <span className="text-[11px] text-gray-400 truncate max-w-[200px] block cursor-help">
                                                                {item.description}
                                                            </span>
                                                        </Tooltip>
                                                    </div>
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
                                                {/* Preview Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewItem(item);
                                                    }}
                                                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-[#0071e3] transition-colors cursor-pointer"
                                                    title="Preview Item Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                {/* Edit Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEditItem(item);
                                                    }}
                                                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors cursor-pointer"
                                                    title="Edit Item"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>

                                                {/* Inactivate/Activate Button */}
                                                {item.isActive ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTargetItemStatusToggle(item);
                                                        }}
                                                        className="p-2 hover:bg-amber-500/10 text-amber-600 rounded-lg transition-colors cursor-pointer"
                                                        title="Inactivate Item"
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTargetItemStatusToggle(item);
                                                        }}
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

            {/* Item Details Preview Modal */}
            <ItemPreviewModal
                isOpen={!!previewItem}
                item={previewItem}
                onClose={() => setPreviewItem(null)}
            />

            {/* Confirmation Dialog for Item Status Toggle */}
            {targetItemStatusToggle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-amber-500">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-base font-bold text-black dark:text-white">
                                {targetItemStatusToggle.isActive ? 'Inactivate' : 'Activate'} Item?
                            </h3>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Are you sure you want to {targetItemStatusToggle.isActive ? 'inactivate' : 'activate'}{' '}
                            <span className="font-semibold text-black dark:text-white">
                                "{targetItemStatusToggle.name}"
                            </span>
                            ?
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setTargetItemStatusToggle(null)}
                                className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmStatusToggle}
                                disabled={isSubmitting}
                                className={`px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                                    targetItemStatusToggle.isActive
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {targetItemStatusToggle.isActive ? (
                                    <Power className="w-3.5 h-3.5" />
                                ) : (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                Confirm {targetItemStatusToggle.isActive ? 'Inactivation' : 'Activation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals Container */}
            <CategoryFormModal
                isOpen={isCategoryModalOpen}
                isSubmitting={isSubmitting}
                onClose={() => setIsCategoryModalOpen(false)}
                onSubmit={handleCreateCategory}
            />

            <ItemFormModal
                isOpen={isItemModalOpen}
                isSubmitting={isSubmitting}
                apiError={actionError}
                categories={categories}
                items={items}
                initialData={selectedItem}
                onClose={() => setIsItemModalOpen(false)}
                onSubmit={handleItemSubmit}
            />
        </div>
    );
};