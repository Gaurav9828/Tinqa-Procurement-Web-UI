import React from 'react';
import { AlertTriangle, Inbox, Lock, RefreshCw, SearchX, ShieldAlert, WifiOff } from 'lucide-react';
import { isRetryableErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';
import type { TicketDetail } from '../types/supportTicket.types';
import { formatDateTime } from '../utils/supportTicket.utils';

type Variant = 'empty' | 'noResults' | ApiErrorKind;

const CONTENT: Record<Variant, { icon: React.ElementType; title: string; body: string }> = {
  empty: { icon: Inbox, title: 'No support tickets yet', body: 'Customer queries will appear here.' },
  noResults: { icon: SearchX, title: 'No tickets with this status', body: 'Try another status filter.' },
  forbidden: {
    icon: ShieldAlert,
    title: 'Permission denied',
    body: 'Your account is not allowed to view support tickets. Ask an administrator if you need access.',
  },
  notFound: { icon: SearchX, title: 'Ticket not found', body: 'This ticket does not exist or the reference number is incorrect.' },
  unsupported: {
    icon: AlertTriangle,
    title: 'Action not supported',
    body: "The server doesn't support this request. Refresh the page; if it keeps happening, contact support.",
  },
  conflict: { icon: AlertTriangle, title: 'Ticket changed', body: 'This ticket was updated elsewhere. Refresh to see its latest state.' },
  validation: { icon: AlertTriangle, title: 'Request rejected', body: 'The server rejected the request. Check the alert for details.' },
  rateLimited: { icon: AlertTriangle, title: 'Too many requests', body: 'Please wait a moment and try again.' },
  server: { icon: AlertTriangle, title: 'Something went wrong', body: 'The server could not complete the request. Please try again.' },
  network: { icon: WifiOff, title: 'Unable to reach the server', body: 'Check your connection and try again.' },
  unknown: { icon: AlertTriangle, title: 'Something went wrong', body: 'The request failed. Please try again.' },
};

/** Empty / error states for the support ticket pages. */
export const TicketStateMessage: React.FC<{ variant: Variant; onRetry?: () => void }> = ({ variant, onRetry }) => {
  const { icon: Icon, title, body } = CONTENT[variant];
  const isInfo = variant === 'empty' || variant === 'noResults';
  const canRetry = !!onRetry && !isInfo && isRetryableErrorKind(variant);

  return (
    <div role={isInfo ? 'status' : 'alert'} className="apple-card p-12 flex flex-col items-center text-center gap-2 text-gray-500 dark:text-neutral-400">
      <Icon className="w-8 h-8 text-gray-400" />
      <h3 className="text-sm font-semibold text-black dark:text-white">{title}</h3>
      <p className="text-xs max-w-md">{body}</p>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
};

const closedByText = (ticket: Pick<TicketDetail, 'closedByType' | 'closedBy'>): string => {
  if (ticket.closedByType === 'CUSTOMER') return 'the customer';
  if (ticket.closedByType === 'SYSTEM') return 'TinQa automatically';
  if (ticket.closedByType === 'SUPPORT') return ticket.closedBy || 'TinQa Support';
  return ticket.closedBy || 'TinQa Support';
};

/**
 * Who closed a ticket, when and why: staff close with a reason; tickets raised for a return close automatically when
 * the return completes. Renders nothing while the ticket is open.
 */
export const TicketClosedNote: React.FC<{ ticket: Pick<TicketDetail, 'status' | 'closedAt' | 'closedByType' | 'closedBy' | 'closeReason'> }> = ({ ticket }) => {
  if (ticket.status !== 'CLOSED') return null;
  return (
    <div role="note" aria-label="Ticket closed" className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] space-y-1 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-black dark:text-white">
        <Lock className="w-3.5 h-3.5" /> Closed {ticket.closedAt ? `${formatDateTime(ticket.closedAt)} ` : ''}by {closedByText(ticket)}
      </p>
      <p className="text-gray-600 dark:text-gray-300 break-words whitespace-pre-line" data-testid="ticket-close-reason">
        Reason: {ticket.closeReason || '—'}
      </p>
    </div>
  );
};
