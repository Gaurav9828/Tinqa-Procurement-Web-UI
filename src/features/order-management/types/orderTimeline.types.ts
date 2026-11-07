/**
 * An order's flow history (GET /v1/orders/{id}/timeline, and the supplier's GET /v1/supplier-portal/orders/{id}/timeline):
 * every step of the quotation, the order, its change requests, its payments (and repayments) and its returns of failed
 * pieces, oldest first. Events with no branch are
 * the order's main line; each payment, change request and return is a branch drawn from where it started. The supplier's view
 * has roles but no staff names. See docs/payment-requests-and-flow-history.md § 4.
 */
/** RETURN: a return of failed pieces, one branch per return ("return-{id}"); see docs/supplier-returns-and-repayments.md § 7. */
export type TimelineKind = 'STATUS' | 'CHANGE_REQUEST' | 'PAYMENT' | 'INVOICE' | 'REFUND_CLAIM' | 'RETURN';
export type TimelineTone = 'DONE' | 'WAITING' | 'REJECTED' | 'INFO';

export interface TimelineEvent {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  detail: string | null;
  actorRole: string | null;
  actorName: string | null;
  tone: TimelineTone;
  branchId: string | null;
  branchTitle: string | null;
}

export interface OrderTimeline {
  orderId: number;
  orderNumber: string;
  events: TimelineEvent[];
}
