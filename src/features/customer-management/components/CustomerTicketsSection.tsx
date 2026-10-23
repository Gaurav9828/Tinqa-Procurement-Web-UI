import React from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import type { TicketSummary } from '../../support-tickets/types/supportTicket.types';
import { TicketStatusBadge } from '../../support-tickets/components/TicketStatusBadge';
import { formatDateTime, ticketDetailPath } from '../../support-tickets/utils/supportTicket.utils';
import { SectionState } from './SectionState';
import type { ApiErrorKind } from '../../../utils/apiErrorKind';

/** The customer's latest support tickets; each opens in Support Tickets for staff who handle them. */
export const CustomerTicketsSection: React.FC<{
  tickets: TicketSummary[];
  total: number;
  isLoading: boolean;
  errorKind: ApiErrorKind | null;
  canOpenTicket: boolean;
  onRetry: () => void;
}> = ({ tickets, total, isLoading, errorKind, canOpenTicket, onRetry }) => (
  <section aria-label="Support tickets" className="apple-card overflow-hidden">
    <header className="px-5 py-3 border-b border-black/10 dark:border-white/10">
      <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
        <LifeBuoy className="w-4 h-4 text-[#0071e3]" /> Support tickets
        {total > tickets.length && <span className="text-gray-500 font-normal">(latest {tickets.length} of {total})</span>}
      </h2>
    </header>
    {tickets.length === 0 ? (
      <SectionState isLoading={isLoading} errorKind={errorKind} empty="No tickets." onRetry={onRetry} />
    ) : (
      <ul className="divide-y divide-black/10 dark:divide-white/10 text-xs">
        {tickets.map((ticket) => (
          <li key={ticket.referenceNumber} className="p-4 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {canOpenTicket ? (
                <Link to={ticketDetailPath(ticket.referenceNumber)} className="font-semibold text-[#0071e3] hover:underline">
                  {ticket.subject}
                </Link>
              ) : (
                <span className="font-semibold text-black dark:text-white">{ticket.subject}</span>
              )}
              <TicketStatusBadge status={ticket.status} />
            </div>
            <p className="text-[11px] text-gray-500">
              <span className="font-mono">{ticket.referenceNumber}</span> · {formatDateTime(ticket.createdAt)}
              {ticket.orderNumber && ` · Order #${ticket.orderNumber}`}
            </p>
          </li>
        ))}
      </ul>
    )}
  </section>
);
