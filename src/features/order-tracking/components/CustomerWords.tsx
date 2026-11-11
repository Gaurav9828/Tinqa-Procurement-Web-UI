import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareQuote } from 'lucide-react';
import { ticketDetailPath } from '../../support-tickets/utils/supportTicket.utils';
import { formatUpdater } from '../utils/orderTracking.utils';

interface Props {
  /** The customer's own message, exactly as they wrote it in the ticket. */
  words: string | null | undefined;
  ticketReference?: string | null;
  staffNote?: string | null;
  /** Who asked for the return (Customer Support), with when. */
  requestedBy?: string | null;
  requestedAt?: React.ReactNode;
}

/**
 * Why the customer wants to return the order, in their own words (picked from their support ticket, never typed by
 * staff), with a link to that ticket, and Customer Support's internal note and name kept apart from it.
 */
export const CustomerWords: React.FC<Props> = ({ words, ticketReference, staffNote, requestedBy, requestedAt }) => (
  <div role="group" aria-label="Customer's reason" className="space-y-2 min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex flex-wrap items-center gap-1">
      <MessageSquareQuote className="w-3 h-3" aria-hidden /> Customer's reason — their own words
      {ticketReference && (
        <>
          <span className="normal-case tracking-normal">, from ticket</span>
          <Link
            to={ticketDetailPath(ticketReference)}
            className="normal-case tracking-normal font-mono text-[#0071e3] dark:text-blue-400 hover:underline"
          >
            {ticketReference}
          </Link>
        </>
      )}
    </p>
    <blockquote
      data-testid="customer-words"
      className="px-3 py-2 border-l-2 border-purple-400 bg-white/60 dark:bg-white/[0.03] rounded-r-lg text-black dark:text-white whitespace-pre-line break-words"
    >
      {words || <span className="text-gray-400">—</span>}
    </blockquote>
    {staffNote && (
      <p className="text-gray-600 dark:text-gray-300 break-words" data-testid="return-staff-note">
        <span className="font-semibold">Staff note (internal):</span> {staffNote}
      </p>
    )}
    {requestedBy !== undefined && (
      <p className="text-gray-500">
        Requested by {formatUpdater(requestedBy)}
        {requestedAt ? <> · {requestedAt}</> : null}
      </p>
    )}
  </div>
);
