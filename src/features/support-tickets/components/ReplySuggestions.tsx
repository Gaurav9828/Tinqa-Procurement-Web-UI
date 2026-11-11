import React, { useState } from 'react';
import { ChevronDown, Lightbulb, PencilLine, Send, Sparkles } from 'lucide-react';
import type { AssistantResult, StatusSuggestion } from '../assistant/suggestReplies';

interface Props {
  result: AssistantResult;
  isBusy: boolean;
  onSend: (text: string) => void;
  onEdit: (text: string) => void;
  onSetStatus: (status: StatusSuggestion['status']) => Promise<void>;
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
 * click: "Send" sends the text as-is and "Edit" puts it in the reply box. The assistant never closes
 * a ticket: staff close it from the Status card, with a reason, 24 hours after a reply the customer
 * hasn't answered.
 */
export const ReplySuggestions: React.FC<Props> = ({ result, isBusy, onSend, onEdit, onSetStatus }) => {
  const [collapsed, setCollapsed] = useState(readCollapsed);

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
                onClick={() => onSetStatus(status.status)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {status.status === 'RESOLVED' ? 'Mark resolved' : 'Mark in progress'}
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
                    onClick={() => onSend(suggestion.text)}
                    aria-label={`Send: ${suggestion.label}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-3 h-3" />
                    Send
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
    </section>
  );
};
