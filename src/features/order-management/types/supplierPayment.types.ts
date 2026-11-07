import type { OrderStatus } from '../../../types/common.types';
import type { PaymentMethod } from '../utils/paymentPlan';

/** PAYMENT: TinQa paid the supplier. REFUND: the supplier paid back. REVERSAL: undoes one confirmed entry. */
export type SupplierPaymentKind = 'PAYMENT' | 'REFUND' | 'REVERSAL';
export type PaymentMilestone = 'ADVANCE' | 'MIDTERM' | 'FINAL';
/**
 * A payment: requested (PENDING_APPROVAL) → the Super Admin approves (TO_PAY) → the Finance Manager pays and gives the
 * reference (AWAITING_SUPPLIER) → the supplier says received (APPROVED) or not (NOT_RECEIVED: re-checked and sent
 * again). Money back from the supplier (a refund they pay, a reversal of a confirmed payment, a failed-pieces return):
 * REPAYMENT_DUE (asked) → the supplier pays it back (REPAYMENT_SENT) → the Finance Manager confirms it arrived
 * (APPROVED) or not (REPAYMENT_MISSING: the supplier sends it again). A reversal of a refund (money going out) keeps
 * PENDING_APPROVAL → APPROVED. See docs/supplier-returns-and-repayments.md, which wins over the older docs.
 */
export type SupplierPaymentStatus =
  | 'PENDING_APPROVAL' | 'TO_PAY' | 'AWAITING_SUPPLIER' | 'NOT_RECEIVED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
  | 'REPAYMENT_DUE' | 'REPAYMENT_SENT' | 'REPAYMENT_MISSING';

export type PaymentEventType =
  | 'REQUESTED' | 'CORRECTED' | 'REQUEST_APPROVED' | 'REQUEST_REJECTED' | 'PAID' | 'NOT_RECEIVED' | 'RESENT' | 'RECEIVED'
  | 'WITHDRAWN' | 'RECORDED' | 'APPROVED' | 'REJECTED'
  | 'REPAYMENT_REQUESTED' | 'REPAYMENT_SENT' | 'REPAYMENT_RESENT' | 'REPAYMENT_MISSING' | 'REPAYMENT_RECEIVED';

/** One step of an entry's history (append-only on the server). The supplier sees only the steps from PAID on, without names. */
export interface PaymentEvent {
  type: PaymentEventType;
  at: string;
  actorRole: string | null;
  /** Staff view only */
  actorName: string | null;
  reference: string | null;
  paidOn: string | null;
  note: string | null;
  /** A re-send's proof file */
  proofDocumentId: number | null;
  proofFileName: string | null;
}
export type RefundClaimCause = 'FAILED_TESTING' | 'ORDER_CANCELLED' | 'ORDER_RETURNED';

/** One entry of GET /v1/orders/{id}/payments (and of the Approvals Hub queue GET /v1/orders/payments). */
export interface SupplierPaymentEntry {
  id: number;
  orderId: number;
  orderNumber: string | null;
  supplierName: string | null;
  kind: SupplierPaymentKind;
  milestone: PaymentMilestone | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  /** Null while a payment request waits to be paid */
  paidOn: string | null;
  note: string | null;
  reversesId: number | null;
  /** Confirmed and reversed (or its reversal waits) */
  reversed: boolean;
  status: SupplierPaymentStatus;
  /** Staff only (absent in the supplier's own view) */
  recordedBy: number | null;
  recordedByUsername: string | null;
  recordedAt: string;
  decidedByUsername: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  /** Payments: when the supplier answered, and why they said it did not reach them */
  supplierRespondedAt?: string | null;
  supplierResponseReason?: string | null;
  /** Who paid it and gave the reference (staff view only), and when */
  paidByUsername?: string | null;
  paidAt?: string | null;
  /** How many times it was sent to the supplier (more than 1 after a "not received") */
  sendCount?: number;
  events?: PaymentEvent[];
  /** A return's shipping charge, paid on top of `amount` (never counts towards the claim); 0 otherwise */
  chargeAmount: number;
  /** The failed-pieces return this repayment is for */
  returnId: number | null;
  /** PENDING_APPROVAL payment requests: the earlier part that must be approved first, or null when it can be approved now */
  waitsFor: PaymentMilestone | null;
}

export interface PaymentMilestoneSummary {
  milestone: PaymentMilestone;
  percent: number | null;
  planned: number;
  paid: number;
  pending: number;
  /** The order reached the point where this part is due */
  due: boolean;
  /** What a payment against this part is now, set by the server from the plan (0 when not due or nothing is left) */
  left: number;
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

/** Where an order's payments stand (see SupplierPaymentService on the server). */
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
  /** What TinQa owes the supplier in all, now */
  payable: number;
  paid: number;
  pendingPayments: number;
  /** Of the waiting payments: those confirmed by staff, waiting for the supplier to confirm receipt */
  awaitingSupplier: number;
  refunded: number;
  pendingRefunds: number;
  outstanding: number;
  /** The most that can be recorded as paid now */
  payableNow: number;
  openMilestones: PaymentMilestone[];
  /**
   * Delivered, tested, fully paid and every payment received by the supplier: no entry of the order can be reversed any
   * more (the server answers 409 SUPPLIER_PAYMENT_REVERSAL_CLOSED)
   */
  reversalClosed: boolean;
  milestones: PaymentMilestoneSummary[];
  claim: RefundClaim | null;
  /** Why the order is worth what it is after testing; null until the stock entry is approved (or once closed) */
  settlement?: PaymentSettlement | null;
}

/**
 * From the quoted total to the worth after testing (Procurement's PaymentSettlement). Rupees; the lines add up exactly:
 * orderValue − failedValue − shortValue − shipmentDropped − gstReduction = payable.
 */
export interface PaymentSettlement {
  unitType: string;
  unitPrice: number;
  orderedUnits: number;
  passedUnits: number;
  failedUnits: number;
  /** Neither passed nor failed: not delivered (negative when more than ordered was tested) */
  shortUnits: number;
  shipment: number;
  /** Null without a GST breakup on the quotation */
  gstRate: number | null;
  quotedGoods: number;
  quotedTaxable: number;
  quotedGst: number;
  orderValue: number;
  failedValue: number;
  shortValue: number;
  /** The shipment, taken off only when no unit passed */
  shipmentDropped: number;
  gstReduction: number;
  reduction: number;
  passedGoods: number;
  passedTaxable: number;
  passedGst: number;
  payable: number;
}

export interface OrderPayments {
  summary: PaymentSummary;
  entries: SupplierPaymentEntry[];
}

/**
 * A payment request: no reference or date yet, the amount is the plan's. Staff no longer record refunds (the server
 * answers 400 on `kind: 'REFUND'`): the supplier pays them back in their portal.
 */
export interface RecordPaymentRequest {
  kind: 'PAYMENT';
  milestone?: PaymentMilestone;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidOn?: string;
  note?: string;
}

/** The Finance Manager pays an approved request: the reference (required unless cash) and the date. */
export interface MarkPaidRequest {
  reference?: string;
  paidOn: string;
  note?: string;
}

/** After the supplier said "not received": checked again, sent again, optionally with a proof file. */
export interface ResendPaymentRequest extends MarkPaidRequest {
  note: string;
  proof?: File | null;
}

/** The supplier pays money back (an ask, or a refund due): method, reference unless cash, date, optional receipt. */
export interface RepaymentRequest {
  method: PaymentMethod;
  reference?: string;
  paidOn: string;
  note?: string;
  receipt?: File | null;
}

/** A refund the supplier pays on their own, at most what is still due on the claim. */
export interface RefundDuePaymentRequest extends RepaymentRequest {
  amount: number;
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

export const PAYMENT_STATUS_LABELS: Record<SupplierPaymentStatus, string> = {
  PENDING_APPROVAL: 'Waiting for Super Admin',
  TO_PAY: 'Approved: to pay',
  AWAITING_SUPPLIER: 'Waiting for the supplier',
  NOT_RECEIVED: 'Supplier: not received',
  APPROVED: 'Confirmed',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  REPAYMENT_DUE: 'Waiting for the supplier to pay back',
  REPAYMENT_SENT: 'Paid back: Finance Manager to check',
  REPAYMENT_MISSING: 'Finance Manager: not received',
};

export const PAYMENT_EVENT_LABELS: Record<PaymentEventType, string> = {
  REQUESTED: 'Payment requested',
  CORRECTED: 'Request corrected',
  REQUEST_APPROVED: 'Request approved',
  REQUEST_REJECTED: 'Request rejected',
  PAID: 'Paid and sent to the supplier',
  NOT_RECEIVED: 'Supplier: not received',
  RESENT: 'Checked and sent again',
  RECEIVED: 'Supplier confirmed receipt',
  WITHDRAWN: 'Withdrawn',
  RECORDED: 'Recorded',
  APPROVED: 'Confirmed',
  REJECTED: 'Rejected',
  REPAYMENT_REQUESTED: 'Supplier asked to pay back',
  REPAYMENT_SENT: 'Supplier paid it back',
  REPAYMENT_RESENT: 'Supplier sent it again',
  REPAYMENT_MISSING: 'Finance Manager: not received',
  REPAYMENT_RECEIVED: 'Finance Manager confirmed it arrived',
};

/** Money back from the supplier that waits on them or on the Finance Manager's check. */
export const REPAYMENT_STATUSES: ReadonlySet<SupplierPaymentStatus> = new Set<SupplierPaymentStatus>([
  'REPAYMENT_DUE', 'REPAYMENT_SENT', 'REPAYMENT_MISSING',
]);

/** The supplier still has to pay these back (asked, or the Finance Manager said it did not arrive). */
export const SUPPLIER_TO_REPAY: ReadonlySet<SupplierPaymentStatus> = new Set<SupplierPaymentStatus>(['REPAYMENT_DUE', 'REPAYMENT_MISSING']);

/** Statuses of a payment that still wait on someone (held against the plan's part and the cap). */
export const WAITING_PAYMENT_STATUSES: ReadonlySet<SupplierPaymentStatus> = new Set<SupplierPaymentStatus>([
  'PENDING_APPROVAL', 'TO_PAY', 'AWAITING_SUPPLIER', 'NOT_RECEIVED',
]);
