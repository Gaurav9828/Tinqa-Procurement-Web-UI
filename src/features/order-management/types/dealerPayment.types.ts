import type { OrderStatus } from '../../../types/common.types';
import type { PaymentMethod } from '../utils/paymentPlan';

/** PAYMENT: TinQa paid the dealer. REFUND: the dealer paid back. REVERSAL: undoes one confirmed entry. */
export type DealerPaymentKind = 'PAYMENT' | 'REFUND' | 'REVERSAL';
export type PaymentMilestone = 'ADVANCE' | 'MIDTERM' | 'FINAL';
export type DealerPaymentStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type RefundClaimCause = 'FAILED_TESTING' | 'ORDER_CANCELLED' | 'ORDER_RETURNED';

/** One entry of GET /v1/orders/{id}/payments (and of the Approvals Hub queue GET /v1/orders/payments). */
export interface DealerPaymentEntry {
  id: number;
  orderId: number;
  orderNumber: string | null;
  dealerName: string | null;
  kind: DealerPaymentKind;
  milestone: PaymentMilestone | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidOn: string;
  note: string | null;
  reversesId: number | null;
  /** Confirmed and reversed (or its reversal waits) */
  reversed: boolean;
  status: DealerPaymentStatus;
  /** Staff only (absent in the dealer's own view) */
  recordedBy: number | null;
  recordedByUsername: string | null;
  recordedAt: string;
  decidedByUsername: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
}

export interface PaymentMilestoneSummary {
  milestone: PaymentMilestone;
  percent: number | null;
  planned: number;
  paid: number;
  pending: number;
  /** The order reached the point where this part is due */
  due: boolean;
}

export interface RefundClaim {
  id: number;
  cause: RefundClaimCause;
  failedUnits: number;
  claimedAmount: number;
  agreedAmount: number;
  adjustReason: string | null;
  adjustedAt: string | null;
  refunded: number;
  refundDue: number;
  status: 'OPEN' | 'SETTLED';
  openedAt: string;
  settledAt: string | null;
}

/** Where an order's payments stand (see DealerPaymentService on the server). */
export interface PaymentSummary {
  orderId: number;
  orderNumber: string;
  orderStatus: OrderStatus;
  hasPlan: boolean;
  advancePercent: number | null;
  midtermPercent: number | null;
  finalPercent: number | null;
  expectedPaymentMethod: PaymentMethod | null;
  /** Quoted total, GST included */
  orderValue: number;
  /** The stock entry (the units' testing) is approved */
  tested: boolean;
  unitsPassed: number;
  unitsFailed: number;
  /** What TinQa owes the dealer in all, now */
  payable: number;
  paid: number;
  pendingPayments: number;
  refunded: number;
  pendingRefunds: number;
  outstanding: number;
  /** The most that can be recorded as paid now */
  payableNow: number;
  openMilestones: PaymentMilestone[];
  milestones: PaymentMilestoneSummary[];
  claim: RefundClaim | null;
}

export interface OrderPayments {
  summary: PaymentSummary;
  entries: DealerPaymentEntry[];
}

export interface RecordPaymentRequest {
  kind: 'PAYMENT' | 'REFUND';
  milestone?: PaymentMilestone;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidOn: string;
  note?: string;
}

export const MILESTONE_LABELS: Record<PaymentMilestone, string> = {
  ADVANCE: 'Advance',
  MIDTERM: 'Midterm',
  FINAL: 'Final (after testing)',
};

export const CLAIM_CAUSE_LABELS: Record<RefundClaimCause, string> = {
  FAILED_TESTING: 'Units failed testing',
  ORDER_CANCELLED: 'Order cancelled after a payment',
  ORDER_RETURNED: 'Order returned',
};

export const PAYMENT_STATUS_LABELS: Record<DealerPaymentStatus, string> = {
  PENDING_APPROVAL: 'Waiting for confirmation',
  APPROVED: 'Confirmed',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};
