import React from 'react';
import { X } from 'lucide-react';
import type { ProductResponse } from '../types/product.types';

interface ProductPreviewModalProps {
  product: ProductResponse | null;
  onClose: () => void;
}

export const ProductPreviewModal: React.FC<ProductPreviewModalProps> = ({ product, onClose }) => {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl text-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-black dark:text-white text-sm">{product.title}</h2>
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${product.isEnabled ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 border-rose-500/30'}`}>
              {product.isEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {product.tagline && (
            <p className="text-gray-500 dark:text-gray-400 italic font-medium">{product.tagline}</p>
          )}

          <div className="grid grid-cols-3 gap-3 p-3 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl">
            <div>
              <span className="text-gray-400 block">Price</span>
              <span className="font-bold text-black dark:text-white text-sm">₹{product.price?.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Stock Qty</span>
              <span className="font-bold text-black dark:text-white text-sm">{product.stockQuantity}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Discount</span>
              <span className="font-bold text-black dark:text-white text-sm">{product.discountPercentage ? `${product.discountPercentage}%` : '0%'}</span>
            </div>
          </div>

          {product.description && (
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</h4>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.specifications && product.specifications.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Specifications</h4>
              <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden divide-y divide-black/10 dark:divide-white/10">
                {product.specifications.map((spec, idx) => (
                  <div key={idx} className="flex justify-between px-3 py-2 bg-black/[0.01] dark:bg-white/[0.01]">
                    <span className="font-medium text-gray-500">{spec.specKey}</span>
                    <span className="text-black dark:text-white font-semibold">{spec.specValue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.image1Url && (
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Primary Image Asset</h4>
              <a href={product.image1Url} target="_blank" rel="noreferrer" className="text-[#0071e3] underline truncate block">
                {product.image1Url}
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-3 border-t border-black/10 dark:border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 text-black dark:text-white rounded-xl font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};