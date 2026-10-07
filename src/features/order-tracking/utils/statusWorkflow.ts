import type { StatusUpdateMode } from '../types/orderTracking.types';

/**
 * Order status workflow: which status changes an admin may make from the current one.
 *
 * This is the UI's copy of the rules so admins only see valid choices. The backend must
 * enforce the same table (see ECOMMERCE_ORDER_STATUS_WORKFLOW_PROMPT.md) — UI rules are
 * guidance, not security.
 */

export type StagePhase = 'PLACED' | 'CONFIRMED' | 'FULFILMENT' | 'DELIVERY' | 'DELIVERED' | 'RETURNS' | 'CLOSED';

export const STAGE_LABELS: Record<StagePhase, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  FULFILMENT: 'Fulfilment',
  DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  RETURNS: 'Returns',
  CLOSED: 'Closed',
};

/** Happy-path stages, in order, for the progress indicator. */
export const MAIN_STAGES: StagePhase[] = ['PLACED', 'CONFIRMED', 'FULFILMENT', 'DELIVERY', 'DELIVERED'];

export const STATUS_STAGE: Record<string, StagePhase> = {
  ORDER_RECEIVED: 'PLACED',
  ORDER_PENDING: 'PLACED',
  PRE_ORDER_RECEIVED: 'PLACED',
  PRE_ORDER_PENDING: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  PRE_ORDER_CONFIRMED: 'CONFIRMED',
  PROCESSING: 'FULFILMENT',
  PACKED: 'FULFILMENT',
  OUT_FOR_DELIVERY: 'DELIVERY',
  DELIVERED: 'DELIVERED',
  RETURN_REQUESTED: 'RETURNS',
  RETURN_IN_TRANSIT: 'RETURNS',
  RETURN_COMPLETED: 'CLOSED',
  CANCELLED: 'CLOSED',
};

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
  PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  // Once shipped the order can no longer be cancelled; a failed delivery comes back as a return.
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURN_IN_TRANSIT'],
  DELIVERED: ['RETURN_REQUESTED'],
  // Rejecting a return puts the order back to Delivered.
  RETURN_REQUESTED: ['RETURN_IN_TRANSIT', 'DELIVERED'],
  RETURN_IN_TRANSIT: ['RETURN_COMPLETED'],
  RETURN_COMPLETED: [],
  CANCELLED: [],
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

/** Final statuses: nothing can follow them, in either mode. */
export const LOCKED_STATUSES: ReadonlySet<string> = new Set(['CANCELLED', 'RETURN_COMPLETED']);

/** Stages where a manual override may undo the last step (nothing has left the warehouse yet). */
const CORRECTABLE_STAGES: ReadonlySet<StagePhase> = new Set(['PLACED', 'CONFIRMED', 'FULFILMENT']);

export const getStage = (status: string | null | undefined): StagePhase | null =>
  (status && STATUS_STAGE[status]) || null;

export const isKnownStatus = (status: string | null | undefined): boolean => !!status && status in NEXT_STATUSES;

export const isLockedStatus = (status: string | null | undefined): boolean => !!status && LOCKED_STATUSES.has(status);

export interface WorkflowContext {
  /** Current status: the current tracking event, or the order status if there is none. */
  currentStatus: string | null;
  /** Status of the event before the current one (for manual "undo last step"). */
  previousStatus: string | null;
}

/**
 * Statuses the admin may choose next.
 *  - tracking: forward transitions only.
 *  - manual:   forward transitions, plus reverting to the previous step while the order is
 *              still before shipment. Locked orders allow nothing in either mode.
 */
export const getAllowedStatuses = (mode: StatusUpdateMode, { currentStatus, previousStatus }: WorkflowContext): string[] => {
  if (isLockedStatus(currentStatus)) return [];
  if (!isKnownStatus(currentStatus)) return [...START_STATUSES];

  const allowed = [...NEXT_STATUSES[currentStatus!]];

  // No "undo" around pre-order approval: undoing an approval would leave its reserved stock
  // behind, and the backend only lets a waiting pre-order be approved or cancelled
  // (409 PRE_ORDER_APPROVAL_REQUIRED otherwise).
  if (
    mode === 'manual' &&
    currentStatus !== 'PRE_ORDER_PENDING' &&
    !APPROVAL_ONLY_STATUSES.has(currentStatus!) &&
    !APPROVAL_ONLY_STATUSES.has(previousStatus ?? '') &&
    previousStatus && previousStatus !== currentStatus && !allowed.includes(previousStatus)) {
    const stage = getStage(currentStatus);
    const previousStage = getStage(previousStatus);
    if (stage && previousStage && CORRECTABLE_STAGES.has(stage) && CORRECTABLE_STAGES.has(previousStage) && !isLockedStatus(previousStatus)) {
      allowed.push(previousStatus);
    }
  }
  return allowed;
};

/** Whether `status` is the manual "undo last step" option rather than a forward move. */
export const isCorrection = (status: string, { currentStatus }: WorkflowContext): boolean =>
  isKnownStatus(currentStatus) && !NEXT_STATUSES[currentStatus!].includes(status);

/** Human-readable reason the order can no longer change status, or null if it can. */
export const getLockReason = (status: string | null | undefined): string | null => {
  if (status === 'CANCELLED') return 'This order is cancelled. Its status is final and can no longer be changed.';
  if (status === 'RETURN_COMPLETED') return 'The return for this order is completed. Its status is final and can no longer be changed.';
  return null;
};
