import type { OrderReturnInfo } from '../../order-tracking/types/orderTracking.types';

// Mirrors the Ecommerce BE support DTOs (com.tinqa.ecommerce.dto.support.*).
// LocalDateTime fields arrive as ISO strings without a zone. The detail DTO omits null
// fields entirely (@JsonInclude NON_NULL), so optional fields may be missing, not just null.

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** The only statuses an admin may set (PATCH …/status). */
export const ADMIN_SETTABLE_STATUSES = ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type AdminSettableStatus = (typeof ADMIN_SETTABLE_STATUSES)[number];

export type TicketIssueType = 'TECHNICAL_SUPPORT' | 'ORDER_SHIPPING' | 'WARRANTY_CLAIM' | 'COMPLAINT' | 'OTHER';

export type TicketAuthorType = 'CUSTOMER' | 'SUPPORT' | 'SYSTEM';

/** SupportTicketSummaryDTO */
export interface TicketSummary {
  id: number;
  referenceNumber: string;
  subject: string;
  /** Kept as string so an unknown future value still renders. */
  issueType: TicketIssueType | string;
  productId?: number | null;
  productName?: string | null;
  /**
   * Order the ticket was raised about — a snapshot kept even if the order is later deleted.
   * Null/absent for tickets not linked to an order (and legacy tickets).
   */
  orderNumber?: string | null;
  status: TicketStatus | string;
  /** The customer has not yet seen the latest support activity. */
  unreadByCustomer: boolean;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  closedAt?: string | null;
  /** TinQa Support's latest reply the customer hasn't answered yet; null when the customer wrote last. */
  awaitingCustomerSince?: string | null;
  /** Why the ticket was closed (staff give a reason; automatic closes say why). */
  closeReason?: string | null;
  /** Who closed it: the customer, a staff member, or TinQa itself (e.g. when the return it was raised for completed). */
  closedByType?: TicketClosedByType | null;
}

export type TicketClosedByType = 'CUSTOMER' | 'SUPPORT' | 'SYSTEM';

/** SupportTicketMessageDTO — no author ids, IPs or user agents are exposed. */
export interface TicketMessage {
  id: number;
  authorType: TicketAuthorType | string;
  authorName?: string | null;
  /** Plain text. Always rendered as text, never as HTML. */
  message: string;
  createdAt: string;
}

/** SupportTicketOrderDTO.Item */
export interface TicketOrderItem {
  productId: number;
  title: string;
  quantity: number;
}

/**
 * SupportTicketOrderDTO — summary of the linked order (admin detail only). Not a tracking
 * timeline: use the admin order detail page for history.
 */
export interface TicketOrderContext {
  status: string;
  /** What the customer paid in all: the order amount plus shipping. */
  total: number;
  /** The items' total; shipping is never part of the order amount. Absent from older responses. */
  orderAmount?: number | null;
  shippingFee?: number | null;
  paymentStatus: string;
  items: TicketOrderItem[];
  /** The order's return (request, enabled option or started return), so support can act on it from the chat. */
  returnInfo?: OrderReturnInfo | null;
}

/** SupportTicketDetailDTO */
export interface TicketDetail extends TicketSummary {
  customerEmail?: string | null;
  /** Present only while the linked order still exists; absent for deleted orders and legacy tickets. */
  order?: TicketOrderContext | null;
  /** Oldest first. */
  messages?: TicketMessage[] | null;
  canReply: boolean;
  canClose: boolean;
  /**
   * When staff may close the ticket: 24 hours after our latest reply if the customer hasn't answered it. Null while
   * the customer is waiting for our reply, or once the ticket is closed.
   */
  closableAt?: string | null;
  /** Staff email of whoever closed it (closedByType SUPPORT). */
  closedBy?: string | null;
}

/** Staff close a ticket only with a reason (Ecommerce limits). */
export const CLOSE_REASON_MIN_LENGTH = 5;
export const CLOSE_REASON_MAX_LENGTH = 500;

/** Backend limit for a reply (trimmed). */
export const REPLY_MAX_LENGTH = 2000;
export const TICKETS_PAGE_SIZE = 20;
