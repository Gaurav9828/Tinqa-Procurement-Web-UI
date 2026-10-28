import React from 'react';
import { History } from 'lucide-react';
import type { DemoEvent } from '../types/clientDemo.types';
import { EVENT_LABELS, formatDateTime } from '../utils/clientDemo';

const TONE: Partial<Record<DemoEvent['type'], string>> = {
  QUOTATION_APPROVED: 'bg-emerald-500',
  COMPLETION_APPROVED: 'bg-emerald-500',
  QUOTATION_REJECTED: 'bg-rose-500',
  COMPLETION_REJECTED: 'bg-rose-500',
  CANCELLED: 'bg-rose-500',
  REOPENED: 'bg-purple-500',
  QUOTATION_SUBMITTED: 'bg-amber-500',
  COMPLETION_SUBMITTED: 'bg-amber-500',
};

/** Everything that happened to the demo, newest first, with the reasons given. */
export const DemoTimeline: React.FC<{ events: DemoEvent[] }> = ({ events }) => (
  <section aria-label="Timeline" className="apple-card p-5 space-y-3 text-xs">
    <h2 className="text-sm font-semibold flex items-center gap-2">
      <History className="w-4 h-4 text-[#0071e3]" /> Timeline
    </h2>
    {events.length === 0 ? (
      <p className="text-gray-500">Nothing yet.</p>
    ) : (
      <ol className="space-y-3">
        {[...events].reverse().map((event, index) => (
          <li key={`${event.at}-${index}`} className="flex gap-3">
            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${TONE[event.type] ?? 'bg-gray-400'}`} aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {EVENT_LABELS[event.type]}
                <span className="font-normal text-gray-400"> · {event.actorName ?? 'Someone'} · {formatDateTime(event.at)}</span>
              </p>
              {event.detail && <p className="text-gray-600 dark:text-gray-400 break-words">{event.detail}</p>}
              {event.reason && <p className="text-gray-500 italic break-words">Reason: {event.reason}</p>}
            </div>
          </li>
        ))}
      </ol>
    )}
  </section>
);
