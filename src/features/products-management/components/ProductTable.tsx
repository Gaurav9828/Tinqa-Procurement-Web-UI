import React from 'react';
import { Eye, Pencil } from 'lucide-react';
import { ProductStatusBadge } from './ProductStatusBadge';
import type { ProductResponse } from '../types/product.types';

interface ProductTableProps {
  products: ProductResponse[];
  isLoading: boolean;
  onPreview: (product: ProductResponse) => void;
  onEdit: (product: ProductResponse) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  isLoading,
  onPreview,
  onEdit,
}) => {
  return (
    <div className="overflow-x-auto border border-black/10 dark:border-white/10 rounded-2xl text-xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-gray-500">
            <th className="p-3 font-semibold">Title</th>
            <th className="p-3 font-semibold">Price</th>
            <th className="p-3 font-semibold">Stock Qty</th>
            <th className="p-3 font-semibold">Discount</th>
            <th className="p-3 font-semibold">Status</th>
            <th className="p-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/10">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="text-center p-12 text-gray-400">Loading products...</td>
            </tr>
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center p-12 text-gray-400">No products found.</td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                <td className="p-3 font-medium text-black dark:text-white">
                  <div>{product.title}</div>
                  {product.tagline && <div className="text-[10px] text-gray-400">{product.tagline}</div>}
                </td>
                <td className="p-3 font-semibold text-black dark:text-white">
                  ₹{product.price?.toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{product.stockQuantity}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">
                  {product.discountPercentage ? `${product.discountPercentage}%` : '—'}
                </td>
                <td className="p-3">
                  <ProductStatusBadge isEnabled={product.enabled} />
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onPreview(product)}
                      className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:text-white cursor-pointer"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onEdit(product)}
                      className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:text-white cursor-pointer"
                      title="Edit Product"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};