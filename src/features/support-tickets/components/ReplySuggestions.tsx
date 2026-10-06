import React, { useState } from 'react';
import { ChevronDown, Lightbulb, PencilLine, Send, Sparkles, XCircle } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import type { AssistantResult, ReplySuggestion } from '../assistant/suggestReplies';
import type { AdminSettableStatus } from '../types/supportTicket.types';

interface Props {
  result: AssistantResult;
  referenceNumber: string;
  isBusy: boolean;
  onSend: (text: string) => void;
  onSendAndClose: (text: string) => Promise<void>;
  onEdit: (text: string) => void;
  onSetStatus: (status: AdminSettableStatus) => Promise<void>;
}

const COLLAPSE_KEY = 'tinqa.supportTickets.suggestionsCollapsed';
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Suggested replies and next status from the local assistant. Nothing is sent without an explicit
 * click: "Send" sends the text as-is, "Edit" puts it in the reply box, and anything that closes the
 * ticket asks for confirmation first.
 */
export const ReplySuggestions: React.FC<Props> = ({ result, referenceNumber, isBusy, onSend, onSendAndClose, onEdit, onSetStatus }) => {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [pendingClose, setPendingClose] = useState<{ text: string | null } | null>(null);

  const toggle = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      } catch {
        // per-viewer convenience only
      }
      return !value;
    });
  };

  const sendSuggestion = (suggestion: ReplySuggestion) => {
    if (suggestion.closesTicket) setPendingClose({ text: suggestion.text });
    else onSend(suggestion.text);
  };

  const status = result.statusSuggestion;

  return (
    <section aria-label="Reply suggestions" className="rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/[0.03] dark:bg-[#0071e3]/[0.06]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#0071e3] shrink-0" />
          <span className="text-xs font-semibold text-black dark:text-white">Suggested replies</span>
          <span className="text-[11px] text-gray-500 dark:text-neutral-400 truncate" data-testid="assistant-summary">
            {result.summary}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {status && (
            <div
              role="group"
              aria-label="Suggested next step"
              className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10"
            >
              <span className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  <strong>{status.label}</strong> <span className="text-gray-500">{status.reason}</span>
                </span>
              </span>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => (status.status === 'CLOSED' ? setPendingClose({ text: null }) : onSetStatus(status.status))}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {status.status === 'CLOSED' ? 'Close ticket' : status.status === 'RESOLVED' ? 'Mark resolved' : 'Mark in progress'}
              </button>
            </div>
          )}

          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {result.replies.map((suggestion) => (
              <li
                key={suggestion.id}
                data-suggestion={suggestion.id}
                className="flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10"
              >
                <span className="text-[11px] font-semibold text-[#0071e3] dark:text-blue-400">{suggestion.label}</span>
                {/* Plain text — rendered by React, never as HTML. */}
                <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words flex-1">{suggestion.text}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => sendSuggestion(suggestion)}
                    aria-label={`${suggestion.closesTicket ? 'Send & close' : 'Send'}: ${suggestion.label}`}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${
                      suggestion.closesTicket ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#0071e3] hover:bg-[#0077ed]'
                    }`}
                  >
                    {suggestion.closesTicket ? <XCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                    {suggestion.closesTicket ? 'Send & close' : 'Send'}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onEdit(suggestion.text)}
                    aria-label={`Edit: ${suggestion.label}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <PencilLine className="w-3 h-3" /> Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-[10px] text-gray-400">
            Suggestions are generated in your browser from the latest customer message. Review before sending.
          </p>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!pendingClose}
        actionType="CONFIRM"
        title={pendingClose?.text ? 'Send this reply and close the ticket?' : 'Close this ticket?'}
        description={`${pendingClose?.text ? 'The reply will be sent to the customer, then ' : ''}ticket ${referenceNumber} will be closed. Closed tickets are read-only.`}
        isSubmitting={isBusy}
        onClose={() => setPendingClose(null)}
        onConfirm={async () => {
          const text = pendingClose?.text;
          if (text) await onSendAndClose(text);
          else await onSetStatus('CLOSED');
          setPendingClose(null);
        }}
      />
    </section>
  );
};
