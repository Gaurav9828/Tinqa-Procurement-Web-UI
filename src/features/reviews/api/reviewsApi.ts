import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type { AdminReview, AdminReviewListParams, ReviewStatusRequest } from '../types/review.types';

// Paths are relative to VITE_ECOMMERCE_API_BASE_URL (which already includes `/api`).
// The backend restricts /api/admin/** to ADMIN_L1/ADMIN_L2 from the bearer token.
const ADMIN_BASE_URL = '/admin/reviews';

/** Drops unset filters so the backend only receives parameters that are actually chosen. */
const toQueryParams = (params: AdminReviewListParams) => {
  const query: Record<string, string | number | boolean> = { page: params.page, size: params.size };
  if (params.productId) query.productId = params.productId;
  if (params.rating) query.rating = params.rating;
  if (params.active !== null && params.active !== undefined) query.active = params.active;
  return query;
};

export const reviewsApi = {
  /** GET /api/admin/reviews — every review (active and hidden), paginated, newest first. */
  listReviews: async (params: AdminReviewListParams): Promise<ApiResponse<PageResponse<AdminReview>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<AdminReview>>>(ADMIN_BASE_URL, {
      params: toQueryParams(params),
    });
    return response.data;
  },

  /** GET /api/admin/reviews/{reviewId} — one review with its full audit trail. */
  getReview: async (reviewId: number): Promise<ApiResponse<AdminReview>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<AdminReview>>(`${ADMIN_BASE_URL}/${reviewId}`);
    return response.data;
  },

  /**
   * PATCH /api/admin/reviews/{reviewId}/status — show (active=true) or hide (active=false) a review on the
   * storefront. `reason` is an internal note (max 500 chars); sending none clears the stored one.
   */
  updateStatus: async (reviewId: number, payload: ReviewStatusRequest): Promise<ApiResponse<AdminReview>> => {
    const response = await ecommerceAxiosClient.patch<ApiResponse<AdminReview>>(
      `${ADMIN_BASE_URL}/${reviewId}/status`,
      payload
    );
    return response.data;
  },
};
