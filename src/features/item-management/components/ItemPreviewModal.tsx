import React from 'react';
import { X, Package, ShieldCheck, FileText, Globe, Tag, IndianRupee, Layers } from 'lucide-react';
import type { ItemResponse } from '../types/item.types';
import { ItemStatusBadge } from './ItemStatusBadge';

interface Props {
  isOpen: boolean;
  item: ItemResponse | null;
  onClose: () => void;
}

export const ItemPreviewModal: React.FC<Props> = ({ isOpen, item, onClose }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3]">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-black dark:text-white">{item.name}</h2>
                <ItemStatusBadge active={item.isActive} />
              </div>
              <p className="text-xs font-mono text-[#0071e3] mt-0.5">SKU: {item.sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Key Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
              <span className="text-[10px] text-gray-500 uppercase font-semibold flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-[#0071e3]" /> MRP
              </span>
              <p className="text-sm font-bold text-black dark:text-white mt-1">
                ₹{Number(item.mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
              <span className="text-[10px] text-gray-500 uppercase font-semibold flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#0071e3]" /> Category
              </span>
              <p className="text-xs font-semibold text-black dark:text-white mt-1 truncate">
                {item.categoryName || `ID: ${item.categoryId}`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
              <span className="text-[10px] text-gray-500 uppercase font-semibold flex items-center gap-1">
                <Package className="w-3 h-3 text-[#0071e3]" /> UOM
              </span>
              <p className="text-xs font-semibold text-black dark:text-white mt-1">{item.unitOfMeasure}</p>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
              <span className="text-[10px] text-gray-500 uppercase font-semibold flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#0071e3]" /> Origin
              </span>
              <p className="text-xs font-semibold text-black dark:text-white mt-1">{item.countryOfOrigin || '—'}</p>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="space-y-1">
              <span className="font-semibold text-gray-500">Description</span>
              <p className="text-gray-700 dark:text-neutral-300 leading-relaxed bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl border border-black/5 dark:border-white/5">
                {item.description}
              </p>
            </div>
          )}

          {/* Additional Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {item.brand && (
              <div>
                <span className="font-semibold text-gray-500">Brand:</span>{' '}
                <span className="text-black dark:text-white font-medium">{item.brand}</span>
              </div>
            )}
            {item.rawMaterialsUsed && (
              <div>
                <span className="font-semibold text-gray-500">Raw Materials:</span>{' '}
                <span className="text-black dark:text-white font-medium">{item.rawMaterialsUsed}</span>
              </div>
            )}
            {item.warrantyMonths !== undefined && (
              <div className="flex items-center gap-1.5 text-black dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-gray-500">Warranty:</span>{' '}
                <span>{item.warrantyMonths} Months</span>
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          {item.termsAndCondition && (
            <div className="space-y-1 pt-1">
              <span className="font-semibold text-gray-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-500" /> Terms & Conditions
              </span>
              <p className="text-[11px] text-gray-600 dark:text-neutral-400 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                {item.termsAndCondition}
              </p>
            </div>
          )}

          {/* Key-Value Attributes */}
          {item.attributes && Object.keys(item.attributes).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
              <span className="font-semibold text-gray-500 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#0071e3]" /> Specifications & Attributes
              </span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(item.attributes).map(([k, v]) => (
                  <div
                    key={k}
                    className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex flex-col"
                  >
                    <span className="text-[10px] text-gray-500 font-medium">{k}</span>
                    <span className="font-semibold text-black dark:text-white mt-0.5">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/10 dark:border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};