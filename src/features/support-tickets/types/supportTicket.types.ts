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
}

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
  total: number;
  paymentStatus: string;
  items: TicketOrderItem[];
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
}

/** Backend limit for a reply (trimmed). */
export const REPLY_MAX_LENGTH = 2000;
export const TICKETS_PAGE_SIZE = 20;
