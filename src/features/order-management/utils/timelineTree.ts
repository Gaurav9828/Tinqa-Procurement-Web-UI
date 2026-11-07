import type { TimelineEvent } from '../types/orderTimeline.types';

export type TimelineNode =
  | { type: 'event'; event: TimelineEvent }
  | { type: 'branch'; branchId: string; title: string; kind: TimelineEvent['kind']; events: TimelineEvent[] };

/**
 * The order's main line with its branches: each payment, change request and return of failed pieces becomes one
 * branch, placed where its first step happened. Events keep the server's order (oldest first).
 */
export const buildTimelineTree = (events: readonly TimelineEvent[]): TimelineNode[] => {
  const nodes: TimelineNode[] = [];
  const branches = new Map<string, Extract<TimelineNode, { type: 'branch' }>>();
  for (const event of events) {
    if (!event.branchId) {
      nodes.push({ type: 'event', event });
      continue;
    }
    let branch = branches.get(event.branchId);
    if (!branch) {
      branch = { type: 'branch', branchId: event.branchId, title: event.branchTitle ?? event.title, kind: event.kind, events: [] };
      branches.set(event.branchId, branch);
      nodes.push(branch);
    }
    branch.events.push(event);
  }
  return nodes;
};

/** Where a branch stands: its last step's tone. */
export const branchTone = (events: readonly TimelineEvent[]): TimelineEvent['tone'] => events[events.length - 1]?.tone ?? 'INFO';
