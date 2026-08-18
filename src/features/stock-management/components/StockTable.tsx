import React from 'react';
import { Edit3, PlusCircle, MinusCircle, CheckSquare, Eye, PackageSearch } from 'lucide-react';
import { StockStatusBadge } from './StockStatusBadge';
import type { StockResponse } from '../types/stock.types';
import { useAuthStore } from '../../../store/useAuthStore';

interface StockTableProps {
    stocks: StockResponse[];
    isLoading: boolean;
    onView: (stock: StockResponse) => void;
    onEdit?: (stock: StockResponse) => void;
    onAdjustQuantity: (stock: StockResponse, type: 'ADD' | 'REDUCE') => void;
    onApproval: (stock: StockResponse) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
    stocks,
    isLoading,
    onView,
    onEdit,
    onAdjustQuantity,
    onApproval,
}) => {
    const { user } = useAuthStore();
    const userRole = user?.role || 'ADMIN_L1';

    const isL2User = userRole === 'ADMIN_L2';
    if (isLoading) {
        return (
            <div className="apple-card p-12 text-center text-gray-500 dark:text-neutral-400">
                <div className="inline-block w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-sm">Loading stock inventory...</p>
            </div>
        );
    }

    if (stocks.length === 0) {
        return (
            <div className="apple-card p-12 text-center space-y-2">
                <PackageSearch className="w-8 h-8 text-gray-400 mx-auto" />
                <h3 className="text-sm font-semibold text-black dark:text-white">No Stock Entries Found</h3>
                <p className="text-xs text-gray-500">
                    Try adjusting your search criteria or creating new stock entries.
                </p>
            </div>
        );
    }

    return (
        <div className="apple-card overflow-hidden border border-black/10 dark:border-white/10 rounded-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                            <th className="p-4">Identity / Batch</th>
                            <th className="p-4">Dealer & Item</th>
                            <th className="p-4">Available / Total</th>
                            <th className="p-4">Unit Price</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {stocks.map((stock) => (
                            <tr key={stock.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 font-mono">
                                    <div className="font-semibold text-black dark:text-white">{stock.stockIdentityNumber}</div>
                                    <div className="text-[11px] text-gray-400">Batch: {stock.batchNumber}</div>
                                </td>

                                <td className="p-4">
                                    <div className="font-medium text-black dark:text-white">{stock.itemName || `Item #${stock.itemId}`}</div>
                                    <div className="text-[11px] text-gray-400">{stock.dealerName || `Dealer #${stock.dealerId}`}</div>
                                </td>

                                <td className="p-4 font-mono">
                                    <span className="text-emerald-600 font-semibold">{stock.availableUnits}</span> / {stock.totalOrderQuantity} {stock.unitType}
                                </td>

                                <td className="p-4 font-mono font-semibold text-black dark:text-white">
                                    {stock.unitPrice !== undefined && stock.unitPrice !== null
                                        ? `₹${Number(stock.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                        : 'N/A'}
                                </td>

                                <td className="p-4">
                                    <StockStatusBadge status={stock.approvalStatus} />
                                </td>

                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onView(stock)}
                                            title="View Details"
                                            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors cursor-pointer"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>

                                        {onEdit && (
                                            <button
                                                type="button"
                                                onClick={() => onEdit(stock)}
                                                title="Edit Stock Details"
                                                className="p-2 hover:bg-blue-500/10 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => onAdjustQuantity(stock, 'ADD')}
                                            title="Add Stock Quantity"
                                            className="p-2 hover:bg-emerald-500/10 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onAdjustQuantity(stock, 'REDUCE')}
                                            title="Reduce Stock Quantity"
                                            className="p-2 hover:bg-rose-500/10 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <MinusCircle className="w-4 h-4" />
                                        </button>

                                        {stock.approvalStatus === 'PENDING' && (
                                            <button
                                                type="button"
                                                disabled={!isL2User}
                                                onClick={() => onApproval(stock)}
                                                title={isL2User ? "Admin L2 Decision" : "Requires Admin L2 Access"}
                                                className="p-2 rounded-lg transition-colors cursor-pointer text-amber-600 hover:bg-amber-500/10 disabled:text-gray-400 disabled:hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <CheckSquare className="w-4 h-4" />
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
    );
};