import type { DemoDetail } from '../types/clientDemo.types';
import { addDays, dayDate, daysBetween, formatDayTime, hhmm } from './clientDemo';

/**
 * Time the trip's staff already spend on something, from one moment to another ("2030-05-10T18:00"). Visits and journeys
 * are what the staff are doing (`busy`): two of them can't overlap, as no one is at a client while on the road. A night
 * stay only books the hotel, so the staff go out to clients and travel from it; it can't overlap another stay.
 */
export interface TimeBlock {
  /** Whose time it is, so a visit or bill never blocks itself: `client-<key>`, `bill-<key>`, `visit-<id>` or `expense-<id>`. */
  key: string;
  kind: 'busy' | 'stay';
  from: string;
  to: string;
  label: string;
}

export const at = (date: string, time: string): string => `${date}T${time}`;

/** The date of a plan's day; a trip without a start date yet still keeps its days apart. */
export const planDayDate = (startDate: string, day: number): string => dayDate(startDate || '1970-01-01', day);

const journeyLabel = (from: string | null, to: string | null) =>
  from?.trim() && to?.trim() ? `Travel ${from.trim()} → ${to.trim()}` : 'Travel';
const stayLabel = (hotel: string | null) => (hotel?.trim() ? `Night stay at ${hotel.trim()}` : 'Night stay');

interface Timed {
  kind: string;
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  fromPlace: string | null;
  toPlace: string | null;
  vendorName: string | null;
}

// A journey's or stay's block, when both its dates and times are given
const billBlock = (key: string, bill: Timed): TimeBlock[] => {
  if ((bill.kind !== 'TRAVEL' && bill.kind !== 'STAY') || !bill.startDate || !bill.startTime || !bill.endDate || !bill.endTime) return [];
  const from = at(bill.startDate, hhmm(bill.startTime));
  const to = at(bill.endDate, hhmm(bill.endTime));
  if (to <= from) return [];
  const travel = bill.kind === 'TRAVEL';
  return [{ key, kind: travel ? 'busy' : 'stay', from, to, label: travel ? journeyLabel(bill.fromPlace, bill.toPlace) : stayLabel(bill.vendorName) }];
};

interface PlanLike {
  startDate: string;
  clients: { key: number; clientName: string; dayNumber: string; startTime: string; endTime: string }[];
  bills: { key: number; slot: string; startDate: string; startTime: string; endDate: string; endTime: string; fromPlace: string; toPlace: string; vendorName: string }[];
}

/** Every visit, journey and stay of the plan being written, with its time. */
export const planBlocks = (form: PlanLike): TimeBlock[] => [
  ...form.clients.flatMap((client): TimeBlock[] => {
    if (!client.dayNumber || !client.startTime || !client.endTime || client.endTime <= client.startTime) return [];
    const date = planDayDate(form.startDate, Number(client.dayNumber));
    return [{ key: `client-${client.key}`, kind: 'busy', from: at(date, client.startTime), to: at(date, client.endTime),
      label: `Visit to ${client.clientName.trim() || 'a client'}` }];
  }),
  ...form.bills.flatMap((bill) => billBlock(`bill-${bill.key}`, { ...bill, kind: bill.slot })),
];

/** Every visit, journey and stay saved on a demo, with its time. */
export const demoBlocks = (demo: DemoDetail): TimeBlock[] => [
  ...demo.clients.map((visit): TimeBlock => ({ key: `visit-${visit.id}`, kind: 'busy', from: at(visit.date, hhmm(visit.startTime)),
    to: at(visit.date, hhmm(visit.endTime)), label: `Visit to ${visit.clientName}` })),
  ...demo.expenses.flatMap((expense) => billBlock(`expense-${expense.id}`, expense)),
];

/** The blocks a visit, journey (`busy`) or stay can't overlap: those of its kind, other than its own. */
export const takenFor = (blocks: TimeBlock[], key: string, kind: TimeBlock['kind']): TimeBlock[] =>
  blocks.filter((block) => block.key !== key && block.kind === kind);

/** The first block that the time from `from` to `to` runs into, if any. */
export const clashOf = (taken: TimeBlock[], from: string, to: string): TimeBlock | undefined =>
  from && to && to > from ? taken.find((block) => block.from < to && from < block.to) : undefined;

/** Whether a start at `time` falls inside a taken block. */
export const insideTaken = (taken: TimeBlock[], time: string): boolean => taken.some((block) => block.from <= time && time < block.to);

/** "Clashes with Visit to Hotel Sunrise (10 May 2030, 10:00 am – 10 May 2030, 1:00 pm)." */
export const clashMessage = (block: TimeBlock): string =>
  `Clashes with ${block.label} (${formatDayTime(block.from.slice(0, 10), block.from.slice(11))} – ${formatDayTime(block.to.slice(0, 10), block.to.slice(11))}). That time is already taken.`;

/** The taken part of a date, in minutes from midnight (0 – 1440), with what takes it. */
export interface TakenRange {
  from: number;
  to: number;
  label: string;
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export const takenOn = (taken: TimeBlock[], date: string): TakenRange[] => {
  if (!date) return [];
  const dayStart = at(date, '00:00');
  return taken
    .filter((block) => block.from.slice(0, 10) <= date && block.to > dayStart)
    .map((block) => ({
      from: block.from.slice(0, 10) < date ? 0 : minutesOf(block.from.slice(11)),
      to: block.to.slice(0, 10) > date ? 24 * 60 : minutesOf(block.to.slice(11)),
      label: block.label,
    }))
    .filter((range) => range.to > range.from)
    .sort((a, b) => a.from - b.from);
};

/** When a stay or journey starts and ends, each a date and a time. */
export interface DateTimeSpan {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

/** Every date from one ISO date to another, both included. */
export const datesFrom = (from: string, to: string): string[] =>
  from && to && to >= from ? Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => addDays(from, i)) : [];

/** "12 h 30 min" from one date and time to another; blank until both are given and in order. */
export const spanLength = (span: DateTimeSpan): string => {
  if (!span.startDate || !span.startTime || !span.endDate || !span.endTime) return '';
  const minutes = daysBetween(span.startDate, span.endDate) * 24 * 60
    + Number(span.endTime.slice(0, 2)) * 60 + Number(span.endTime.slice(3, 5)) - Number(span.startTime.slice(0, 2)) * 60 - Number(span.startTime.slice(3, 5));
  if (minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return [hours && `${hours} h`, rest && `${rest} min`].filter(Boolean).join(' ');
};
