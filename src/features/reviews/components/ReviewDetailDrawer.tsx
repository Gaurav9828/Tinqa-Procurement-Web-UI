import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldAlert, X } from 'lucide-react';
import { ReviewStars } from './ReviewStars';
import { ReviewEditedBadge, ReviewStatusBadge } from './ReviewStatusBadge';
import { reviewsApi } from '../api/reviewsApi';
import type { AdminReview } from '../types/review.types';
import { productAdminPath } from '../utils/review.utils';
import { REVIEW_NO_ACCESS_MESSAGE } from '../hooks/useReviewModeration';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind } from '../../../utils/apiErrorKind';
import { getApiErrorCode } from '../../../utils/apiError';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { orderDetailPath, type OrderDetailLocationState } from '../../order-tracking/utils/orderTrackingRoutes';

interface Props {
  /** The review as currently known (from the list, or the latest status change). */
  review: AdminReview;
  onClose: () => void;
  /** Fresh copy from GET /admin/reviews/{id}. */
  onLoaded: (review: AdminReview) => void;
  onNotFound: (reviewId: number) => void;
  onToggleStatus: (review: AdminReview) => void;
  /** False while the status dialog is open above the drawer, so Escape only closes that dialog. */
  closeOnEscape: boolean;
}

const ORDER_LINK_STATE: OrderDetailLocationState = { backLabel: 'Back to reviews' };

const AuditRow: React.FC<{ label: string; at: string | null; by?: string | null }> = ({ label, at, by }) => (
  <div className="flex justify-between gap-4 py-2">
    <dt className="text-gray-500 dark:text-neutral-400">{label}</dt>
    <dd className="text-right text-black dark:text-white">
      {at ? formatDateTime(at) : '—'}
      {by !== undefined && <span className="block text-[11px] text-gray-400">{by ? `by ${by}` : 'by —'}</span>}
    </dd>
  </div>
);

/** Side drawer with the full review and its audit trail. Read-only apart from Activate / Deactivate. */
export const ReviewDetailDrawer: React.FC<Props> = ({ review, onClose, onLoaded, onNotFound, onToggleStatus, closeOnEscape }) => {
  const titleId = useId();
  const notify = useNotify();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const reviewId = review.id;

  // Always re-read the review when the drawer opens so the audit trail is current.
  useEffect(() => {
    let cancelled = false;
    reviewsApi
      .getReview(reviewId)
      .then((res) => {
        if (!cancelled && res.success && res.data) onLoaded(res.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const kind = getApiErrorKind(err);
        if (kind === 'notFound' || getApiErrorCode(err) === 'REVIEW_NOT_FOUND') {
          notify.error(err, 'This review no longer exists.');
          onNotFound(reviewId);
        } else if (kind === 'forbidden') {
          setForbidden(true);
        } else {
          notify.error(err, 'Could not refresh this review. Showing the details from the list.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
    // Only re-run for a different review; the callbacks are stable enough for a one-off read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  useEffect(() => {
    if (!closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeOnEscape, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg h-full bg-white dark:bg-neutral-900 border-l border-black/10 dark:border-white/10 shadow-2xl flex flex-col text-xs"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-black/10 dark:border-white/10">
          <div className="min-w-0">
            <h2 id={titleId} className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
              Review #{review.id}
              {isRefreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" aria-label="Refreshing" />}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <ReviewStars rating={review.rating} size="md" />
              <ReviewStatusBadge active={review.active} />
              <ReviewEditedBadge editedAt={review.editedAt} />
            </div>
          </div>
          <button
            type="button"
            aria-label="Close review details"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {forbidden && (
            <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0" /> {REVIEW_NO_ACCESS_MESSAGE}
            </p>
          )}

          <section>
            <h3 className="text-[11px] font-semibold uppercase text-gray-400 mb-1.5">Review</h3>
            {/* Customer text: a plain text node (React escapes it); pre-line keeps their line breaks. */}
            <p className="whitespace-pre-line break-words leading-relaxed text-sm text-black dark:text-white" data-testid="review-comment">
              {review.comment?.trim() ? review.comment : <span className="text-gray-400 italic">No written comment.</span>}
            </p>
          </section>

          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[11px] text-gray-400">Product</dt>
              <dd className="font-medium">
                {review.productTitle ? (
                  <Link to={productAdminPath(review.productTitle)} className="text-[#0071e3] hover:underline">
                    {review.productTitle}
                  </Link>
                ) : (
                  `Product #${review.productId}`
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-gray-400">Order</dt>
              <dd className="font-mono">
                {review.orderNumber ? (
                  <Link to={orderDetailPath(review.orderNumber)} state={ORDER_LINK_STATE} className="text-[#0071e3] hover:underline">
                    {review.orderNumber}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-gray-400">Customer</dt>
              <dd className="font-medium text-black dark:text-white break-words">{review.reviewerName || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-gray-400">Email</dt>
              <dd className="text-black dark:text-white break-all">{review.customerEmail || '—'}</dd>
            </div>
          </dl>

          <section>
            <h3 className="text-[11px] font-semibold uppercase text-gray-400 mb-1">Audit trail</h3>
            <dl className="divide-y divide-black/5 dark:divide-white/5">
              <AuditRow label="Created" at={review.createdAt} by={review.createdBy} />
              <AuditRow label="Edited by customer" at={review.editedAt} />
              <AuditRow label="Last updated" at={review.updatedAt} by={review.updatedBy} />
              <AuditRow label="Moderated" at={review.moderatedAt} by={review.moderatedBy} />
              <div className="py-2">
                <dt className="text-gray-500 dark:text-neutral-400">Moderation reason (internal)</dt>
                <dd className="mt-1 whitespace-pre-line break-words text-black dark:text-white" data-testid="moderation-reason">
                  {review.moderationReason?.trim() ? review.moderationReason : '—'}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className="px-5 py-4 border-t border-black/10 dark:border-white/10 flex justify-end">
          {review.active ? (
            <button
              type="button"
              onClick={() => onToggleStatus(review)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" /> Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleStatus(review)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Activate
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
};
