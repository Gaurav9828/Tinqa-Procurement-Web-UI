import { blankToNull, isGoogleMapsLink, todayIso } from '../../client-demos/utils/clientDemo';
import type { InvitableStaff, Meeting, MeetingFeedbackPayload, MeetingMode, MeetingPayload, MeetingRating, MeetingType } from '../types/meeting.types';
import { MAX_LENGTH_HOURS, isHttpsUrl, localParts, toOffsetIso } from './meeting';

export const LIMITS = {
  title: 150,
  subject: 200,
  description: 2000,
  clientName: 150,
  clientDescription: 1000,
  clientContact: 200,
  url: 500,
  placeName: 150,
  address: 500,
  feedbackText: 2000,
  dealNotes: 1000,
};

export interface MeetingForm {
  mode: MeetingMode;
  title: string;
  subject: string;
  description: string;
  meetingType: MeetingType;
  clientName: string;
  clientDescription: string;
  clientContact: string;
  date: string;
  startTime: string;
  endTime: string;
  joinUrl: string;
  placeName: string;
  address: string;
  googleMapsUrl: string;
  attendees: InvitableStaff[];
}

export type MeetingFormErrors = Partial<Record<keyof MeetingForm, string>>;

export const emptyMeetingForm = (): MeetingForm => ({
  mode: 'ONLINE',
  title: '',
  subject: '',
  description: '',
  meetingType: 'CLIENT',
  clientName: '',
  clientDescription: '',
  clientContact: '',
  date: todayIso(),
  startTime: '',
  endTime: '',
  joinUrl: '',
  placeName: '',
  address: '',
  googleMapsUrl: '',
  attendees: [],
});

/** A saved meeting as the form, to edit it (attendees are changed on the meeting's page instead). */
export const formFromMeeting = (meeting: Meeting): MeetingForm => {
  const start = localParts(meeting.startsAt);
  const end = localParts(meeting.endsAt);
  return {
    mode: meeting.mode,
    title: meeting.title,
    subject: meeting.subject ?? '',
    description: meeting.description ?? '',
    meetingType: meeting.meetingType,
    clientName: meeting.clientName ?? '',
    clientDescription: meeting.clientDescription ?? '',
    clientContact: meeting.clientContact ?? '',
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    joinUrl: meeting.joinUrl ?? '',
    placeName: meeting.placeName ?? '',
    address: meeting.address ?? '',
    googleMapsUrl: meeting.googleMapsUrl ?? '',
    attendees: [],
  };
};

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

const onlineErrors = (form: MeetingForm): MeetingFormErrors => {
  const link = form.joinUrl.trim();
  if (!link) return { joinUrl: 'Paste the Google Meet, Teams or Zoom link.' };
  return isHttpsUrl(link) ? {} : { joinUrl: 'Paste the full link, starting with https://' };
};

const inPersonErrors = (form: MeetingForm): MeetingFormErrors => {
  const errors: MeetingFormErrors = {};
  if (!form.placeName.trim()) errors.placeName = 'Where is it held?';
  if (!form.address.trim()) errors.address = 'Give the address.';
  if (form.googleMapsUrl.trim() && !isGoogleMapsLink(form.googleMapsUrl.trim())) errors.googleMapsUrl = 'Paste a Google Maps link (https).';
  return errors;
};

const timeErrors = (form: MeetingForm, now: number): MeetingFormErrors => {
  const errors: MeetingFormErrors = {};
  if (!form.date) errors.date = 'Pick the day.';
  if (!form.startTime) errors.startTime = 'Pick when it starts.';
  else if (form.date && Date.parse(toOffsetIso(form.date, form.startTime)) <= now) errors.startTime = 'It must start in the future.';
  if (!form.endTime) errors.endTime = 'Pick when it ends.';
  else if (form.startTime) {
    const length = minutesOf(form.endTime) - minutesOf(form.startTime);
    if (length <= 0) errors.endTime = 'It must end after it starts.';
    else if (length > MAX_LENGTH_HOURS * 60) errors.endTime = `A meeting lasts at most ${MAX_LENGTH_HOURS} hours.`;
  }
  return errors;
};

/**
 * What is wrong with the form, field by field (empty when it can be saved). Mirrors the server's rules: a join link
 * (https) online, a place and address face-to-face, a start in the future and an end after it within 12 hours, and
 * at least one invitee when scheduling.
 */
export const validateMeetingForm = (form: MeetingForm, isNew: boolean, now: number = Date.now()): MeetingFormErrors => ({
  ...(form.title.trim() ? {} : { title: 'Give the meeting a name.' }),
  ...(form.mode === 'ONLINE' ? onlineErrors(form) : inPersonErrors(form)),
  ...timeErrors(form, now),
  ...(isNew && form.attendees.length === 0 ? { attendees: 'Invite at least one person.' } : {}),
});

/** The body for POST (with the invitees) or PUT (without). Fields of the other mode are sent as null. */
export const meetingPayload = (form: MeetingForm, isNew: boolean): MeetingPayload => {
  const online = form.mode === 'ONLINE';
  return {
    mode: form.mode,
    title: form.title.trim(),
    subject: blankToNull(form.subject),
    description: blankToNull(form.description),
    meetingType: form.meetingType,
    clientName: blankToNull(form.clientName),
    clientDescription: blankToNull(form.clientDescription),
    clientContact: blankToNull(form.clientContact),
    startsAt: toOffsetIso(form.date, form.startTime),
    endsAt: toOffsetIso(form.date, form.endTime),
    joinUrl: online ? form.joinUrl.trim() : null,
    placeName: online ? null : form.placeName.trim(),
    address: online ? null : form.address.trim(),
    googleMapsUrl: online ? null : blankToNull(form.googleMapsUrl),
    ...(isNew ? { attendeeEmployeeIds: form.attendees.map((person) => person.employeeId) } : {}),
  };
};

export interface FeedbackForm {
  agenda: string;
  feedback: string;
  decisions: string;
  dealConfirmed: boolean | null;
  dealNotes: string;
  meetingType: MeetingType;
  rating: MeetingRating | '';
}

export type FeedbackFormErrors = Partial<Record<keyof FeedbackForm, string>>;

export const emptyFeedbackForm = (meetingType: MeetingType): FeedbackForm => ({
  agenda: '',
  feedback: '',
  decisions: '',
  dealConfirmed: null,
  dealNotes: '',
  meetingType,
  rating: '',
});

export const validateFeedbackForm = (form: FeedbackForm): FeedbackFormErrors => {
  const errors: FeedbackFormErrors = {};
  if (!form.agenda.trim()) errors.agenda = 'What was the agenda?';
  if (!form.feedback.trim()) errors.feedback = 'Give your feedback.';
  if (!form.decisions.trim()) errors.decisions = 'What was decided?';
  if (form.dealConfirmed === null) errors.dealConfirmed = 'Was a deal confirmed?';
  if (!form.rating) errors.rating = 'Rate the meeting.';
  return errors;
};

/** Only call with a form validateFeedbackForm passed. */
export const feedbackPayload = (form: FeedbackForm): MeetingFeedbackPayload => ({
  agenda: form.agenda.trim(),
  feedback: form.feedback.trim(),
  decisions: form.decisions.trim(),
  dealConfirmed: form.dealConfirmed === true,
  dealNotes: blankToNull(form.dealNotes),
  meetingType: form.meetingType,
  rating: form.rating as MeetingRating,
});
