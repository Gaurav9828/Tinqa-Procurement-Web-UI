import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, FileText } from 'lucide-react';
import { ReviewStars } from './ReviewStars';
import { ReviewEditedBadge, ReviewStatusBadge } from './ReviewStatusBadge';
import type { AdminReview } from '../types/review.types';
import { productAdminPath, reviewExcerpt } from '../utils/review.utils';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { orderDetailPath, type OrderDetailLocationState } from '../../order-tracking/utils/orderTrackingRoutes';

interface Props {
  reviews: AdminReview[];
  isLoading: boolean;
  onOpen: (review: AdminReview) => void;
  onToggleStatus: (review: AdminReview) => void;
}

const ORDER_LINK_STATE: OrderDetailLocationState = { backLabel: 'Back to reviews' };
const linkClass = 'text-[#0071e3] hover:underline';

/** Read-only review list. The only action that changes anything is Activate / Deactivate. */
export const ReviewTable: React.FC<Props> = ({ reviews, isLoading, onOpen, onToggleStatus }) => (
  <div className={`apple-card overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`} aria-busy={isLoading}>
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-black/10 dark:border-white/10 text-gray-500 dark:text-neutral-400 bg-black/[0.02] dark:bg-white/[0.02]">
          <th className="p-3 font-semibold">Date</th>
          <th className="p-3 font-semibold">Product</th>
          <th className="p-3 font-semibold">Rating</th>
          <th className="p-3 font-semibold">Review</th>
          <th className="p-3 font-semibold">Customer</th>
          <th className="p-3 font-semibold">Order</th>
          <th className="p-3 font-semibold">Status</th>
          <th className="p-3 font-semibold">Edited</th>
          <th className="p-3 font-semibold text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5 dark:divide-white/5">
        {reviews.map((review) => (
          <tr key={review.id} data-testid={`review-row-${review.id}`} className="align-top hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
            <td className="p-3 text-gray-500 dark:text-neutral-400 whitespace-nowrap">{formatDateTime(review.createdAt)}</td>
            <td className="p-3 max-w-[12rem]">
              {review.productTitle ? (
                <Link to={productAdminPath(review.productTitle)} className={`${linkClass} font-medium`}>
                  {review.productTitle}
                </Link>
              ) : (
                <span className="text-gray-400">Product #{review.productId}</span>
              )}
            </td>
            <td className="p-3">
              <ReviewStars rating={review.rating} />
            </td>
            <td className="p-3 min-w-[14rem] max-w-sm text-gray-700 dark:text-neutral-200 break-words">{reviewExcerpt(review.comment)}</td>
            <td className="p-3 max-w-[12rem]">
              <div className="font-medium text-black dark:text-white truncate">{review.reviewerName || '—'}</div>
              {review.customerEmail && <div className="text-[11px] text-gray-400 truncate">{review.customerEmail}</div>}
            </td>
            <td className="p-3 whitespace-nowrap">
              {review.orderNumber ? (
                <Link to={orderDetailPath(review.orderNumber)} state={ORDER_LINK_STATE} className={`${linkClass} font-mono`}>
                  {review.orderNumber}
                </Link>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </td>
            <td className="p-3">
              <ReviewStatusBadge active={review.active} />
            </td>
            <td className="p-3">
              <ReviewEditedBadge editedAt={review.editedAt} />
            </td>
            <td className="p-3">
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpen(review)}
                  aria-label={`View review ${review.id}`}
                  title="View details"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                </button>
                {review.active ? (
                  <button
                    type="button"
                    onClick={() => onToggleStatus(review)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer whitespace-nowrap"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleStatus(review)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5" /> Activate
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
