import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LifeBuoy, RefreshCw } from 'lucide-react';
import { useSupportTickets } from '../hooks/useSupportTickets';
import { TicketList } from '../components/TicketList';
import { TicketStateMessage } from '../components/TicketStateMessage';
import { TICKET_STATUSES, type TicketSummary } from '../types/supportTicket.types';
import { formatEnumLabel, ticketDetailPath, type TicketDetailLocationState } from '../utils/supportTicket.utils';
import { clearListPosition, peekListPosition, saveListPosition } from '../../../utils/listReturnPosition';

const LIST_KEY = 'supportTickets';
const HIGHLIGHT_MS = 2500;

/** Support ticket list: /support-tickets. Opening a ticket navigates to its own page. */
export const SupportTicketsPage: React.FC = () => {
  const list = useSupportTickets();
  const navigate = useNavigate();
  const location = useLocation();

  // Where the admin was when they opened a ticket from this exact list view.
  const [returnPosition] = useState(() => peekListPosition(LIST_KEY, location.search));
  const [highlighted, setHighlighted] = useState<string | null>(returnPosition?.itemId ?? null);
  const restored = useRef(false);

  useLayoutEffect(() => {
    if (restored.current || !returnPosition || !list.hasLoaded) return;
    restored.current = true;
    window.scrollTo(0, returnPosition.scrollY);
    clearListPosition(LIST_KEY);
  }, [returnPosition, list.hasLoaded]);

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const openTicket = (ticket: TicketSummary) => {
    saveListPosition(LIST_KEY, location.search, ticket.referenceNumber);
    const state: TicketDetailLocationState = { fromList: true };
    navigate(ticketDetailPath(ticket.referenceNumber), { state });
  };

  const renderList = () => {
    if (!list.hasLoaded) {
      if (list.isLoading) {
        return (
          <div role="status" className="apple-card p-12 text-center text-xs text-gray-500 dark:text-neutral-400">
            Loading support tickets...
          </div>
        );
      }
      if (list.errorKind) return <TicketStateMessage variant={list.errorKind} onRetry={list.refetch} />;
    }
    if (list.errorKind && list.tickets.length === 0) {
      return <TicketStateMessage variant={list.errorKind} onRetry={list.refetch} />;
    }
    if (list.tickets.length === 0) return <TicketStateMessage variant={list.status ? 'noResults' : 'empty'} />;

    return (
      <>
        <TicketList tickets={list.tickets} isLoading={list.isLoading} highlightedReference={highlighted} onOpen={openTicket} />
        {list.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between pt-3 text-xs text-gray-500">
            <span>
              Page {list.page + 1} of {list.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={list.page === 0 || list.isLoading}
                onClick={() => list.setPage(list.page - 1)}
                className="flex items-center gap-1 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={list.page + 1 >= list.totalPages || list.isLoading}
                onClick={() => list.setPage(list.page + 1)}
                className="flex items-center gap-1 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </nav>
        )}
      </>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[#0071e3]" /> Support Tickets
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Customer queries, newest activity first{list.hasLoaded ? ` (${list.totalElements} tickets)` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            aria-label="Filter by status"
            value={list.status}
            onChange={(e) => list.setStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] focus:outline-none focus:ring-2 focus:ring-[#0071e3] cursor-pointer"
          >
            <option value="">All statuses</option>
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatEnumLabel(status)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => list.refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${list.isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {renderList()}
    </div>
  );
};
