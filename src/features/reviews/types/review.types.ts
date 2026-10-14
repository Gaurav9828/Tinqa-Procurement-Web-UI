/** A product review as the admin moderation API returns it (Ecommerce BE `AdminProductReviewDTO`). */
export interface AdminReview {
  id: number;
  productId: number;
  productTitle: string | null;
  rating: number;
  /** Customer-written plain text. Render as a text node only, never as HTML. */
  comment: string | null;
  reviewerName: string | null;
  customerId: number | null;
  customerEmail: string | null;
  orderNumber: string | null;
  active: boolean;
  /** Internal note from the last moderation; never shown on the storefront. */
  moderationReason: string | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
  /** Set when the customer edited the review after posting it. */
  editedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export type ReviewStatusFilter = '' | 'active' | 'hidden';

export interface AdminReviewListParams {
  productId?: number | null;
  rating?: number | null;
  active?: boolean | null;
  page: number;
  size: number;
}

/** PATCH body. There is deliberately no way to change a review's text or rating. */
export interface ReviewStatusRequest {
  active: boolean;
  reason?: string;
}

export const REVIEW_REASON_MAX_LENGTH = 500;
export const REVIEW_RATINGS = [5, 4, 3, 2, 1] as const;
