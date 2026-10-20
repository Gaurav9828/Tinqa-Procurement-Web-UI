import React from 'react';
import { Eye, ListChecks, Lock, Pencil, RefreshCw } from 'lucide-react';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { OrderResponse } from '../types/order.types';
import {
    DEALER_CHANGE_BLOCK_REASON,
    ORDER_STATUS_INFO,
    canEditOrder,
    getNextOrderStatuses,
    getOrderBlockReason,
    isFrozenByDealerChange,
    orderAccessFrom,
} from '../utils/orderWorkflow';
import { useAccess } from '../../../hooks/useAccess';

interface OrderTableProps {
    orders: OrderResponse[];
    isLoading: boolean;
    onPreview: (order: OrderResponse) => void;
    onEdit: (order: OrderResponse) => void;
    /** Opens the status dialog, which offers only the allowed next steps. */
    onOpenStatus: (order: OrderResponse) => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({ orders, isLoading, onPreview, onEdit, onOpenStatus }) => {
    const { can } = useAccess();
    const access = orderAccessFrom(can);

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
                        const frozen = isFrozenByDealerChange(order);
                        const editable = !frozen && canEditOrder(order.orderStatus, access);
                        const next = frozen ? [] : getNextOrderStatuses(order.orderStatus, access);
                        const blockReason = frozen
                            ? DEALER_CHANGE_BLOCK_REASON
                            : next.length ? null : getOrderBlockReason(order.orderStatus, access);

                        return (
                            <tr key={order.id} data-testid={`order-row-${order.id}`} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                                <td className="p-3 font-mono font-medium text-black dark:text-white">{order.orderNumber}</td>
                                <td className="p-3 font-medium text-black dark:text-white">
                                    {order.dealerName}
                                    {order.raisedByDealer && (
                                        <span className="block mt-0.5 text-[10px] font-semibold text-[#0071e3] dark:text-blue-400">Raised by dealer</span>
                                    )}
                                </td>
                                <td className="p-3 text-gray-600 dark:text-gray-300">{order.itemName}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-300">
                                    {order.orderQuantity} {order.unitType}
                                </td>
                                <td className="p-3 font-semibold text-black dark:text-white">₹{order.totalPrice?.toLocaleString('en-IN')}</td>
                                <td className="p-3">
                                    <OrderStatusBadge status={order.orderStatus} />
                                    {frozen && (
                                        <span className="block mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                            Dealer change awaiting approval
                                        </span>
                                    )}
                                    <p className="mt-1 text-[10px] text-gray-400 max-w-[180px] truncate" title={blockReason ?? undefined}>
                                        {next.length ? `Next: ${next.map((s) => ORDER_STATUS_INFO[s].action).join(' / ')}` : blockReason}
                                    </p>
                                </td>
                                <td className="p-3 text-gray-500">{order.orderDate}</td>
                                <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => onPreview(order)}
                                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
                                            title="View Details"
                                            aria-label={`View ${order.orderNumber}`}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!editable}
                                            onClick={() => editable && onEdit(order)}
                                            className={`p-1.5 rounded-lg text-gray-500 transition-colors ${
                                                editable
                                                    ? 'hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white cursor-pointer'
                                                    : 'cursor-not-allowed opacity-40'
                                            }`}
                                            title={
                                                editable
                                                    ? 'Edit Order'
                                                    : frozen
                                                    ? DEALER_CHANGE_BLOCK_REASON
                                                    : 'Only quotations (and, for order approvers, orders pending approval) can be edited'
                                            }
                                            aria-label={`Edit ${order.orderNumber}`}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onOpenStatus(order)}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                                next.length
                                                    ? 'bg-[#0071e3] hover:bg-[#0071e3]/90 text-white'
                                                    : 'bg-black/5 dark:bg-white/10 text-gray-500 hover:text-black dark:hover:text-white'
                                            }`}
                                            aria-label={`Update status of ${order.orderNumber}`}
                                        >
                                            {next.length ? <ListChecks className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                            {next.length ? 'Update status' : 'Progress'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
