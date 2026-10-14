import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { reviewsApi } from '../api/reviewsApi';
import type { AdminReview, AdminReviewListParams, ReviewStatusFilter } from '../types/review.types';
import type { PageResponse } from '../../../types/common.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

export const ADMIN_REVIEWS_PAGE_SIZE = 20;

export interface AdminReviewFilters {
  productId: number | null;
  rating: number | null;
  status: ReviewStatusFilter;
}

// URL keys. The URL is the source of truth for the filters, so links like /reviews?product=12
// (from the product pages), refreshes and the Back button all keep the same view.
const Q = { productId: 'product', rating: 'rating', status: 'status', page: 'page' } as const;

const positiveInt = (raw: string | null): number | null => {
  const value = Number(raw);
  return raw && Number.isInteger(value) && value > 0 ? value : null;
};

const readFilters = (params: URLSearchParams): AdminReviewFilters => {
  const rating = positiveInt(params.get(Q.rating));
  const status = params.get(Q.status);
  return {
    productId: positiveInt(params.get(Q.productId)),
    rating: rating && rating <= 5 ? rating : null,
    status: status === 'active' || status === 'hidden' ? status : '',
  };
};

const readPage = (params: URLSearchParams) => positiveInt(params.get(Q.page)) ?? 0;

/** Server-side paginated review list (GET /admin/reviews), with its filters kept in the URL. */
export const useAdminReviews = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const page = readPage(searchParams);

  const requestParams = useMemo<AdminReviewListParams>(
    () => ({
      page,
      size: ADMIN_REVIEWS_PAGE_SIZE,
      productId: filters.productId,
      rating: filters.rating,
      active: filters.status === '' ? null : filters.status === 'active',
    }),
    [page, filters.productId, filters.rating, filters.status]
  );

  const [data, setData] = useState<PageResponse<AdminReview> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ApiErrorKind | null>(null);

  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const fetchReviews = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);
    setErrorKind(null);
    try {
      const res = await reviewsApi.listReviews(requestParams);
      if (!isCurrent()) return;
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setErrorKind('unknown');
        notify.error(res, 'Failed to load reviews.');
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      const kind = getApiErrorKind(err);
      setErrorKind(kind);
      // 403 is explained by the page's no-access state; a toast would only repeat it.
      if (kind !== 'forbidden') notify.error(err, 'Failed to load reviews.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [requestParams, beginRequest, notify]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const writeParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        // Filter edits replace the entry so Back leaves the page instead of undoing filter changes.
        { replace: true }
      );
    },
    [setSearchParams]
  );

  /** Any filter change returns to the first page. */
  const updateFilter = useCallback(
    <K extends keyof AdminReviewFilters>(key: K, value: AdminReviewFilters[K]) => {
      writeParams((next) => {
        if (value === null || value === '') next.delete(Q[key]);
        else next.set(Q[key], String(value));
        next.delete(Q.page);
      });
    },
    [writeParams]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      writeParams((next) => {
        if (nextPage > 0) next.set(Q.page, String(nextPage));
        else next.delete(Q.page);
      });
    },
    [writeParams]
  );

  const resetFilters = useCallback(() => writeParams((next) => Object.values(Q).forEach((key) => next.delete(key))), [writeParams]);

  /** Swaps in the review the backend returned after a status change, without refetching the page. */
  const replaceReview = useCallback((updated: AdminReview) => {
    setData((prev) =>
      prev ? { ...prev, content: prev.content.map((review) => (review.id === updated.id ? updated : review)) } : prev
    );
  }, []);

  return {
    reviews: data?.content ?? [],
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
    page,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters: !!filters.productId || !!filters.rating || !!filters.status,
    hasLoaded: !!data,
    isLoading,
    errorKind,
    refetch: fetchReviews,
    replaceReview,
  };
};
