import type { Permission } from '../../../config/access';
import type { OrderStatus } from '../../../types/common.types';
import type { OrdersApprovalRequest } from '../types/approval.types';

/** Procurement orders shown in the Requests tab, one queue per status that waits on staff. */
export type OrderApprovalType = 'ORDERS' | 'QUOTATIONS' | 'RETURNS';

export interface OrderQueue {
  /** The status the orders wait in (listed from GET /v1/orders/status/{status}). */
  status: OrderStatus;
  /** Needed to decide; the list also needs PROCUREMENT_ORDER_VIEW. */
  decidePermission: Permission;
  /** Where Approve and Reject move the order. Reject always needs a reason. */
  approveTo: OrderStatus;
  rejectTo: OrderStatus;
  /** Only these orders of the status wait on staff. */
  includes?: (order: OrdersApprovalRequest) => boolean;
  badge: string;
  /** The row in the Requests table. */
  describe: (order: OrdersApprovalRequest) => { title: string; subtitle: string };
  previewTitle: string;
  previewSubtitle: string;
  /** Button text for the two decisions. */
  approveAction: string;
  rejectAction: string;
  approveTitle: string;
  approveLabel: string;
  approveDescription: (orderNumber: string) => string;
  rejectTitle: string;
  rejectLabel: string;
}

export const ORDER_QUEUES: Record<OrderApprovalType, OrderQueue> = {
  QUOTATIONS: {
    status: 'QUOTATION',
    decidePermission: 'PROCUREMENT_ORDER_UPDATE_STATUS',
    approveTo: 'PENDING',
    rejectTo: 'CANCELLED',
    // Staff drafts aren't sent to anyone; a dealer's waiting change is decided in the Dealers tab first
    includes: (order) => !!order.raisedByDealer && !order.dealerChangePending,
    badge: 'Dealer Quotation',
    describe: (order) => ({
      title: `Quotation: ${order.orderNumber}`,
      subtitle: `From dealer ${order.dealerName} · ${order.itemName} · ${order.orderQuantity} ${order.unitType}`,
    }),
    previewTitle: 'Quotation from a Dealer',
    previewSubtitle: 'Review it, then submit it for Level 2 approval or cancel it',
    approveAction: 'Submit for approval',
    rejectAction: 'Cancel quotation',
    approveTitle: 'Submit quotation for approval',
    approveLabel: 'Yes, submit',
    approveDescription: (orderNumber) => `Quotation ${orderNumber} goes to a Level 2 approver. It can't be edited after this.`,
    rejectTitle: 'Cancel quotation',
    rejectLabel: 'Yes, cancel quotation',
  },
  ORDERS: {
    status: 'PENDING',
    decidePermission: 'PROCUREMENT_ORDER_APPROVE',
    approveTo: 'DEALER_LEVEL_PENDING',
    rejectTo: 'CANCELLED',
    badge: 'Order Approval',
    describe: (order) => ({ title: `Order: ${order.orderNumber}`, subtitle: `Dealer: ${order.dealerName}` }),
    previewTitle: 'Order Approval Details',
    previewSubtitle: 'Order approval request',
    approveAction: 'Approve',
    rejectAction: 'Reject',
    approveTitle: 'Approve order',
    approveLabel: 'Yes, approve',
    approveDescription: (orderNumber) => `Order ${orderNumber} is sent to the dealer to accept.`,
    rejectTitle: 'Reject order',
    rejectLabel: 'Yes, reject',
  },
  RETURNS: {
    status: 'RETURN_REQUESTED',
    decidePermission: 'PROCUREMENT_ORDER_APPROVE',
    approveTo: 'RETURN_APPROVED',
    rejectTo: 'RETURN_REJECTED',
    badge: 'Return Request',
    describe: (order) => ({ title: `Return: ${order.orderNumber}`, subtitle: `Dealer: ${order.dealerName} · ${order.itemName}` }),
    previewTitle: 'Return Request',
    previewSubtitle: 'Goods to send back to the dealer',
    approveAction: 'Approve return',
    rejectAction: 'Reject return',
    approveTitle: 'Approve return',
    approveLabel: 'Yes, approve return',
    approveDescription: (orderNumber) => `The return for order ${orderNumber} is approved and can be picked up.`,
    rejectTitle: 'Reject return',
    rejectLabel: 'Yes, reject return',
  },
};

export const ORDER_APPROVAL_TYPES = Object.keys(ORDER_QUEUES) as OrderApprovalType[];

export const isOrderApprovalType = (type: unknown): type is OrderApprovalType =>
  typeof type === 'string' && type in ORDER_QUEUES;

/** Decisions that need a reason, across every Requests queue. */
export const isRejectDecision = (decision: string | null | undefined): boolean =>
  decision === 'REJECTED' || decision === 'CANCELLED' || decision === 'RETURN_REJECTED';
