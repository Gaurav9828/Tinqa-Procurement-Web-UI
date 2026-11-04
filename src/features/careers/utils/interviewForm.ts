import type { Interview, InterviewMode, InterviewRequest } from '../types/careers.types';

export const DEFAULT_TIME_ZONE = 'Asia/Kolkata';
export const TIME_ZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC'];
export const DURATION_LIMITS = { min: 15, max: 480 } as const;
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export const ONLINE_MODES: readonly InterviewMode[] = ['TEAMS', 'GOOGLE_MEET', 'ZOOM'];
export const isOnline = (mode: InterviewMode) => ONLINE_MODES.includes(mode);

/** Why a meeting link can't be used for the mode, or null when it can. */
export const meetingLinkError = (mode: InterviewMode, link: string): string | null => {
  if (!isOnline(mode)) return null;
  const trimmed = link.trim();
  if (!trimmed) return 'Paste the meeting link.';
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return 'That is not a link.';
  }
  if (url.protocol !== 'https:') return 'The link must start with https://';
  return null;
};

export interface InterviewForm {
  roundName: string;
  mode: InterviewMode;
  meetingLink: string;
  location: string;
  date: string;
  time: string;
  durationMinutes: string;
  timeZone: string;
  interviewers: string;
  candidateNotes: string;
}

export type InterviewErrors = Partial<Record<keyof InterviewForm, string>>;

export const emptyInterviewForm = (roundNumber = 1): InterviewForm => ({
  roundName: `Round ${roundNumber}`,
  mode: 'TEAMS',
  meetingLink: '',
  location: '',
  date: '',
  time: '',
  durationMinutes: '45',
  timeZone: DEFAULT_TIME_ZONE,
  interviewers: '',
  candidateNotes: '',
});

export const interviewToForm = (interview: Interview): InterviewForm => ({
  roundName: interview.roundName,
  mode: interview.mode,
  meetingLink: interview.meetingLink ?? '',
  location: interview.location ?? '',
  date: interview.startsAt.slice(0, 10),
  time: interview.startsAt.slice(11, 16),
  durationMinutes: String(interview.durationMinutes),
  timeZone: interview.timeZone || DEFAULT_TIME_ZONE,
  interviewers: interview.interviewers ?? '',
  candidateNotes: interview.candidateNotes ?? '',
});

/** The wall-clock time now in a time zone, "YYYY-MM-DDTHH:mm", to tell whether a start lies in the future there. */
export const nowIn = (timeZone: string, now: Date = new Date()): string => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const placeErrors = (form: InterviewForm, errors: InterviewErrors) => {
  if (isOnline(form.mode)) {
    const linkError = meetingLinkError(form.mode, form.meetingLink);
    if (linkError) errors.meetingLink = linkError;
  }
  if (form.mode === 'IN_PERSON' && !form.location.trim()) errors.location = 'Where should the candidate come?';
};

const timeErrors = (form: InterviewForm, errors: InterviewErrors, now: Date) => {
  if (!form.date) errors.date = 'Pick the date.';
  if (!form.time) errors.time = 'Pick the time.';
  else if (form.date && `${form.date}T${form.time}` <= nowIn(form.timeZone || DEFAULT_TIME_ZONE, now)) errors.time = 'The interview must be in the future.';
  const duration = Number(form.durationMinutes);
  if (!Number.isInteger(duration) || duration < DURATION_LIMITS.min || duration > DURATION_LIMITS.max) {
    errors.durationMinutes = `${DURATION_LIMITS.min} to ${DURATION_LIMITS.max} minutes.`;
  }
};

export const validateInterview = (form: InterviewForm, now: Date = new Date()): InterviewErrors => {
  const errors: InterviewErrors = {};
  if (!form.roundName.trim()) errors.roundName = 'Name the round, e.g. Technical round.';
  placeErrors(form, errors);
  timeErrors(form, errors, now);
  return errors;
};

export const toInterviewRequest = (form: InterviewForm): InterviewRequest => ({
  roundName: form.roundName.trim(),
  mode: form.mode,
  meetingLink: isOnline(form.mode) ? form.meetingLink.trim() : null,
  location: form.mode === 'IN_PERSON' ? form.location.trim() : null,
  startsAt: `${form.date}T${form.time}:00`,
  durationMinutes: Number(form.durationMinutes),
  timeZone: form.timeZone || DEFAULT_TIME_ZONE,
  interviewers: form.interviewers.trim() || null,
  candidateNotes: form.candidateNotes.trim() || null,
});
