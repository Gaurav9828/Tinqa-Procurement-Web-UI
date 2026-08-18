import React, { useState } from 'react';
import { ShoppingCart, RefreshCw } from 'lucide-react';
import { useOrderList } from '../hooks/useOrderList';
import { useOrderActions } from '../hooks/useOrderActions';
import { useDealerList } from '../../dealer-management/hooks/useDealerList';
import { useItemList } from '../../item-management/hooks/useItemList';
import { OrderFilterBar } from '../components/OrderFilterBar';
import { OrderTable } from '../components/OrderTable';
import { CreateOrderModal } from '../components/CreateOrderModal';
import { EditOrderModal } from '../components/EditOrderModal';
import { OrderPreviewModal } from '../components/OrderPreviewModal';
import type { OrderResponse, UpdateOrderStatusRequest } from '../types/order.types';
import { Alert } from '../../../components/ui/Alert';

interface OrderManagementPageProps {
    userRole?: 'ADMIN_L1' | 'ADMIN_L2' | string;
}

export const OrderManagementPage: React.FC<OrderManagementPageProps> = () => {
    const {
        orders,
        totalElements,
        isLoading,
        error,
        search,
        statusFilter,
        dealerFilter,
        updateSearch,
        updateStatusFilter,
        updateDealerFilter,
        refetch,
    } = useOrderList();

    const { dealers } = useDealerList();
    const { items } = useItemList();

    const {
        isSubmitting,
        actionError,
        actionSuccess,
        clearMessages,
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

    const handleCreateOrderSubmit = async (formData: any) => {
        const success = await createOrder(formData);
        if (success) {
            setIsCreateModalOpen(false);
        }
    };

    const handleEditOrderSubmit = async (orderId: number, formData: any) => {
        if (updateOrder) {
            const success = await updateOrder(orderId, formData);
            if (success) {
                setEditingOrder(null);
            }
        }
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

            {actionSuccess && (
                <Alert type="success" message={actionSuccess} onClose={clearMessages} />
            )}
            {(error || actionError) && (
                <Alert type="error" message={actionError || error} onClose={clearMessages} />
            )}

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