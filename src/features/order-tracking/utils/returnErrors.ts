import { refundErrorMessage } from '../../refunds/utils/refund.utils';

/**
 * Friendly wording for the Ecommerce return and checkpoint error codes (ReturnService, CheckpointService,
 * OrderTrackingServiceImpl). These win over the server message because they also say what to do next.
 */
export const RETURN_ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "You don't have permission for this action.",
  RETURN_ENABLE_NOT_ALLOWED: 'A return can be requested only while the order is delivered. Showing its latest state.',
  RETURN_ALREADY_STARTED: 'The customer has already started this return. Showing its latest state.',
  RETURN_NOT_ENABLED: 'This order has no enabled return any more. Showing its latest state.',
  RETURN_ALREADY_ENABLED: 'This order already has an open return. A Store Manager can change its charge instead. Showing its latest state.',
  RETURN_NOT_REQUESTED: 'This return is not waiting for approval any more. Showing its latest state.',
  RETURN_CHARGE_IN_PROGRESS: "The customer is paying the return charge right now, so the return can't be withdrawn or its charge changed.",
  RETURN_NOT_IN_INSPECTION: 'The inspection can be recorded only while the order is in Return inspection. Showing its latest state.',
  RETURN_ALREADY_INSPECTED: 'Another admin has already recorded this inspection. Showing its latest state.',
  NOTHING_TO_REFUND: 'After the return charge nothing is left to refund, so Pass or Partial is not possible here.',
  RETURN_CHARGE_PAID: "The customer paid the return charge, so this return can't be rejected or cancelled; take it through pickup and inspection.",
  RETURN_SELF_APPROVAL: 'You raised this request, so another Store Manager must decide it.',
  RETURN_TICKET_CLOSED: "This support ticket is closed, so a return can't be requested from it. Ask the customer to raise a new ticket.",
  RETURN_TICKET_OTHER_ORDER: 'This support ticket is about another order. Request the return from the ticket raised for this order.',
  RETURN_INSPECTION_REQUIRED: 'Record a failed inspection with the Record inspection button in the Return section.',
  CHECKPOINT_NOT_ALLOWED: 'Checkpoints can be added only while the order is shipped or in transit, or while a return is on its way. Showing its latest state.',
  CHECKPOINT_LOCKED: 'This trip is over, so its checkpoints can no longer be changed.',
  CHECKPOINT_NOT_FOUND: 'This checkpoint was already removed. Showing the latest list.',
};

/** Action-specific wording → server message → code fallback → `fallback` (the refunds helper, with return codes). */
export const returnErrorMessage = (err: unknown, fallback: string): string => refundErrorMessage(err, fallback, RETURN_ERROR_MESSAGES);
