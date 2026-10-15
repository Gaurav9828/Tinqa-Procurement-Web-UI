/**
 * Customer order lifecycle: which status an admin may move an order to from the current one.
 * Every move is forward-only — there is no "undo" and no way to jump between stages.
 *
 * This is the UI's copy of the rules so admins only see valid choices. The e-commerce backend
 * must enforce the same table on every endpoint that changes status — UI rules are guidance,
 * not security.
 *
 *   Placed → Confirmed → Processing → Packed → Shipped → (In transit) → Out for delivery → Delivered
 *   Out for delivery → Delivery failed / Customer unavailable / Invalid address → re-attempt, or return to the warehouse
 *   Out for delivery → Customer cancelled delivery → return to the warehouse
 *   Delivered → Return requested → approved / rejected → Out for pickup → Picked up → In transit
 *             → Received at warehouse → Inspection → Refund initiated → Refund completed
 *   Cancelled (paid) → Refund requested → Refund initiated → Refund completed
 *     (a paid order cancelled before shipment — e.g. by the customer before an admin confirmed it — is refunded
 *      once the admin has checked the cancellation reason)
 *
 * Refund statuses are part of the lifecycle (timeline, badges, stage progress) but are never set from the
 * status form: the Razorpay refund flow (L1 requests, L2 approves) moves the order — see SYSTEM_ONLY_STATUSES.
 *
 * Delivery riders (DELIVERY_STATUS_UPDATE) may only record DELIVERY_OUTCOMES; everything else needs
 * CUSTOMER_ORDER_TRACKING_UPDATE.
 */

export type StagePhase = 'PLACED' | 'CONFIRMED' | 'FULFILMENT' | 'SHIPPING' | 'DELIVERY' | 'DELIVERED' | 'RETURNS' | 'REFUND' | 'CLOSED';

export const STAGE_LABELS: Record<StagePhase, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  FULFILMENT: 'Fulfilment',
  SHIPPING: 'Shipped',
  DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  RETURNS: 'Returns',
  REFUND: 'Refund',
  CLOSED: 'Closed',
};

/** Happy-path stages, in order, for the progress indicator. */
export const MAIN_STAGES: StagePhase[] = ['PLACED', 'CONFIRMED', 'FULFILMENT', 'SHIPPING', 'DELIVERY', 'DELIVERED'];

export interface CustomerStatusInfo {
  stage: StagePhase;
  /** Wording on the action card that moves the order into this status. */
  action: string;
  description: string;
  tone: 'forward' | 'exception';
}

export const STATUS_INFO: Record<string, CustomerStatusInfo> = {
  ORDER_RECEIVED: { stage: 'PLACED', action: 'Order received', description: 'The order was placed.', tone: 'forward' },
  ORDER_PENDING: { stage: 'PLACED', action: 'Hold as pending', description: 'Waiting on something (e.g. payment) before confirmation.', tone: 'forward' },
  PRE_ORDER_RECEIVED: { stage: 'PLACED', action: 'Pre-order received', description: 'Ordered while out of stock.', tone: 'forward' },
  PRE_ORDER_PENDING: { stage: 'PLACED', action: 'Wait for stock', description: 'Waiting for stock before the pre-order can be approved.', tone: 'forward' },
  CONFIRMED: { stage: 'CONFIRMED', action: 'Confirm order', description: 'Payment received; the order will be fulfilled.', tone: 'forward' },
  PRE_ORDER_CONFIRMED: { stage: 'CONFIRMED', action: 'Approve pre-order', description: 'Stock reserved for the pre-order.', tone: 'forward' },
  PROCESSING: { stage: 'FULFILMENT', action: 'Start processing', description: 'Items are being picked at the warehouse.', tone: 'forward' },
  PACKED: { stage: 'FULFILMENT', action: 'Mark packed', description: 'Packed and ready to hand over to the courier.', tone: 'forward' },
  SHIPPED: { stage: 'SHIPPING', action: 'Mark shipped', description: 'Handed over to the courier.', tone: 'forward' },
  IN_TRANSIT: { stage: 'SHIPPING', action: 'Mark in transit', description: 'On the way to the delivery hub.', tone: 'forward' },
  OUT_FOR_DELIVERY: { stage: 'DELIVERY', action: 'Out for delivery', description: 'With the delivery agent today.', tone: 'forward' },
  DELIVERY_FAILED: { stage: 'DELIVERY', action: 'Delivery failed', description: 'The delivery attempt did not succeed.', tone: 'exception' },
  CUSTOMER_UNAVAILABLE: {
    stage: 'DELIVERY',
    action: 'Customer unavailable',
    description: 'Nobody was there to receive the parcel, or the customer could not be reached.',
    tone: 'exception',
  },
  INVALID_ADDRESS: { stage: 'DELIVERY', action: 'Invalid address', description: 'The address is wrong, incomplete or could not be found.', tone: 'exception' },
  CUSTOMER_CANCELLED_DELIVERY: {
    stage: 'DELIVERY',
    action: 'Customer cancelled delivery',
    description: 'The customer refused the parcel at the door. It goes back to the warehouse.',
    tone: 'exception',
  },
  DELIVERY_REATTEMPT: { stage: 'DELIVERY', action: 'Re-attempt delivery', description: 'The delivery will be tried again.', tone: 'forward' },
  DELIVERED: { stage: 'DELIVERED', action: 'Mark delivered', description: 'The customer received the order.', tone: 'forward' },
  RETURN_REQUESTED: { stage: 'RETURNS', action: 'Request return', description: 'The customer asked to return the order.', tone: 'forward' },
  RETURN_APPROVED: { stage: 'RETURNS', action: 'Approve return', description: 'The return is accepted; a pickup will be arranged.', tone: 'forward' },
  RETURN_REJECTED: { stage: 'CLOSED', action: 'Reject return', description: 'The return is not accepted. The order stays delivered and is closed.', tone: 'exception' },
  OUT_FOR_PICKUP: { stage: 'RETURNS', action: 'Out for pickup', description: 'The courier is on the way to collect the item.', tone: 'forward' },
  RETURN_PICKED_UP: { stage: 'RETURNS', action: 'Mark picked up', description: 'The courier collected the item from the customer.', tone: 'forward' },
  RETURN_IN_TRANSIT: { stage: 'RETURNS', action: 'Return in transit', description: 'On the way back to the warehouse.', tone: 'forward' },
  RETURN_RECEIVED: { stage: 'RETURNS', action: 'Received at warehouse', description: 'The returned item reached the warehouse.', tone: 'forward' },
  RETURN_INSPECTION: { stage: 'RETURNS', action: 'Start inspection', description: 'The returned item is being checked.', tone: 'forward' },
  RETURN_INSPECTION_FAILED: { stage: 'CLOSED', action: 'Inspection failed', description: 'The item failed inspection; no refund. The order is closed.', tone: 'exception' },
  RETURN_CANCELLED: { stage: 'CLOSED', action: 'Cancel return', description: 'The return was withdrawn. The order stays delivered.', tone: 'exception' },
  RETURN_COMPLETED: { stage: 'CLOSED', action: 'Close return (no refund due)', description: 'Nothing was paid, so there is nothing to refund.', tone: 'forward' },
  REFUND_REQUESTED: {
    stage: 'REFUND',
    action: 'Record refund request',
    description: 'The customer asked for their money back. Check the cancellation reason before refunding.',
    tone: 'forward',
  },
  REFUND_INITIATED: { stage: 'REFUND', action: 'Initiate refund', description: 'The refund was sent to the payment provider.', tone: 'forward' },
  REFUND_FAILED: { stage: 'REFUND', action: 'Refund failed', description: 'The provider rejected the refund; it can be initiated again.', tone: 'exception' },
  REFUND_COMPLETED: { stage: 'CLOSED', action: 'Refund completed', description: 'The customer received the money. The order is closed.', tone: 'forward' },
  CANCELLED: { stage: 'CLOSED', action: 'Cancel order', description: 'The order will not be fulfilled.', tone: 'exception' },
};

export const STATUS_STAGE: Record<string, StagePhase> = Object.fromEntries(Object.entries(STATUS_INFO).map(([s, info]) => [s, info.stage]));

/** Forward transitions. Anything not listed is not allowed. */
export const NEXT_STATUSES: Record<string, readonly string[]> = {
  ORDER_RECEIVED: ['ORDER_PENDING', 'CONFIRMED', 'CANCELLED'],
  ORDER_PENDING: ['CONFIRMED', 'CANCELLED'],
  // PRE_ORDER_CONFIRMED is reached only via the dedicated approval (see APPROVAL_ONLY_STATUSES).
  PRE_ORDER_RECEIVED: ['PRE_ORDER_PENDING', 'CANCELLED'],
  PRE_ORDER_PENDING: ['CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PRE_ORDER_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  // Once shipped the order can no longer be cancelled; unwanted items come back as a return.
  SHIPPED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED', 'CUSTOMER_UNAVAILABLE', 'INVALID_ADDRESS', 'CUSTOMER_CANCELLED_DELIVERY'],
  // Re-attempt the delivery, or send the parcel back to the warehouse (return to origin).
  DELIVERY_FAILED: ['OUT_FOR_DELIVERY', 'DELIVERY_REATTEMPT', 'RETURN_IN_TRANSIT'],
  CUSTOMER_UNAVAILABLE: ['DELIVERY_REATTEMPT', 'RETURN_IN_TRANSIT'],
  INVALID_ADDRESS: ['DELIVERY_REATTEMPT', 'RETURN_IN_TRANSIT'],
  // The customer turned the parcel away: it can only go back.
  CUSTOMER_CANCELLED_DELIVERY: ['RETURN_IN_TRANSIT'],
  DELIVERY_REATTEMPT: ['OUT_FOR_DELIVERY', 'RETURN_IN_TRANSIT'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED: ['OUT_FOR_PICKUP', 'RETURN_CANCELLED'],
  OUT_FOR_PICKUP: ['RETURN_PICKED_UP', 'RETURN_CANCELLED'],
  RETURN_PICKED_UP: ['RETURN_IN_TRANSIT'],
  RETURN_IN_TRANSIT: ['RETURN_RECEIVED'],
  RETURN_RECEIVED: ['RETURN_INSPECTION'],
  // Paid orders are refunded; unpaid ones (nothing to refund) are closed.
  RETURN_INSPECTION: ['REFUND_INITIATED', 'RETURN_COMPLETED', 'RETURN_INSPECTION_FAILED'],
  REFUND_INITIATED: ['REFUND_COMPLETED', 'REFUND_FAILED'],
  REFUND_FAILED: ['REFUND_INITIATED'],
  // A paid order that is cancelled is refunded (request → initiate → complete); an unpaid one is simply closed.
  CANCELLED: ['REFUND_REQUESTED'],
  REFUND_REQUESTED: ['REFUND_INITIATED'],
  REFUND_COMPLETED: [],
  RETURN_COMPLETED: [],
  RETURN_REJECTED: [],
  RETURN_INSPECTION_FAILED: [],
  RETURN_CANCELLED: [],
};

/**
 * Orders with no recognised status yet (no tracking, or a legacy value such as "PENDING")
 * may only be started: placed, confirmed or cancelled — never jumped into shipment/returns.
 */
export const START_STATUSES: readonly string[] = [
  'ORDER_RECEIVED',
  'ORDER_PENDING',
  'CONFIRMED',
  'PRE_ORDER_RECEIVED',
  'PRE_ORDER_PENDING',
  'CANCELLED',
];

/**
 * Statuses never offered in the generic status form. PRE_ORDER_CONFIRMED means "stock checked
 * and reserved" and must go through PATCH /admin/orders/{n}/pre-order/approve; the backend
 * rejects it elsewhere (409 PRE_ORDER_APPROVAL_NOT_ALLOWED).
 */
export const APPROVAL_ONLY_STATUSES: ReadonlySet<string> = new Set(['PRE_ORDER_CONFIRMED']);

/**
 * Statuses set only by the backend's refund flow, never offered in the status form: Request refund (L1) moves a
 * paid order to REFUND_REQUESTED, L2 approval to REFUND_INITIATED, and Razorpay's outcome to REFUND_COMPLETED /
 * REFUND_FAILED. The backend rejects them on PATCH /orders/{n}/tracking (409 REFUND_MANAGED_BY_RAZORPAY).
 */
export const SYSTEM_ONLY_STATUSES: ReadonlySet<string> = new Set(['REFUND_REQUESTED', 'REFUND_INITIATED', 'REFUND_FAILED', 'REFUND_COMPLETED']);

/**
 * What a delivery rider records at the door (permission DELIVERY_STATUS_UPDATE, via PATCH /orders/{n}/delivery-status).
 * Every other status, return to origin included, is set by holders of CUSTOMER_ORDER_TRACKING_UPDATE. The backend
 * refuses anything else from a rider (403 DELIVERY_STATUS_NOT_ALLOWED).
 */
export const DELIVERY_OUTCOMES: ReadonlySet<string> = new Set([
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CUSTOMER_UNAVAILABLE',
  'INVALID_ADDRESS',
  'CUSTOMER_CANCELLED_DELIVERY',
  'DELIVERY_REATTEMPT',
]);

/**
 * Statuses that confirm an order. An order may be confirmed only once it is fully paid
 * (paymentStatus PAID) — the backend enforces the same rule (409 ORDER_PAYMENT_INCOMPLETE).
 */
export const PAYMENT_REQUIRED_STATUSES: ReadonlySet<string> = new Set(['CONFIRMED', 'PRE_ORDER_CONFIRMED']);

/** Statuses that close the order for good once reached. */
export const FINAL_STATUSES: ReadonlySet<string> = new Set([
  'REFUND_COMPLETED',
  'RETURN_COMPLETED',
  'RETURN_REJECTED',
  'RETURN_INSPECTION_FAILED',
  'RETURN_CANCELLED',
]);

/**
 * Payment status per refund step: request → REFUND_REQUESTED, L2 approval accepted by Razorpay → REFUND_INITIATED,
 * processed → REFUNDED, failed → REFUND_FAILED. A rejected request puts it back to what it was.
 */
const isRefundRequested = (paymentStatus: string | null | undefined): boolean =>
  (paymentStatus ?? '').trim().toUpperCase() === 'REFUND_REQUESTED';

/** Only PAID counts: PENDING, FAILED, REFUND_REQUESTED, missing… all block confirmation. */
export const isFullyPaid = (paymentStatus: string | null | undefined): boolean => (paymentStatus ?? '').trim().toUpperCase() === 'PAID';

/** Why the order can't be confirmed yet, or null when it is paid. */
export const getPaymentBlockReason = (paymentStatus: string | null | undefined): string | null => {
  if (isFullyPaid(paymentStatus)) return null;
  const current = paymentStatus?.trim() ? paymentStatus.trim().replace(/_/g, ' ').toLowerCase() : 'not recorded';
  return `This order can't be confirmed until it is fully paid (payment status: ${current}).`;
};

export const getStage = (status: string | null | undefined): StagePhase | null => (status && STATUS_STAGE[status]) || null;

export const isKnownStatus = (status: string | null | undefined): boolean => !!status && status in NEXT_STATUSES;

export interface WorkflowContext {
  /** Current status: the current tracking event, or the order status if there is none. */
  currentStatus: string | null;
  /** The order's payment status; confirming and refunding require PAID. */
  paymentStatus: string | null;
}

/**
 * The table plus the payment rules (confirm needs PAID, closing a return without refund needs unpaid),
 * minus the refund statuses, which only the refund flow sets.
 */
export const getAllowedStatuses = ({ currentStatus, paymentStatus }: WorkflowContext): string[] => {
  const paid = isFullyPaid(paymentStatus);
  const table = isKnownStatus(currentStatus) ? NEXT_STATUSES[currentStatus!] : START_STATUSES;
  return table.filter((status) => {
    if (SYSTEM_ONLY_STATUSES.has(status)) return false;
    if (PAYMENT_REQUIRED_STATUSES.has(status)) return paid;
    // Closing a return means nothing is owed: never for a paid order, nor while a refund is requested
    // (the backend answers 409 REFUND_REQUIRED).
    if (status === 'RETURN_COMPLETED') return !paid && !isRefundRequested(paymentStatus);
    return true;
  });
};

/** A delivery rider's choices: the allowed next steps that are delivery outcomes. */
export const getDeliveryOutcomes = (context: WorkflowContext): string[] =>
  getAllowedStatuses(context).filter((status) => DELIVERY_OUTCOMES.has(status));

/** Where the refund is handled instead of the status form, or null when no refund applies. */
export const getRefundHint = ({ currentStatus, paymentStatus }: WorkflowContext): string | null => {
  switch (currentStatus) {
    case 'REFUND_REQUESTED':
      return 'A refund has been requested. An approver approves or rejects it in the Refunds section.';
    case 'REFUND_INITIATED':
      return 'The refund is with Razorpay. Its status updates automatically, or use Refresh status in the Refunds section.';
    case 'REFUND_FAILED':
      return 'The refund failed. It can be requested again from the Refunds section.';
    case 'CANCELLED':
    case 'RETURN_INSPECTION':
      if (isRefundRequested(paymentStatus)) return 'A refund has been requested. An approver approves or rejects it in the Refunds section.';
      return isFullyPaid(paymentStatus) ? 'To refund the customer, use Request refund in the Refunds section.' : null;
    default:
      return null;
  }
};

/** Whether confirming is a valid next step for this order and is held back only by payment. */
export const isConfirmBlockedByPayment = ({ currentStatus, paymentStatus }: WorkflowContext): boolean => {
  if (isFullyPaid(paymentStatus)) return false;
  const table = isKnownStatus(currentStatus) ? NEXT_STATUSES[currentStatus!] : START_STATUSES;
  return table.some((status) => PAYMENT_REQUIRED_STATUSES.has(status));
};

/** Human-readable reason the order can no longer change status, or null if it still can. */
export const getLockReason = (context: WorkflowContext): string | null => {
  if (getAllowedStatuses(context).length) return null;
  const refundHint = getRefundHint(context);
  switch (context.currentStatus) {
    case 'CANCELLED':
      return refundHint
        ? `This order is cancelled and was paid. ${refundHint}`
        : 'This order is cancelled. Its status is final and can no longer be changed.';
    case 'REFUND_REQUESTED':
    case 'REFUND_INITIATED':
    case 'REFUND_FAILED':
      return refundHint;
    case 'RETURN_COMPLETED':
      return 'The return for this order is completed. Its status is final and can no longer be changed.';
    case 'REFUND_COMPLETED':
      return 'The refund for this order is completed. Its status is final and can no longer be changed.';
    case 'RETURN_REJECTED':
      return 'The return request was rejected and the order is closed. Its status is final.';
    case 'RETURN_INSPECTION_FAILED':
      return 'The returned item failed inspection and the order is closed. Its status is final.';
    case 'RETURN_CANCELLED':
      return 'The return was cancelled and the order is closed. Its status is final.';
    default:
      return null;
  }
};

/** Moves that need a confirmation click: anything final, exceptional, or delivery itself. */
export const needsConfirmation = (status: string): boolean =>
  status === 'DELIVERED' || status === 'CANCELLED' || FINAL_STATUSES.has(status) || STATUS_INFO[status]?.tone === 'exception';

/** Return track for the progress indicator (after delivery, or a failed delivery coming back). */
export const RETURN_TRACK: { key: string; label: string; statuses: string[] }[] = [
  { key: 'REQUESTED', label: 'Requested', statuses: ['RETURN_REQUESTED'] },
  { key: 'APPROVED', label: 'Approved', statuses: ['RETURN_APPROVED', 'RETURN_REJECTED'] },
  { key: 'PICKUP', label: 'Pickup', statuses: ['OUT_FOR_PICKUP', 'RETURN_PICKED_UP', 'RETURN_CANCELLED'] },
  { key: 'WAREHOUSE', label: 'At warehouse', statuses: ['RETURN_IN_TRANSIT', 'RETURN_RECEIVED'] },
  { key: 'INSPECTION', label: 'Inspection', statuses: ['RETURN_INSPECTION', 'RETURN_INSPECTION_FAILED', 'RETURN_COMPLETED'] },
  { key: 'REFUND', label: 'Refund', statuses: ['REFUND_INITIATED', 'REFUND_FAILED', 'REFUND_COMPLETED'] },
];

/** Refund track for a paid order that was cancelled before shipment. */
export const CANCELLATION_REFUND_TRACK: { key: string; label: string; statuses: string[] }[] = [
  { key: 'CANCELLED', label: 'Cancelled', statuses: ['CANCELLED'] },
  { key: 'REQUESTED', label: 'Refund requested', statuses: ['REFUND_REQUESTED'] },
  { key: 'INITIATED', label: 'Refund initiated', statuses: ['REFUND_INITIATED', 'REFUND_FAILED'] },
  { key: 'COMPLETED', label: 'Refund completed', statuses: ['REFUND_COMPLETED'] },
];
