import React from 'react';
import { Edit3, Power, CheckCircle, PackageSearch } from 'lucide-react';
import { ItemStatusBadge } from './ItemStatusBadge';
import type { ItemResponse } from '../types/item.types';

interface Props {
  items: ItemResponse[];
  isLoading: boolean;
  onEdit: (item: ItemResponse) => void;
  onToggleStatus: (item: ItemResponse) => void;
}

export const ItemTable: React.FC<Props> = ({
  items,
  isLoading,
  onEdit,
  onToggleStatus,
}) => {
  if (isLoading) {
    return (
      <div className="apple-card p-12 text-center text-gray-500 dark:text-neutral-400">
        <div className="inline-block w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-sm">Loading item catalog...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="apple-card p-12 text-center space-y-2">
        <PackageSearch className="w-8 h-8 text-gray-400 mx-auto" />
        <h3 className="text-sm font-semibold">No Items Found</h3>
        <p className="text-xs text-gray-500">
          Try adjusting your search criteria or adding new items.
        </p>
      </div>
    );
  }

  return (
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
                      onClick={() => onEdit(item)}
                      className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    
                    {/* Dynamic Inactivate / Activate Button */}
                    {item.isActive ? (
                      <button
                        type="button"
                        onClick={() => onToggleStatus(item)}
                        className="p-2 hover:bg-amber-500/10 text-amber-600 rounded-lg transition-colors cursor-pointer"
                        title="Inactivate Item"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleStatus(item)}
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
  );
};