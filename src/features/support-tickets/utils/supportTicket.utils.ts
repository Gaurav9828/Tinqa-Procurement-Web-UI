import type { TicketMessage, TicketSummary } from '../types/supportTicket.types';

export const SUPPORT_TICKETS_PATH = '/support-tickets';

export const ticketDetailPath = (referenceNumber: string) => `${SUPPORT_TICKETS_PATH}/${encodeURIComponent(referenceNumber)}`;

/** Navigation state set by the list when it opens a ticket, so Back can return to it exactly. */
export interface TicketDetailLocationState {
  fromList?: boolean;
}

/** "AWAITING_CUSTOMER" → "Awaiting Customer" */
export const formatEnumLabel = (value: string | null | undefined): string =>
  (value || 'UNKNOWN')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const ISSUE_TYPE_LABELS: Record<string, string> = {
  TECHNICAL_SUPPORT: 'Technical support',
  ORDER_SHIPPING: 'Order & shipping',
  WARRANTY_CLAIM: 'Warranty claim',
  COMPLAINT: 'Complaint',
  OTHER: 'Other',
};

export const formatIssueType = (issueType: string | null | undefined) =>
  (issueType && ISSUE_TYPE_LABELS[issueType]) || formatEnumLabel(issueType);

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** Latest activity time for a ticket. */
export const activityTime = (ticket: Pick<TicketSummary, 'lastMessageAt' | 'updatedAt' | 'createdAt'>) =>
  ticket.lastMessageAt ?? ticket.updatedAt ?? ticket.createdAt;

const toTime = (iso: string) => {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/** Oldest first (the API already orders them; this guards against any reordering). */
export const sortMessages = (messages: TicketMessage[] | null | undefined): TicketMessage[] =>
  [...(messages ?? [])].sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt) || a.id - b.id);
