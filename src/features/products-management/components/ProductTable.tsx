import React from 'react';
import { Eye, PackageMinus, PackagePlus, Pencil, Send, ShieldCheck, UploadCloud } from 'lucide-react';
import { ProductStatusBadge } from './ProductStatusBadge';
import { ProductApprovalBadge } from './ProductApprovalBadge';
import type { ProductResponse } from '../types/product.types';
import type { ProductApprovalResponse } from '../types/productApproval.types';
import { getApprovalPermissions, type ProductApprovalState } from '../utils/productApproval';
import { ProductRatingSummary } from '../../reviews/components/ProductRatingSummary';

export interface ProductApprovalInfo {
  state: ProductApprovalState;
  latest?: ProductApprovalResponse;
}

interface ProductTableProps {
  products: ProductResponse[];
  isLoading: boolean;
  onPreview: (product: ProductResponse) => void;
  onEdit: (product: ProductResponse) => void;
  onAdjustStock: (product: ProductResponse, mode: 'add' | 'reduce') => void;
  /** Admin L2 approval state per product. */
  approvalFor: (product: ProductResponse) => ProductApprovalInfo;
  /** Admin L2 can review pending requests from the list. */
  canReview: boolean;
  onSubmitForApproval: (product: ProductResponse, isResubmission: boolean) => void;
  onReview: (request: ProductApprovalResponse) => void;
  /** Write approved changes that couldn't be applied when they were approved. */
  onApplyUpdate: (request: ProductApprovalResponse) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  isLoading,
  onPreview,
  onEdit,
  onAdjustStock,
  approvalFor,
  canReview,
  onSubmitForApproval,
  onReview,
  onApplyUpdate,
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
            <th className="p-3 font-semibold">Rating</th>
            <th className="p-3 font-semibold">Status</th>
            <th className="p-3 font-semibold">Approval</th>
            <th className="p-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/10">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="text-center p-12 text-gray-400">Loading products...</td>
            </tr>
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center p-12 text-gray-400">No products found.</td>
            </tr>
          ) : (
            products.map((product) => {
              const approval = approvalFor(product);
              const permissions = getApprovalPermissions(approval.state);
              return (
              <tr key={product.id} data-testid={`product-row-${product.id}`} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
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
                <td className="p-3 text-gray-600 dark:text-gray-300">
                  <ProductRatingSummary productId={product.id} averageRating={product.averageRating} reviewCount={product.reviewCount} />
                </td>
                <td className="p-3">
                  <ProductStatusBadge isEnabled={product.enabled} />
                </td>
                <td className="p-3">
                  <ProductApprovalBadge state={approval.state} reason={approval.latest?.decisionReason} />
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
                    {canReview && (approval.state === 'PENDING' || approval.state === 'UPDATE_PENDING') && approval.latest && (
                      <button
                        onClick={() => onReview(approval.latest!)}
                        className="p-1.5 hover:bg-amber-500/10 rounded-lg text-amber-600 cursor-pointer"
                        title="Review approval (Admin L2)"
                        aria-label={`Review approval for ${product.title}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {permissions.canApplyUpdate && approval.latest && (
                      <button
                        onClick={() => onApplyUpdate(approval.latest!)}
                        className="p-1.5 hover:bg-orange-500/10 rounded-lg text-orange-600 cursor-pointer"
                        title="Apply approved changes"
                        aria-label={`Apply approved changes to ${product.title}`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {permissions.canSubmit && (
                      <button
                        onClick={() => onSubmitForApproval(product, approval.state === 'REJECTED')}
                        className="p-1.5 hover:bg-blue-500/10 rounded-lg text-[#0071e3] cursor-pointer"
                        title={approval.state === 'REJECTED' ? 'Resubmit for approval' : 'Submit for approval'}
                        aria-label={`${approval.state === 'REJECTED' ? 'Resubmit' : 'Submit'} ${product.title} for approval`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => permissions.canEdit && onEdit(product)}
                      disabled={!permissions.canEdit}
                      className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title={permissions.editBlockedReason ?? 'Edit Product'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onAdjustStock(product, 'add')}
                      disabled={!permissions.canAddStock}
                      className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-gray-500 hover:text-emerald-600 dark:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title={permissions.canAddStock ? 'Add stock' : 'Stock can be added once Admin L2 approves the product'}
                      aria-label={`Add stock for ${product.title}`}
                    >
                      <PackagePlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onAdjustStock(product, 'reduce')}
                      disabled={!(product.stockQuantity > 0)}
                      className="p-1.5 hover:bg-rose-500/10 rounded-lg text-gray-500 hover:text-rose-600 dark:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title={product.stockQuantity > 0 ? 'Reduce stock' : 'No stock to reduce'}
                      aria-label={`Reduce stock for ${product.title}`}
                    >
                      <PackageMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};