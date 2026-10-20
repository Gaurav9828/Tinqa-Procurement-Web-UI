import type { OrderStatus } from '../../../types/common.types';
import type { Permission } from '../../../config/access';

/**
 * Procurement (dealer) order lifecycle. Every move is forward-only: an order can never go
 * back to an earlier step. This is the console's copy of the rules so admins are only shown
 * valid next steps; the procurement backend enforces the same table (UI rules are guidance,
 * not security).
 *
 *   QUOTATION → PENDING (approval) → DEALER_LEVEL_PENDING → CONFIRMED → SHIPPED → DELIVERED
 *   DELIVERED → RETURN_REQUESTED → RETURN_APPROVED → RETURN_PICKED_UP → RETURN_RECEIVED
 *             → REFUND_INITIATED → REFUND_COMPLETED   (REFUND_FAILED → REFUND_INITIATED retries)
 *   Cancelling is possible only before shipment.
 */

/** What the signed-in admin may do to procurement orders, from their permissions (see orderAccessFrom). */
export interface OrderAccess {
  /** PROCUREMENT_ORDER_UPDATE: edit a quotation. */
  canEdit: boolean;
  /** PROCUREMENT_ORDER_UPDATE_STATUS: routine moves. */
  canProgress: boolean;
  /** PROCUREMENT_ORDER_APPROVE: approval decisions, and editing an order that waits for approval. */
  canApprove: boolean;
}

export const NO_ORDER_ACCESS: OrderAccess = { canEdit: false, canProgress: false, canApprove: false };

export const orderAccessFrom = (can: (permission: Permission) => boolean): OrderAccess => ({
  canEdit: can('PROCUREMENT_ORDER_UPDATE'),
  canProgress: can('PROCUREMENT_ORDER_UPDATE_STATUS'),
  canApprove: can('PROCUREMENT_ORDER_APPROVE'),
});

export interface StatusInfo {
  label: string;
  /** What the step means, shown on the action card. */
  description: string;
  /** Wording of the button that moves the order into this status. */
  action: string;
  /** Exceptional steps (cancel, reject, failures) are styled as warnings. */
  tone: 'forward' | 'exception';
}

export const ORDER_STATUS_INFO: Record<OrderStatus, StatusInfo> = {
  QUOTATION: { label: 'Quotation', description: 'Dealer quotation recorded; still editable.', action: 'Back to quotation', tone: 'forward' },
  PENDING: { label: 'Pending approval', description: 'Sent to an order approver.', action: 'Submit for approval', tone: 'forward' },
  DEALER_LEVEL_PENDING: { label: 'Awaiting dealer', description: 'Approved; waiting for the dealer to accept or reject it (they can answer from their dealer login).', action: 'Approve', tone: 'forward' },
  CONFIRMED: { label: 'Confirmed', description: 'The dealer accepted the order.', action: 'Dealer confirmed', tone: 'forward' },
  SHIPPED: { label: 'Shipped', description: 'The dealer dispatched the goods.', action: 'Mark shipped', tone: 'forward' },
  DELIVERED: { label: 'Delivered', description: 'Goods received at the warehouse.', action: 'Mark delivered', tone: 'forward' },
  RETURN_REQUESTED: { label: 'Return requested', description: 'Some or all goods are being sent back to the dealer.', action: 'Request return', tone: 'exception' },
  RETURN_APPROVED: { label: 'Return approved', description: 'The dealer agreed to take the goods back.', action: 'Approve return', tone: 'forward' },
  RETURN_REJECTED: { label: 'Return rejected', description: 'The return was not accepted. The order stays delivered.', action: 'Reject return', tone: 'exception' },
  RETURN_PICKED_UP: { label: 'Return picked up', description: 'The goods left the warehouse for the dealer.', action: 'Mark picked up', tone: 'forward' },
  RETURN_RECEIVED: { label: 'Return received', description: 'The dealer received the returned goods.', action: 'Dealer received goods', tone: 'forward' },
  REFUND_INITIATED: { label: 'Refund initiated', description: 'The dealer started refunding the amount.', action: 'Refund initiated', tone: 'forward' },
  REFUND_FAILED: { label: 'Refund failed', description: 'The refund did not go through; it can be initiated again.', action: 'Refund failed', tone: 'exception' },
  REFUND_COMPLETED: { label: 'Refund completed', description: 'The refund was received. The order is closed.', action: 'Refund received', tone: 'forward' },
  CANCELLED: { label: 'Cancelled', description: 'The order is closed without delivery.', action: 'Cancel order', tone: 'exception' },
};

/** Forward transitions. Anything not listed is not allowed. */
export const ORDER_NEXT_STATUSES: Record<OrderStatus, readonly OrderStatus[]> = {
  QUOTATION: ['PENDING', 'CANCELLED'],
  // Only the approval decision decides a pending order (Approvals Hub): approve → DEALER_LEVEL_PENDING, reject → CANCELLED.
  PENDING: [],
  DEALER_LEVEL_PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  // Once shipped it can't be cancelled; unwanted goods come back through a return.
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED: ['RETURN_PICKED_UP'],
  RETURN_PICKED_UP: ['RETURN_RECEIVED'],
  RETURN_RECEIVED: ['REFUND_INITIATED'],
  REFUND_INITIATED: ['REFUND_COMPLETED', 'REFUND_FAILED'],
  REFUND_FAILED: ['REFUND_INITIATED'],
  REFUND_COMPLETED: [],
  RETURN_REJECTED: [],
  CANCELLED: [],
};

/** Final statuses: nothing follows them. */
export const FINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set(['CANCELLED', 'RETURN_REJECTED', 'REFUND_COMPLETED']);

/** Moves that need a reason (stored in the status history). */
export const REASON_REQUIRED_STATUSES: ReadonlySet<OrderStatus> = new Set(['CANCELLED', 'RETURN_REQUESTED', 'RETURN_REJECTED', 'REFUND_FAILED']);

/** Approval-type decisions: moving out of these needs PROCUREMENT_ORDER_APPROVE as well (the backend's rule). */
const APPROVER_ONLY_FROM: ReadonlySet<OrderStatus> = new Set(['PENDING', 'DEALER_LEVEL_PENDING', 'RETURN_REQUESTED']);

/** Quantity, prices and dates can only change before the order is approved. */
export const canEditOrder = (status: OrderStatus, access: OrderAccess): boolean =>
  access.canEdit && (status === 'QUOTATION' || (status === 'PENDING' && access.canApprove));

export const isKnownOrderStatus = (status: string | null | undefined): status is OrderStatus => !!status && status in ORDER_NEXT_STATUSES;

export const orderStatusLabel = (status: string | null | undefined): string =>
  isKnownOrderStatus(status) ? ORDER_STATUS_INFO[status].label : (status || 'Unknown').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** Next statuses this admin may choose. Unknown (legacy) statuses allow nothing. */
export const getNextOrderStatuses = (status: string | null | undefined, access: OrderAccess): OrderStatus[] => {
  if (!isKnownOrderStatus(status) || !access.canProgress) return [];
  if (APPROVER_ONLY_FROM.has(status) && !access.canApprove) return [];
  return [...ORDER_NEXT_STATUSES[status]];
};

/** Why there is no next step for this admin right now, or null when there is one. */
export const getOrderBlockReason = (status: string | null | undefined, access: OrderAccess): string | null => {
  if (!isKnownOrderStatus(status)) return `This order has an unrecognised status (${status ?? 'none'}). Ask an administrator to check it.`;
  if (status === 'CANCELLED') return 'This order is cancelled. Its status is final.';
  if (status === 'RETURN_REJECTED') return 'The return was rejected and the order is closed. Its status is final.';
  if (status === 'REFUND_COMPLETED') return 'The refund is completed and the order is closed. Its status is final.';
  if (status === 'PENDING') return 'Waiting for an order approver to approve or reject it in the Approvals Hub.';
  if (!access.canProgress) return "You can view this order but your designation doesn't include progressing orders.";
  if (APPROVER_ONLY_FROM.has(status) && !access.canApprove) {
    return status === 'DEALER_LEVEL_PENDING'
      ? 'Waiting for the dealer to accept or reject it from their dealer login. An order approver can record their answer instead.'
      : 'An order approver decides whether to approve this return.';
  }
  return null;
};

/** Main track and return track for the stepper. */
export const MAIN_ORDER_TRACK: { status: OrderStatus; label: string }[] = [
  { status: 'QUOTATION', label: 'Quotation' },
  { status: 'PENDING', label: 'Approval' },
  { status: 'DEALER_LEVEL_PENDING', label: 'Dealer' },
  { status: 'CONFIRMED', label: 'Confirmed' },
  { status: 'SHIPPED', label: 'Shipped' },
  { status: 'DELIVERED', label: 'Delivered' },
];

export const RETURN_ORDER_TRACK: { status: OrderStatus; label: string; also?: OrderStatus[] }[] = [
  { status: 'RETURN_REQUESTED', label: 'Requested' },
  { status: 'RETURN_APPROVED', label: 'Approved', also: ['RETURN_REJECTED'] },
  { status: 'RETURN_PICKED_UP', label: 'Picked up' },
  { status: 'RETURN_RECEIVED', label: 'With dealer' },
  { status: 'REFUND_INITIATED', label: 'Refund', also: ['REFUND_FAILED', 'REFUND_COMPLETED'] },
];

export const isReturnStatus = (status: OrderStatus) => RETURN_ORDER_TRACK.some((s) => s.status === status || s.also?.includes(status));

/** Today's date (YYYY-MM-DD) bounds etc. are handled by the caller; this only validates the inputs a move needs. */
export interface MoveInput {
  reason: string;
  actualDelivery: string;
}

export const REASON_MAX_LENGTH = 500;

export const validateMove = (
  next: OrderStatus,
  { reason, actualDelivery }: MoveInput,
  { orderDate, today }: { orderDate: string | null; today: string }
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const text = reason.trim();
  if (REASON_REQUIRED_STATUSES.has(next) && !text) errors.reason = 'A reason is required for this step.';
  else if (text.length > REASON_MAX_LENGTH) errors.reason = `Keep the reason under ${REASON_MAX_LENGTH} characters.`;
  if (next === 'DELIVERED') {
    if (!actualDelivery) errors.actualDelivery = 'Actual delivery date is required.';
    else if (actualDelivery > today) errors.actualDelivery = 'Actual delivery date cannot be in the future.';
    else if (orderDate && actualDelivery < orderDate) errors.actualDelivery = `Actual delivery date cannot be before the order date (${orderDate}).`;
  }
  return errors;
};

/** A dealer's change waits for approval: the quotation is frozen until it is decided (the backend refuses with 409). */
export const DEALER_CHANGE_BLOCK_REASON = "A dealer's change to this quotation is waiting for approval in the Approvals hub.";

export const isFrozenByDealerChange = (order: { orderStatus: string; dealerChangePending?: boolean }): boolean =>
  !!order.dealerChangePending && order.orderStatus === 'QUOTATION';
