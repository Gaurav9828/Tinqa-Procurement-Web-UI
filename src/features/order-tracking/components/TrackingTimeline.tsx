import React from 'react';
import type { OrderTrackingEntry } from '../types/orderTracking.types';
import { TrackingStatusBadge } from './TrackingStatusBadge';
import { formatDateTime, formatUpdater, getCurrentEntry, sortTimeline } from '../utils/orderTracking.utils';

interface Props {
  entries: OrderTrackingEntry[];
}

/** Vertical history, oldest first; the current entry is highlighted and labelled. */
export const TrackingTimeline: React.FC<Props> = ({ entries }) => {
  const sorted = sortTimeline(entries);
  const current = getCurrentEntry(sorted);

  if (sorted.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-neutral-400">No tracking history recorded yet.</p>;
  }

  return (
    <ol aria-label="Tracking history" className="relative border-l border-black/10 dark:border-white/10 ml-2 space-y-5">
      {sorted.map((entry) => {
        const isCurrent = entry.id === current?.id;
        return (
          <li key={entry.id} data-current={isCurrent} className="ml-5">
            <span
              className={`absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#161617] ${
                isCurrent ? 'bg-[#0071e3] ring-4 ring-[#0071e3]/20' : 'bg-gray-300 dark:bg-neutral-600'
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <TrackingStatusBadge status={entry.status} />
              {isCurrent && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071e3]">Current</span>
              )}
              {entry.stage && entry.stage !== entry.status && <span className="text-[10px] text-gray-400 uppercase">{entry.stage}</span>}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-neutral-400 mt-1">
              <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
              {' · by '}
              <span className={entry.updatedBy ? 'font-medium text-gray-700 dark:text-gray-300' : 'italic'}>
                {formatUpdater(entry.updatedBy)}
              </span>
            </p>
            {entry.notes && (
              <p className="mt-1.5 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line">{entry.notes}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
};
