import React from 'react';
import { X, Package, Building2, Tag, Layers, Calendar, FileText, ShoppingCart } from 'lucide-react';
import { StockStatusBadge } from './StockStatusBadge';
import type { StockResponse } from '../types/stock.types';

interface StockPreviewModalProps {
  isOpen: boolean;
  stock: StockResponse | null;
  onClose: () => void;
  onEdit?: (stock: StockResponse) => void;
}

export const StockPreviewModal: React.FC<StockPreviewModalProps> = ({
  isOpen,
  stock,
  onClose,
  onEdit,
}) => {
  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="apple-card w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0071e3]/10 text-[#0071e3] rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-black dark:text-white">Stock Batch Preview</h2>
              <p className="text-[11px] font-mono text-gray-500">
                {stock.stockIdentityNumber} {stock.orderNumber ? `• Order: ${stock.orderNumber}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(stock);
                }}
                className="px-3 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Edit Stock
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          
          {/* Top Status & Identity Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
            <div>
              <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">Approval Status</span>
              <div className="mt-1">
                <StockStatusBadge status={stock.approvalStatus} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">Batch Number</span>
              <span className="font-mono font-medium text-black dark:text-white text-sm">{stock.batchNumber}</span>
            </div>
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Item Information */}
            <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <Tag className="w-4 h-4 text-[#0071e3]" />
                <span>Item Information</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-black dark:text-white">
                  {stock.itemName || `Item #${stock.itemId}`}
                </p>
                <p className="text-[11px] text-gray-400 font-mono">Item ID: {stock.itemId}</p>
              </div>
            </div>

            {/* Dealer Information */}
            <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <Building2 className="w-4 h-4 text-[#0071e3]" />
                <span>Dealer Information</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-black dark:text-white">
                  {stock.dealerName || `Dealer #${stock.dealerId}`}
                </p>
                <p className="text-[11px] text-gray-400 font-mono">Dealer ID: {stock.dealerId}</p>
              </div>
            </div>

            {/* Order Reference Information */}
            <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <ShoppingCart className="w-4 h-4 text-[#0071e3]" />
                <span>Order Reference</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-mono font-bold text-black dark:text-white">
                  {stock.orderNumber || (stock.orderNumber ? `#${stock.orderNumber}` : 'N/A')}
                </p>
              </div>
            </div>

            {/* Quantity & Inventory Metrics */}
            <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <Layers className="w-4 h-4 text-[#0071e3]" />
                <span>Inventory Quantity</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <span className="text-[10px] text-gray-400 block">Available Units</span>
                  <span className="text-sm font-bold text-emerald-600">{stock.availableUnits}</span>
                </div>
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
                  <span className="text-[10px] text-gray-400 block">Total Order Qty</span>
                  <span className="text-sm font-bold text-black dark:text-white">{stock.totalOrderQuantity} {stock.unitType}</span>
                </div>
              </div>
            </div>

            {/* Pricing Details */}
            <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <FileText className="w-4 h-4 text-[#0071e3]" />
                <span>Pricing & Financials</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Unit Price</span>
                <p className="text-base font-mono font-bold text-black dark:text-white">
                  {stock.unitPrice !== undefined && stock.unitPrice !== null
                    ? `₹${Number(stock.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : 'N/A'}
                </p>
              </div>
            </div>

          </div>

          {/* Reference Info / Timestamps if applicable */}
          {stock.createdAt && (
            <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Created on: {new Date(stock.createdAt).toLocaleString()}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl font-medium text-gray-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};