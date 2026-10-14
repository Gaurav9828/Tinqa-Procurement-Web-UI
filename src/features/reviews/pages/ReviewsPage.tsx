import React, { useCallback, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, MessageSquareText, RefreshCw, ShieldAlert, Star } from 'lucide-react';
import { useAdminReviews } from '../hooks/useAdminReviews';
import { useReviewProductOptions } from '../hooks/useReviewProductOptions';
import { REVIEW_NO_ACCESS_MESSAGE, useReviewModeration } from '../hooks/useReviewModeration';
import { ReviewFilterBar } from '../components/ReviewFilterBar';
import { ReviewTable } from '../components/ReviewTable';
import { ReviewDetailDrawer } from '../components/ReviewDetailDrawer';
import { ReviewStatusDialog } from '../components/ReviewStatusDialog';
import type { AdminReview } from '../types/review.types';
import { isRetryableErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

const StateMessage: React.FC<{ variant: 'empty' | 'noResults' | ApiErrorKind; onRetry?: () => void }> = ({ variant, onRetry }) => {
  const isInfo = variant === 'empty' || variant === 'noResults';
  const Icon = isInfo ? MessageSquareText : variant === 'forbidden' ? ShieldAlert : AlertTriangle;
  const title =
    variant === 'empty'
      ? 'No reviews yet'
      : variant === 'noResults'
        ? 'No reviews found'
        : variant === 'forbidden'
          ? 'No access'
          : 'Reviews could not be loaded';
  const body =
    variant === 'empty'
      ? 'Reviews customers post on the storefront will appear here.'
      : variant === 'noResults'
        ? 'No reviews match the current filters.'
        : variant === 'forbidden'
          ? REVIEW_NO_ACCESS_MESSAGE
          : 'Check the alert for details and try again.';
  return (
    <div role={isInfo ? 'status' : 'alert'} className="apple-card p-12 flex flex-col items-center text-center gap-2 text-gray-500 dark:text-neutral-400">
      <Icon className="w-8 h-8 text-gray-400" />
      <h3 className="text-sm font-semibold text-black dark:text-white">{title}</h3>
      <p className="text-xs max-w-md">{body}</p>
      {!isInfo && onRetry && isRetryableErrorKind(variant) && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
};

/**
 * /reviews — moderate customer product reviews. Admins can only show or hide a review;
 * there is intentionally no way to create, edit or delete review content here.
 */
export const ReviewsPage: React.FC = () => {
  const list = useAdminReviews();
  const products = useReviewProductOptions();

  const [openReview, setOpenReview] = useState<AdminReview | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminReview | null>(null);

  const { replaceReview, refetch } = list;

  /** Keep the table row and the open drawer in step with the latest copy from the backend. */
  const applyReview = useCallback(
    (updated: AdminReview) => {
      replaceReview(updated);
      setOpenReview((current) => (current?.id === updated.id ? updated : current));
    },
    [replaceReview]
  );

  const handleNotFound = useCallback(
    (reviewId: number) => {
      setOpenReview((current) => (current?.id === reviewId ? null : current));
      setStatusTarget(null);
      refetch();
    },
    [refetch]
  );

  const closeDrawer = useCallback(() => setOpenReview(null), []);
  const closeStatusDialog = useCallback(() => setStatusTarget(null), []);

  const moderation = useReviewModeration({ onUpdated: applyReview, onNotFound: handleNotFound });

  const renderList = () => {
    if (!list.hasLoaded) {
      if (list.errorKind) return <StateMessage variant={list.errorKind} onRetry={list.refetch} />;
      return (
        <div role="status" className="apple-card p-12 text-center text-xs text-gray-500 dark:text-neutral-400">
          Loading reviews...
        </div>
      );
    }
    if (list.errorKind && list.reviews.length === 0) return <StateMessage variant={list.errorKind} onRetry={list.refetch} />;
    if (list.reviews.length === 0) return <StateMessage variant={list.hasActiveFilters ? 'noResults' : 'empty'} />;

    return (
      <>
        <ReviewTable reviews={list.reviews} isLoading={list.isLoading} onOpen={setOpenReview} onToggleStatus={setStatusTarget} />
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-gray-500">
          <span>
            {list.totalElements} review{list.totalElements === 1 ? '' : 's'}
            {list.totalPages > 1 && ` · Page ${list.page + 1} of ${list.totalPages}`}
          </span>
          {list.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={list.page === 0 || list.isLoading}
                onClick={() => list.setPage(list.page - 1)}
                className="flex items-center gap-1 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={list.page + 1 >= list.totalPages || list.isLoading}
                onClick={() => list.setPage(list.page + 1)}
                className="flex items-center gap-1 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </nav>
      </>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-[#0071e3]" /> Reviews
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Moderate customer product reviews. Hidden reviews are removed from the storefront and its ratings.
            {list.hasLoaded ? ` (${list.totalElements} reviews)` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => list.refetch()}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${list.isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <ReviewFilterBar
        filters={list.filters}
        productOptions={products.options}
        isLoadingProducts={products.isLoading}
        hasActiveFilters={list.hasActiveFilters}
        onFilterChange={list.updateFilter}
        onReset={list.resetFilters}
      />

      {renderList()}

      {openReview && (
        <ReviewDetailDrawer
          key={openReview.id}
          review={openReview}
          onClose={closeDrawer}
          onLoaded={applyReview}
          onNotFound={handleNotFound}
          onToggleStatus={setStatusTarget}
          closeOnEscape={!statusTarget}
        />
      )}

      {statusTarget && (
        <ReviewStatusDialog
          key={statusTarget.id}
          review={statusTarget}
          isSubmitting={moderation.isSubmitting}
          onClose={closeStatusDialog}
          onConfirm={moderation.setActive}
        />
      )}
    </div>
  );
};
