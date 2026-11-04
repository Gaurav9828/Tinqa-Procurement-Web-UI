import { at, type TimeBlock } from '../../client-demos/utils/timeBlocks';
import type { BusySlot } from '../types/meeting.types';
import { formatSpan, localParts } from './meeting';

const localAt = (iso: string) => {
  const { date, time } = localParts(iso);
  return at(date, time);
};

/** Busy people as the clock's taken time: one block per other meeting, naming who is in it ("You, Ravi Kumar · MTG-2026-0003"). */
export const busyBlocks = (slots: BusySlot[]): TimeBlock[] => {
  const byMeeting = new Map<number, BusySlot[]>();
  slots.forEach((slot) => byMeeting.set(slot.meetingId, [...(byMeeting.get(slot.meetingId) ?? []), slot]));
  return [...byMeeting.values()].map((people) => ({
    key: `meeting-${people[0].meetingId}`,
    kind: 'busy',
    from: localAt(people[0].startsAt),
    to: localAt(people[0].endsAt),
    label: `${people.map((slot) => (slot.self ? 'You' : slot.name)).join(', ')} · ${people[0].code}`,
  }));
};

/** Those already in another meeting at some point from `startsAt` to `endsAt` (ISO); none until both are known. */
export const busyDuring = (slots: BusySlot[], startsAt: string, endsAt: string): BusySlot[] => {
  const from = Date.parse(startsAt);
  const to = Date.parse(endsAt);
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return [];
  return slots.filter((slot) => Date.parse(slot.startsAt) < to && from < Date.parse(slot.endsAt));
};

/** "Ravi Kumar is already in MTG-2026-0003 (Wed, 4 Nov 2026, 10:00 am – 11:00 am)" */
export const busyMessage = (slot: BusySlot): string => {
  const who = slot.self ? 'You are' : `${slot.name} is`;
  return `${who} already in ${slot.code} (${formatSpan(slot.startsAt, slot.endsAt)})`;
};
