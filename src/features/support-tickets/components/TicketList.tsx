import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, EyeOff, Package } from 'lucide-react';
import type { TicketSummary } from '../types/supportTicket.types';
import { TicketStatusBadge } from './TicketStatusBadge';
import { activityTime, formatDateTime, formatIssueType, ticketDetailPath } from '../utils/supportTicket.utils';

interface Props {
  tickets: TicketSummary[];
  isLoading?: boolean;
  highlightedReference?: string | null;
  onOpen: (ticket: TicketSummary) => void;
}

const isPlainLeftClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

const UnreadBadge: React.FC = () => (
  <span
    title="The customer hasn't seen the latest support activity yet"
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 whitespace-nowrap"
  >
    <EyeOff className="w-3 h-3" /> Unread by customer
  </span>
);

/**
 * Ticket list. The whole row opens the ticket; the subject is a real link
 * (keyboard focus, open in new tab). All text is rendered as plain text.
 */
export const TicketList: React.FC<Props> = ({ tickets, isLoading = false, highlightedReference, onOpen }) => {
  const linkClick = (ticket: TicketSummary) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlainLeftClick(e)) return;
    e.preventDefault();
    onOpen(ticket);
  };

  return (
    <ul
      aria-label="Support tickets"
      aria-busy={isLoading}
      className={`apple-card divide-y divide-black/10 dark:divide-white/10 overflow-hidden text-xs transition-opacity ${isLoading ? 'opacity-60' : ''}`}
    >
      {tickets.map((ticket) => {
        const highlighted = ticket.referenceNumber === highlightedReference;
        return (
          <li
            key={ticket.referenceNumber}
            data-reference={ticket.referenceNumber}
            data-highlighted={highlighted || undefined}
            data-unread={ticket.unreadByCustomer || undefined}
            onClick={() => onOpen(ticket)}
            className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${
              highlighted ? 'bg-[#0071e3]/10' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
            }`}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={ticketDetailPath(ticket.referenceNumber)}
                  onClick={linkClick(ticket)}
                  className="text-sm font-semibold text-black dark:text-white hover:underline truncate max-w-full"
                >
                  {ticket.subject}
                </Link>
                <TicketStatusBadge status={ticket.status} />
                {ticket.unreadByCustomer && <UnreadBadge />}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-neutral-400">
                <span className="font-mono">{ticket.referenceNumber}</span>
                <span>{formatIssueType(ticket.issueType)}</span>
                {ticket.productName && (
                  <span className="inline-flex items-center gap-1">
                    <Package className="w-3 h-3" /> {ticket.productName}
                  </span>
                )}
              </div>
              {ticket.lastMessagePreview && (
                <p className="text-gray-600 dark:text-gray-300 line-clamp-1 break-words" data-testid="preview">
                  {ticket.lastMessagePreview}
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2 text-right">
              <time dateTime={activityTime(ticket)} className="text-[11px] text-gray-500 dark:text-neutral-400 whitespace-nowrap">
                {formatDateTime(activityTime(ticket))}
              </time>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
