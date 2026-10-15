// Mirrors the Ecommerce BE refund DTOs (/api/admin/orders/{orderNumber}/refunds, /api/admin/refunds/**).
// Money is always in paise (integers). LocalDateTime fields arrive as ISO strings without a zone.
// The UI never talks to Razorpay: it sends the order number and the backend finds and checks the payment.

/**
 * REQUESTED → APPROVED (Razorpay call in progress, or Razorpay unreachable: approve again to retry)
 *           → PENDING → PROCESSED | FAILED;  or REQUESTED → REJECTED.
 * A refund can also go straight to FAILED at approval when Razorpay rejects it (see `failureReason`).
 */
export type RefundStatus = 'REQUESTED' | 'REJECTED' | 'APPROVED' | 'PENDING' | 'PROCESSED' | 'FAILED';

/** `optimum` = instant refund where Razorpay supports it. */
export type RefundSpeed = 'normal' | 'optimum';

export interface Refund {
  id: number;
  orderNumber: string;
  /** Our payment id. */
  paymentId: number;
  razorpayPaymentId: string;
  amountPaise: number;
  currency: string;
  speed: RefundSpeed;
  status: RefundStatus;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  /** The L2 rejection comment. */
  reviewComment: string | null;
  receipt: string;
  razorpayRefundId: string | null;
  /** The speed Razorpay actually used. */
  speedProcessed: string | null;
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RefundablePayment {
  paymentId: number;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  amountPaise: number;
  amountRefundedPaise: number;
  refundablePaise: number;
  currency: string;
  paymentInstrument: string | null;
  paidAt: string;
  refundWindowEndsAt: string;
  refundWindowOpen: boolean;
  refundInProgress: boolean;
}

/** GET /admin/orders/{orderNumber}/refunds */
export interface OrderRefundSummary {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  payments: RefundablePayment[];
  /** Newest first. */
  refunds: Refund[];
  /** An L1 admin may request a refund now. */
  canRequestRefund: boolean;
  /** Why not, ready to show. */
  refundBlockedReason: string | null;
}

/** Body of POST /admin/orders/{orderNumber}/refunds. */
export interface RefundRequestPayload {
  /** 3–500 characters, no `<` or `>`. */
  reason: string;
  /** 1..refundablePaise; omitted = everything still refundable. */
  amountPaise?: number;
  speed?: RefundSpeed;
  /** Only needed when the order has more than one payment. */
  paymentId?: number;
}

/** Query params of GET /admin/refunds (newest first). */
export interface RefundListParams {
  status?: RefundStatus;
  page: number;
  size: number;
}
