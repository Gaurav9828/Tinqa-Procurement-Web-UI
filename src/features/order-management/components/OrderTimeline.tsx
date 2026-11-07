import React, { useState } from 'react';
import { ChevronDown, ChevronRight, GitBranch, Loader2, PackageX } from 'lucide-react';
import { useOrderTimeline } from '../hooks/useOrderTimeline';
import { branchTone, buildTimelineTree } from '../utils/timelineTree';
import type { TimelineEvent, TimelineTone } from '../types/orderTimeline.types';

const DOT: Record<TimelineTone, string> = {
  DONE: 'bg-emerald-500',
  WAITING: 'bg-amber-500',
  REJECTED: 'bg-rose-500',
  INFO: 'bg-gray-400',
};

const TONE_LABEL: Record<TimelineTone, string> = {
  DONE: 'Done',
  WAITING: 'Waiting',
  REJECTED: 'Rejected',
  INFO: 'Note',
};

const who = (event: TimelineEvent) => [event.actorName, event.actorRole].filter(Boolean).join(', ');

const Step: React.FC<{ event: TimelineEvent }> = ({ event }) => (
  <li className="relative" data-testid={`timeline-${event.id}`}>
    <span aria-label={TONE_LABEL[event.tone]} role="img" className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-neutral-900 ${DOT[event.tone]}`} />
    <p className="font-medium text-black dark:text-white">{event.title}</p>
    <p className="text-[10px] text-gray-400">
      {new Date(event.at).toLocaleString()}
      {who(event) && ` · ${who(event)}`}
    </p>
    {event.detail && <p className="text-gray-600 dark:text-gray-300">{event.detail}</p>}
  </li>
);

const Branch: React.FC<{ title: string; kind: TimelineEvent['kind']; events: TimelineEvent[]; branchId: string }> = ({ title, kind, events, branchId }) => {
  const [open, setOpen] = useState(true);
  const tone = branchTone(events);
  // A return of failed pieces reads apart from the payment and change-request branches
  const Icon = kind === 'RETURN' ? PackageX : GitBranch;
  return (
    <li className="relative" data-testid={`timeline-branch-${branchId}`}>
      <span aria-hidden className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-sm ring-2 ring-white dark:ring-neutral-900 ${DOT[tone]}`} />
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 font-medium text-black dark:text-white cursor-pointer">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Icon aria-hidden className={`w-3 h-3 ${kind === 'RETURN' ? 'text-rose-500' : 'text-[#0071e3]'}`} /> {title}
        <span className="text-[10px] font-normal text-gray-400">({TONE_LABEL[tone].toLowerCase()})</span>
      </button>
      {open && (
        <ol aria-label={title} className="mt-1 ml-1 pl-4 border-l border-dashed border-[#0071e3]/40 space-y-2">
          {events.map((event) => (
            <Step key={event.id} event={event} />
          ))}
        </ol>
      )}
    </li>
  );
};

interface Props {
  orderId: number;
  view?: 'staff' | 'supplier';
  /** Open from the start (e.g. inside a review where the history is the point) */
  defaultOpen?: boolean;
  /** Bump to reload after a change shown next to it */
  round?: number;
}

/**
 * The order's flow history as a tree: the main line (quotation submitted, approved by the Supplier Manager, approved
 * by the Super Admin, accepted by the supplier, shipped, delivered...) with a branch per payment (with its repayment
 * steps), per change request and per return of failed pieces. Loads only once opened. The supplier sees roles, never staff names.
 */
export const OrderTimeline: React.FC<Props> = ({ orderId, view = 'staff', defaultOpen = false, round = 0 }) => {
  const [open, setOpen] = useState(defaultOpen);
  const { timeline, loading } = useOrderTimeline(orderId, open, view, round);
  const nodes = timeline ? buildTimelineTree(timeline.events) : [];
  return (
    <section aria-label="Flow history" className="p-3 border border-black/10 dark:border-white/10 rounded-xl text-xs space-y-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 font-medium text-gray-500 cursor-pointer">
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} Flow history
      </button>
      {open && loading && (
        <p role="status" className="flex items-center gap-1.5 text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading history…
        </p>
      )}
      {open && !loading && nodes.length === 0 && <p className="text-gray-400 italic">No history yet.</p>}
      {open && nodes.length > 0 && (
        <ol aria-label="Order flow" className="ml-1.5 pl-4 border-l-2 border-black/10 dark:border-white/10 space-y-2">
          {nodes.map((node) =>
            node.type === 'event'
              ? <Step key={node.event.id} event={node.event} />
              : <Branch key={node.branchId} branchId={node.branchId} title={node.title} kind={node.kind} events={node.events} />,
          )}
        </ol>
      )}
    </section>
  );
};
