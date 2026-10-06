import React, { useState } from 'react';
import { ShoppingCart, RefreshCw } from 'lucide-react';
import { useOrderList } from '../hooks/useOrderList';
import { useOrderActions } from '../hooks/useOrderActions';
import { useDealerOptions, useItemOptions } from '../../../hooks/useLookupOptions';
import { OrderFilterBar } from '../components/OrderFilterBar';
import { OrderTable } from '../components/OrderTable';
import { CreateOrderModal } from '../components/CreateOrderModal';
import { EditOrderModal } from '../components/EditOrderModal';
import { OrderPreviewModal } from '../components/OrderPreviewModal';
import type { CreateOrderRequest, OrderResponse, UpdateOrderRequest, UpdateOrderStatusRequest } from '../types/order.types';

export const OrderManagementPage: React.FC = () => {
    const {
        orders,
        totalElements,
        isLoading,
        search,
        statusFilter,
        dealerFilter,
        updateSearch,
        updateStatusFilter,
        updateDealerFilter,
        refetch,
    } = useOrderList();

    // Full (cached) lists for the filter bar and modal dropdowns — not a single 10-row page.
    const { options: dealers } = useDealerOptions();
    const { options: items } = useItemOptions();

    const {
        isSubmitting,
        createOrder,
        updateOrder,
        updateOrderStatus,
    } = useOrderActions(refetch);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<OrderResponse | null>(null);
    const [selectedPreviewOrder, setSelectedPreviewOrder] = useState<OrderResponse | null>(null);

    const handleStatusChange = async (
        order: OrderResponse,
        payload: UpdateOrderStatusRequest
    ) => {
        await updateOrderStatus(order.id, payload);
    };

    const handleCreateOrderSubmit = async (formData: CreateOrderRequest) => {
        const success = await createOrder(formData);
        if (success) {
            setIsCreateModalOpen(false);
        }
    };

    const handleEditOrderSubmit = async (orderId: number, formData: UpdateOrderRequest) => {
        const success = await updateOrder(orderId, formData);
        // Keep the modal open on failure so the user can correct and retry.
        if (success) setEditingOrder(null);
    };



    return (
        <div className="p-6 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-[#0071e3]" /> Order Management
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Manage procurement orders, status tracking, and dealer assignments ({totalElements} total entries)
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Search and Filters */}
            <OrderFilterBar
                searchQuery={search}
                selectedStatus={statusFilter}
                selectedDealerId={dealerFilter}
                dealers={dealers}
                onSearchChange={updateSearch}
                onStatusChange={updateStatusFilter}
                onDealerChange={updateDealerFilter}
                onOpenCreateOrderModal={() => setIsCreateModalOpen(true)}
            />

            {/* Table */}
            <OrderTable
                orders={orders}
                isLoading={isLoading || isSubmitting}
                onPreview={(order) => setSelectedPreviewOrder(order)}
                onEdit={(order) => setEditingOrder(order)}
                onStatusUpdate={handleStatusChange}
            />

            {/* Modals */}
            <CreateOrderModal
                isOpen={isCreateModalOpen}
                isSubmitting={isSubmitting}
                items={items}
                dealers={dealers}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateOrderSubmit}
            />

            <EditOrderModal
                order={editingOrder}
                isOpen={!!editingOrder}
                isSubmitting={isSubmitting}
                items={items}
                dealers={dealers}
                onClose={() => setEditingOrder(null)}
                onSubmit={handleEditOrderSubmit}
            />

            <OrderPreviewModal
                order={selectedPreviewOrder}
                onClose={() => setSelectedPreviewOrder(null)}
            />
        </div>
    );
};