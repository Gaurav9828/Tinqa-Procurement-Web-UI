import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, EyeOff, Loader2, Mail, RefreshCw } from 'lucide-react';
import { useSupportTicket } from '../hooks/useSupportTicket';
import { useTicketActions } from '../hooks/useTicketActions';
import { TicketConversation } from '../components/TicketConversation';
import { ReplyComposer } from '../components/ReplyComposer';
import { TicketStatusControls } from '../components/TicketStatusControls';
import { TicketStatusBadge } from '../components/TicketStatusBadge';
import { TicketStateMessage } from '../components/TicketStateMessage';
import { ReplySuggestions } from '../components/ReplySuggestions';
import { suggestReplies } from '../assistant/suggestReplies';
import type { AdminSettableStatus } from '../types/supportTicket.types';
import {
  SUPPORT_TICKETS_PATH,
  activityTime,
  formatDateTime,
  formatIssueType,
  type TicketDetailLocationState,
} from '../utils/supportTicket.utils';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="mt-0.5 text-black dark:text-white break-words">{children}</dd>
  </div>
);

/** Ticket conversation page: /support-tickets/:referenceNumber */
export const SupportTicketDetailPage: React.FC = () => {
  const { referenceNumber = '' } = useParams<{ referenceNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromList = !!(location.state as TicketDetailLocationState | null)?.fromList;

  const { ticket, apply, isLoading, isRefreshing, errorKind, retry, refresh } = useSupportTicket(referenceNumber);
  // Successful actions return the updated detail, which is applied as-is (server values only).
  const actions = useTicketActions(referenceNumber, { onUpdated: apply, onStale: refresh });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [referenceNumber]);

  // Reply draft lives here so a suggestion can be placed into the box for editing.
  const [draft, setDraft] = useState('');
  const replyBox = useRef<HTMLTextAreaElement>(null);

  // Local assistant: recomputed from the server's latest ticket after every action.
  const suggestions = useMemo(() => (ticket ? suggestReplies(ticket) : null), [ticket]);

  const { reply, setStatus } = actions;
  const sendSuggestion = useCallback((text: string) => void reply(text), [reply]);
  const sendAndClose = useCallback(
    async (text: string) => {
      const sent = await reply(text);
      if (sent.ok) await setStatus('CLOSED');
    },
    [reply, setStatus]
  );
  const editSuggestion = useCallback((text: string) => {
    setDraft(text);
    requestAnimationFrame(() => replyBox.current?.focus());
  }, []);
  const applyStatus = useCallback(async (status: AdminSettableStatus) => void (await setStatus(status)), [setStatus]);

  // Back to the exact list view (filter/page in the URL, scroll restored by the list).
  const goBack = () => (cameFromList ? navigate(-1) : navigate(SUPPORT_TICKETS_PATH));

  return (
    <section aria-label={`Ticket ${referenceNumber}`} className="p-6 space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={goBack}
            className="mt-0.5 flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to tickets
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-black dark:text-white break-words flex items-center gap-2">
              {ticket?.subject ?? referenceNumber}
              {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-gray-400" aria-label="Refreshing ticket" />}
            </h1>
            {ticket && (
              <div className="flex flex-wrap items-center gap-2 mt-1 text-gray-500">
                <span className="font-mono">{ticket.referenceNumber}</span>
                <TicketStatusBadge status={ticket.status} />
                {ticket.unreadByCustomer && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#0071e3] dark:text-blue-400">
                    <EyeOff className="w-3 h-3" /> Unread by customer
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {ticket && (
          <button
            type="button"
            onClick={refresh}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="apple-card flex justify-center py-16 text-gray-400" role="status" aria-label="Loading ticket">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : errorKind || !ticket ? (
        <TicketStateMessage variant={errorKind ?? 'unknown'} onRetry={retry} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <div className="apple-card p-5 space-y-5">
              <h2 className="text-sm font-semibold text-black dark:text-white">Conversation</h2>
              <TicketConversation messages={ticket.messages} />
            </div>
            <div className="apple-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-black dark:text-white">Reply</h2>
              {suggestions && (
                <ReplySuggestions
                  result={suggestions}
                  referenceNumber={ticket.referenceNumber}
                  isBusy={actions.isBusy}
                  onSend={sendSuggestion}
                  onSendAndClose={sendAndClose}
                  onEdit={editSuggestion}
                  onSetStatus={applyStatus}
                />
              )}
              <ReplyComposer
                draft={draft}
                onDraftChange={setDraft}
                textareaRef={replyBox}
                canReply={ticket.canReply}
                isSending={actions.pending === 'reply'}
                disabled={actions.isBusy}
                onSend={actions.reply}
              />
            </div>
          </div>

          <div className="space-y-6 min-w-0 lg:sticky lg:top-20">
            <div className="apple-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-black dark:text-white">Ticket details</h2>
              <dl className="space-y-3">
                <Field label="Customer">
                  {ticket.customerEmail ? (
                    <a href={`mailto:${ticket.customerEmail}`} className="inline-flex items-center gap-1 text-[#0071e3] dark:text-blue-400 hover:underline">
                      <Mail className="w-3 h-3" /> {ticket.customerEmail}
                    </a>
                  ) : (
                    '—'
                  )}
                </Field>
                <Field label="Issue type">{formatIssueType(ticket.issueType)}</Field>
                <Field label="Product">
                  {ticket.productName ? `${ticket.productName}${ticket.productId ? ` (#${ticket.productId})` : ''}` : '—'}
                </Field>
                <Field label="Opened">{formatDateTime(ticket.createdAt)}</Field>
                <Field label="Last activity">{formatDateTime(activityTime(ticket))}</Field>
                {ticket.closedAt && <Field label="Closed">{formatDateTime(ticket.closedAt)}</Field>}
              </dl>
            </div>

            <div className="apple-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-black dark:text-white">Status</h2>
              <TicketStatusControls
                referenceNumber={ticket.referenceNumber}
                currentStatus={ticket.status}
                canClose={ticket.canClose}
                isUpdating={actions.pending === 'status'}
                disabled={actions.isBusy}
                onChange={actions.setStatus}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
