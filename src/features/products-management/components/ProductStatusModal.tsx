import React, { useState } from 'react';
import { X, Power } from 'lucide-react';
import type { ProductResponse } from '../types/product.types';

interface ProductStatusModalProps {
  product: ProductResponse | null;
  onClose: () => void;
  onSubmit: (id: number, isEnabled: boolean) => Promise<boolean>;
  isSubmitting: boolean;
}

export const ProductStatusModal: React.FC<ProductStatusModalProps> = ({
  product,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  if (!product) return null;

  const [isEnabledState, setIsEnabledState] = useState<boolean>(product.enabled);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(product.id, isEnabledState);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-md flex flex-col shadow-2xl text-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 font-bold text-black dark:text-white text-sm">
            <Power className="w-4 h-4 text-[#0071e3]" /> Toggle Publishing Status
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-500">
            Change publication availability status for <strong className="text-black dark:text-white">{product.title}</strong>:
          </p>

          <div className="flex items-center gap-3 p-3 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl">
            <input
              type="checkbox"
              id="statusToggleCheck"
              checked={isEnabledState}
              onChange={(e) => setIsEnabledState(e.target.checked)}
              className="w-4 h-4 rounded border-black/10 text-[#0071e3] focus:ring-[#0071e3]"
            />
            <label htmlFor="statusToggleCheck" className="font-semibold text-black dark:text-white cursor-pointer">
              {isEnabledState ? 'Enabled (Visible to Buyers)' : 'Disabled (Hidden from Catalog)'}
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 text-black dark:text-white rounded-xl font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Updating...' : 'Save Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};