import React, { useState } from 'react';
import { Loader2, Lock, Send } from 'lucide-react';
import { REPLY_MAX_LENGTH } from '../types/supportTicket.types';
import type { ActionResult } from '../hooks/useTicketActions';

interface Props {
  canReply: boolean;
  isSending: boolean;
  disabled?: boolean;
  /** Controlled draft, so suggestions can be placed into the box for editing. */
  draft: string;
  onDraftChange: (value: string) => void;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  onSend: (message: string) => Promise<ActionResult>;
}

/** Support reply box. Ctrl/Cmd+Enter sends. The draft is kept if sending fails. */
export const ReplyComposer: React.FC<Props> = ({ canReply, isSending, disabled = false, draft, onDraftChange, textareaRef, onSend }) => {
  const [error, setError] = useState<string | null>(null);

  if (!canReply) {
    return (
      <div role="status" aria-label="Replies disabled" className="flex items-center gap-2 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-xs text-gray-500">
        <Lock className="w-3.5 h-3.5" /> This ticket is closed. It is read-only and can no longer receive replies.
      </div>
    );
  }

  const send = async () => {
    if (isSending || disabled) return;
    const result = await onSend(draft);
    setError(result.fieldErrors.message ?? null);
    if (result.ok) onDraftChange('');
  };

  const length = draft.trim().length;

  return (
    <form
      aria-label="Reply to customer"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="space-y-2"
    >
      <textarea
        ref={textareaRef}
        aria-label="Reply"
        aria-invalid={!!error}
        aria-describedby="reply-help"
        rows={4}
        maxLength={REPLY_MAX_LENGTH}
        value={draft}
        disabled={isSending || disabled}
        placeholder="Write a reply to the customer…"
        onChange={(e) => {
          onDraftChange(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          }
        }}
        className={`w-full px-3.5 py-3 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-y ${
          error ? 'border-red-500/80' : 'border-black/20 dark:border-white/20'
        }`}
      />
      <div className="flex items-center justify-between gap-3">
        <p id="reply-help" className={`text-[11px] ${error ? 'text-red-500' : 'text-gray-400'}`}>
          {error ?? 'Sending a reply sets the ticket to "Awaiting customer". Ctrl/⌘ + Enter to send.'}
        </p>
        <span className="text-[11px] text-gray-400 shrink-0">
          {length}/{REPLY_MAX_LENGTH}
        </span>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSending || disabled}
          className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isSending ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </form>
  );
};
