import type { OrderStatus } from '../../../types/common.types';

/**
 * Failed-piece returns to the supplier (SupplierReturnController, docs/supplier-returns-and-repayments.md § 3).
 * A Supplier Manager raises a return of pieces that failed testing; the Super Admin approves it; the supplier accepts
 * it; the pieces are shipped (or collected); the supplier confirms they arrived and pays back what TinQa paid for them
 * plus the shipping charge; a Finance Manager confirms the money, which settles the return.
 */
export type SupplierReturnStatus =
  | 'PENDING_APPROVAL' | 'REJECTED' | 'AWAITING_SUPPLIER' | 'DECLINED' | 'ACCEPTED'
  | 'IN_TRANSIT' | 'RECEIVED_BY_SUPPLIER' | 'SETTLED' | 'CANCELLED';
export type ReturnShippingMode = 'TINQA_SHIPS' | 'SUPPLIER_PICKUP';
export type ReturnEventType =
  | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'ACCEPTED' | 'DECLINED' | 'RESENT' | 'DISPATCHED'
  | 'RECEIVED' | 'SETTLED' | 'CANCELLED';

export interface ReturnEvent {
  id: number;
  type: ReturnEventType;
  at: string;
  actorRole: string | null;
  /** Staff view only */
  actorName: string | null;
  note: string | null;
}

export interface SupplierReturn {
  id: number;
  orderId: number;
  orderNumber: string;
  supplierName: string;
  itemName: string | null;
  units: number;
  unitType: string | null;
  unitPrice: number;
  reason: string;
  pieceDetails: string | null;
  shippingMode: ReturnShippingMode;
  status: SupplierReturnStatus;
  /** units × unit price plus its GST under the quotation */
  piecesValue: number;
  courier: string | null;
  trackingNumber: string | null;
  dispatchedOn: string | null;
  shippingCharge: number | null;
  /** Once the pieces arrived: the repayment ask, and what it asks (amount + chargeAmount) */
  repaymentId: number | null;
  amountDue: number | null;
  /** Staff view only */
  requestedByUsername: string | null;
  requestedAt: string;
  /** Staff view only */
  decidedByUsername: string | null;
  decidedAt: string | null;
  /** Staff view only */
  decisionReason: string | null;
  supplierRespondedAt: string | null;
  supplierResponseReason: string | null;
  receivedAt: string | null;
  settledAt: string | null;
  cancelReason: string | null;
  /** The supplier sees them from APPROVED on, without names */
  events: ReturnEvent[];
}

export interface OrderReturns {
  orderId: number;
  tested: boolean;
  /** The approved stock entry's failed units */
  failedUnits: number;
  /** Held by returns that are not rejected or cancelled */
  unitsInReturns: number;
  unitsLeft: number;
  /** Tested, units left, order open, supplier has a login */
  canRaise: boolean;
  /** Newest first */
  returns: SupplierReturn[];
}

export interface RaiseReturnRequest {
  units: number;
  reason: string;
  pieceDetails?: string;
  shippingMode: ReturnShippingMode;
}

export interface DispatchReturnRequest {
  dispatchedOn: string;
  courier?: string;
  trackingNumber?: string;
  shippingCharge?: number;
  note?: string;
}

export const RETURN_STATUS_LABELS: Record<SupplierReturnStatus, string> = {
  PENDING_APPROVAL: 'Waiting for Super Admin',
  REJECTED: 'Rejected',
  AWAITING_SUPPLIER: 'Waiting for the supplier',
  DECLINED: 'Supplier declined',
  ACCEPTED: 'Accepted: to dispatch',
  IN_TRANSIT: 'On the way to the supplier',
  RECEIVED_BY_SUPPLIER: 'Arrived: supplier to pay back',
  SETTLED: 'Settled',
  CANCELLED: 'Cancelled',
};

export const RETURN_EVENT_LABELS: Record<ReturnEventType, string> = {
  REQUESTED: 'Return raised',
  APPROVED: 'Super Admin approved the return',
  REJECTED: 'Super Admin rejected the return',
  ACCEPTED: 'Supplier accepted the return',
  DECLINED: 'Supplier declined the return',
  RESENT: 'Sent to the supplier again',
  DISPATCHED: 'Pieces dispatched',
  RECEIVED: 'Supplier confirmed the pieces arrived',
  SETTLED: 'Repayment confirmed: settled',
  CANCELLED: 'Return cancelled',
};

export const SHIPPING_MODE_LABELS: Record<ReturnShippingMode, string> = {
  TINQA_SHIPS: 'TinQa ships the pieces',
  SUPPLIER_PICKUP: 'Supplier collects the pieces',
};

/** A Supplier Manager may cancel from these (the server checks too). */
export const CANCELLABLE_RETURN_STATUSES: ReadonlySet<SupplierReturnStatus> = new Set<SupplierReturnStatus>([
  'PENDING_APPROVAL', 'AWAITING_SUPPLIER', 'DECLINED', 'ACCEPTED',
]);

/** Order statuses from which failed pieces may have gone back: delivered (and tested) on. Before, there is nothing to load. */
export const RETURN_STAGES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKED_UP', 'RETURN_RECEIVED',
  'REFUND_INITIATED', 'REFUND_FAILED', 'REFUND_COMPLETED',
]);
