import React from 'react';
import { Headset, Info, User } from 'lucide-react';
import type { TicketMessage } from '../types/supportTicket.types';
import { formatDateTime, sortMessages } from '../utils/supportTicket.utils';

/**
 * Conversation, oldest first. Customer messages sit on the left, support replies on the right,
 * system notes are centred. Message text is rendered as plain text by React (no HTML is ever
 * injected); whitespace and line breaks are preserved.
 */
export const TicketConversation: React.FC<{ messages: TicketMessage[] | null | undefined }> = ({ messages }) => {
  const sorted = sortMessages(messages);

  if (sorted.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-neutral-400">No messages yet.</p>;
  }

  return (
    <ol aria-label="Conversation" className="space-y-4">
      {sorted.map((msg) => {
        if (msg.authorType === 'SYSTEM') {
          return (
            <li key={msg.id} data-author="SYSTEM" className="flex justify-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-[11px] text-gray-500 dark:text-neutral-400 max-w-[90%]">
                <Info className="w-3 h-3 shrink-0" />
                <span className="whitespace-pre-wrap break-words">{msg.message}</span>
                <span aria-hidden>·</span>
                <time dateTime={msg.createdAt} className="whitespace-nowrap">
                  {formatDateTime(msg.createdAt)}
                </time>
              </div>
            </li>
          );
        }

        const isSupport = msg.authorType === 'SUPPORT';
        const Icon = isSupport ? Headset : User;
        const fallbackName = isSupport ? 'TinQa Support' : 'Customer';
        return (
          <li key={msg.id} data-author={isSupport ? 'SUPPORT' : 'CUSTOMER'} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] space-y-1 ${isSupport ? 'items-end text-right' : ''}`}>
              <div className={`flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-neutral-400 ${isSupport ? 'justify-end' : ''}`}>
                <Icon className="w-3 h-3" />
                <span className="font-semibold text-gray-700 dark:text-gray-200">{msg.authorName || fallbackName}</span>
                <span className="uppercase tracking-wider text-[9px]">{isSupport ? 'Support' : 'Customer'}</span>
                <span aria-hidden>·</span>
                <time dateTime={msg.createdAt}>{formatDateTime(msg.createdAt)}</time>
              </div>
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm text-left whitespace-pre-wrap break-words ${
                  isSupport
                    ? 'bg-[#0071e3] text-white rounded-tr-sm'
                    : 'bg-black/[0.05] dark:bg-white/[0.07] text-black dark:text-white rounded-tl-sm'
                }`}
              >
                {msg.message}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
