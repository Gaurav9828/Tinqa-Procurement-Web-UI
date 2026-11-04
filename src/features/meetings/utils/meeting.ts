import type { Attendee, AttendeeStatus, Meeting, MeetingMode, MeetingRating, MeetingStatus, MeetingType } from '../types/meeting.types';

export const MEETINGS_PATH = '/meetings';
export const MY_MEETINGS_PATH = '/my-meetings';
/** The Meetings tab of Client Demos & Meetings. */
export const MEETINGS_TAB_PATH = '/client-demos?tab=meetings';
export const meetingPath = (id: number) => `${MEETINGS_PATH}/${id}`;
export const meetingEditPath = (id: number) => `${MEETINGS_PATH}/${id}/edit`;
export const meetingFeedbackPath = (id: number) => `${MEETINGS_PATH}/${id}/feedback`;

export const MODE_LABELS: Record<MeetingMode, string> = { ONLINE: 'Online', IN_PERSON: 'Face-to-face' };

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  CLIENT: 'Client',
  BUSINESS_TO_BUSINESS: 'B2B',
  BUSINESS_TO_DEALER: 'Business-to-dealer',
  CLIENT_TO_CLIENT: 'Client-to-client',
  INTERNAL: 'Internal',
  OTHER: 'Other',
};
export const MEETING_TYPES = Object.keys(MEETING_TYPE_LABELS) as MeetingType[];

export const STATUS_LABELS: Record<MeetingStatus, string> = { SCHEDULED: 'Scheduled', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
export const MEETING_STATUSES = Object.keys(STATUS_LABELS) as MeetingStatus[];
export const STATUS_BADGE: Record<MeetingStatus, string> = {
  SCHEDULED: 'bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  CANCELLED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

export const ATTENDEE_LABELS: Record<AttendeeStatus, string> = { INVITED: 'Invited', DECLINED: 'Declined', REPLACED: 'Replaced' };
export const ATTENDEE_BADGE: Record<AttendeeStatus, string> = {
  INVITED: 'bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400',
  DECLINED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  REPLACED: 'bg-gray-500/10 text-gray-600 dark:text-gray-300',
};

export const RATING_LABELS: Record<MeetingRating, string> = { EXCELLENT: 'Excellent', GOOD: 'Good', AVERAGE: 'Average', BAD: 'Bad', WORSE: 'Worse' };
export const RATINGS = Object.keys(RATING_LABELS) as MeetingRating[];

/** Mirrors the contract: an end is after the start and at most 12 hours later; a reason is at most 1000 characters. */
export const MAX_LENGTH_HOURS = 12;
export const MAX_REASON = 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-04" + "15:30" → "2026-11-04T15:30:00+05:30", in this browser's time zone. */
export const toOffsetIso = (date: string, time: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const offset = -new Date(y, m - 1, d, h, min).getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return `${date}T${time}:00${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
};

/** An ISO instant as this browser's local date ("2026-11-04") and time ("15:30"). */
export const localParts = (iso: string): { date: string; time: string } => {
  const at = new Date(iso);
  return { date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`, time: `${pad(at.getHours())}:${pad(at.getMinutes())}` };
};

const DAY_TIME = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const TIME = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** "Wed, 4 Nov 2026, 3:30 pm" */
export const formatWhen = (iso: string | null | undefined): string => (iso ? DAY_TIME.format(new Date(iso)) : '—');

/** "Wed, 4 Nov 2026, 3:30 pm – 4:30 pm" */
export const formatSpan = (startsAt: string, endsAt: string): string => `${formatWhen(startsAt)} – ${TIME.format(new Date(endsAt))}`;

/** "5 h 12 min", "38 min", "less than a minute" until `until`. */
export const timeLeft = (until: string, now: number): string => {
  const minutes = Math.floor((Date.parse(until) - now) / 60_000);
  if (minutes < 1) return 'less than a minute';
  const hours = Math.floor(minutes / 60);
  return [hours && `${hours} h`, minutes % 60 && `${minutes % 60} min`].filter(Boolean).join(' ');
};

/** The invitee may still decline: invited (not the organiser), the meeting still scheduled, before the deadline. */
export const canStillDecline = (meeting: Meeting, attendance: Attendee | null, now: number): boolean =>
  !!attendance
  && meeting.status === 'SCHEDULED'
  && attendance.status === 'INVITED'
  && !attendance.organizer
  && !!attendance.declineDeadline
  && now < Date.parse(attendance.declineDeadline);

/** The organiser may complete it once it has started. */
export const hasStarted = (meeting: Meeting, now: number): boolean => now >= Date.parse(meeting.startsAt);

/** My feedback is asked for: the meeting is completed and I attended (invited, not declined or replaced). */
export const feedbackOpenFor = (meeting: Meeting): boolean => meeting.status === 'COMPLETED' && meeting.myAttendance?.status === 'INVITED';

export const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** Which service a pasted join link is on, for its button. */
export const joinService = (url: string): string => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('meet.google.com')) return 'Google Meet';
    if (host.endsWith('teams.microsoft.com') || host.endsWith('teams.live.com')) return 'Microsoft Teams';
    if (host.endsWith('zoom.us')) return 'Zoom';
  } catch {
    // Not a link: shown as the plain join link
  }
  return 'the meeting';
};
