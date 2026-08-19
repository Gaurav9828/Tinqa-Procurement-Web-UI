import React, { useState } from 'react';
import { Eye, Pencil, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { OrderResponse, UpdateOrderStatusRequest } from '../types/order.types';
import { useAuthStore } from '../../../store/useAuthStore';
import { ORDER_STATUS, type OrderStatus } from '../../../types/common.types';

interface OrderTableProps {
    orders: OrderResponse[];
    isLoading: boolean;
    onPreview: (order: OrderResponse) => void;
    onEdit: (order: OrderResponse) => void;
    onStatusUpdate: (order: OrderResponse, payload: UpdateOrderStatusRequest) => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({
    orders,
    isLoading,
    onPreview,
    onEdit,
    onStatusUpdate,
}) => {
    const { user } = useAuthStore();
    const userRole = user?.role || 'ADMIN_L1';
    const isL2User = userRole === 'ADMIN_L2';

    // State for managing the confirmation modal
    const [pendingChange, setPendingChange] = useState<{
        order: OrderResponse;
        newStatus: OrderStatus;
    } | null>(null);
    const [actualDeliveryDate, setActualDeliveryDate] = useState<string>('');

    const handleSelectChange = (order: OrderResponse, newStatus: OrderStatus) => {
        if (order.orderStatus === newStatus) return;

        setPendingChange({ order, newStatus });
        
        // Pre-fill delivery date if available and updating to DELIVERED, otherwise default to today
        if (newStatus === 'DELIVERED') {
            setActualDeliveryDate(order.actualDelivery || new Date().toISOString().split('T')[0]);
        } else {
            setActualDeliveryDate('');
        }
    };

    const handleConfirmStatusChange = () => {
        if (!pendingChange) return;

        const { order, newStatus } = pendingChange;

        // If status is not DELIVERED, set actualDelivery to null/empty
        const payload: UpdateOrderStatusRequest = {
            status: newStatus,
            actualDelivery: newStatus === 'DELIVERED' ? actualDeliveryDate || undefined : undefined,
        };

        onStatusUpdate(order, payload);
        setPendingChange(null);
        setActualDeliveryDate('');
    };

    const handleCancelModal = () => {
        setPendingChange(null);
        setActualDeliveryDate('');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-12 text-gray-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading orders...
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="text-center p-12 text-gray-400 text-xs border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                No orders found.
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto border border-black/10 dark:border-white/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-gray-500">
                            <th className="p-3 font-semibold">Order Number</th>
                            <th className="p-3 font-semibold">Dealer</th>
                            <th className="p-3 font-semibold">Item</th>
                            <th className="p-3 font-semibold">Quantity</th>
                            <th className="p-3 font-semibold">Total Price</th>
                            <th className="p-3 font-semibold">Status</th>
                            <th className="p-3 font-semibold">Order Date</th>
                            <th className="p-3 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 dark:divide-white/10">
                        {orders.map((order) => {
                            const isSelectDisabled = !isL2User && (order.orderStatus === 'PENDING' || order.orderStatus === 'DEALER_LEVEL_PENDING' || order.orderStatus === 'CANCELLED');

                            return (
                                <tr key={order.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                                    <td className="p-3 font-mono font-medium text-black dark:text-white">{order.orderNumber}</td>
                                    <td className="p-3 font-medium text-black dark:text-white">{order.dealerName}</td>
                                    <td className="p-3 text-gray-600 dark:text-gray-300">{order.itemName}</td>
                                    <td className="p-3 text-gray-600 dark:text-gray-300">
                                        {order.orderQuantity} {order.unitType}
                                    </td>
                                    <td className="p-3 font-semibold text-black dark:text-white">
                                        ₹{order.totalPrice?.toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-3">
                                        <OrderStatusBadge status={order.orderStatus} />
                                    </td>
                                    <td className="p-3 text-gray-500">{order.orderDate}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => onPreview(order)}
                                                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
                                                title="View Details"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                disabled={isSelectDisabled}
                                                onClick={() => !isSelectDisabled && onEdit(order)}
                                                className={`p-1.5 rounded-lg text-gray-500 transition-colors ${
                                                    isSelectDisabled
                                                        ? 'cursor-not-allowed opacity-60 hover:bg-transparent hover:text-gray-500'
                                                        : 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white cursor-pointer'
                                                }`}
                                                title={isSelectDisabled ? 'Cannot edit cancelled order' : 'Edit Order'}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <select
                                                value={order.orderStatus}
                                                disabled={isSelectDisabled}
                                                onChange={(e) => handleSelectChange(order, e.target.value as OrderStatus)}
                                                className={`px-2 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-[11px] focus:outline-none ${
                                                    isSelectDisabled
                                                        ? 'text-gray-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                                                        : 'text-black dark:text-white cursor-pointer'
                                                }`}
                                            >
                                                {(!isL2User ? ORDER_STATUS.filter((status) => status !== 'PENDING' && status !== 'DEALER_LEVEL_PENDING') : 
                                                    ORDER_STATUS).map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Status Change Confirmation Modal */}
            {pendingChange && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                            <div className="flex items-center gap-2 text-amber-500">
                                <AlertTriangle className="w-4 h-4" />
                                <h3 className="text-xs font-bold text-black dark:text-white">
                                    Confirm Status Change
                                </h3>
                            </div>
                            <button
                                onClick={handleCancelModal}
                                className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-neutral-300 leading-relaxed">
                            Are you sure you want to change the status of order{' '}
                            <span className="font-mono font-semibold text-black dark:text-white">
                                {pendingChange.order.orderNumber}
                            </span>{' '}
                            from <span className="font-semibold">{pendingChange.order.orderStatus}</span> to{' '}
                            <span className="font-semibold text-[#0071e3]">{pendingChange.newStatus}</span>?
                        </p>

                        {/* Input Actual Delivery Date if new status is DELIVERED */}
                        {pendingChange.newStatus === 'DELIVERED' && (
                            <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-gray-700 dark:text-neutral-300">
                                    Actual Delivery Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={actualDeliveryDate}
                                    min={pendingChange.order.orderDate}
                                    onChange={(e) => setActualDeliveryDate(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                            <button
                                type="button"
                                onClick={handleCancelModal}
                                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-black/10 dark:border-white/10 text-gray-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmStatusChange}
                                disabled={pendingChange.newStatus === 'DELIVERED' && !actualDeliveryDate}
                                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#0071e3] text-white hover:bg-[#0071e3]/90 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};