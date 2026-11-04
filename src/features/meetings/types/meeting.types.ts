/** Meetings (docs/outreach-meetings-roles.md, section 3). Times are ISO-8601 with offset, dates YYYY-MM-DD. */

export type MeetingMode = 'ONLINE' | 'IN_PERSON';
export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type MeetingType = 'CLIENT' | 'BUSINESS_TO_BUSINESS' | 'BUSINESS_TO_DEALER' | 'CLIENT_TO_CLIENT' | 'INTERNAL' | 'OTHER';
export type AttendeeStatus = 'INVITED' | 'DECLINED' | 'REPLACED';
export type MeetingRating = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BAD' | 'WORSE';

export interface Attendee {
  id: number;
  employeeId: number;
  userId: number;
  name: string;
  designationLabel: string | null;
  status: AttendeeStatus;
  /** The organiser is an attendee too, and cannot decline. */
  organizer: boolean;
  invitedAt: string;
  /** min(invitedAt + 24 h, startsAt): the attendee may decline until then, and must attend after it. */
  declineDeadline: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  replacedByName: string | null;
  feedbackSubmittedAt: string | null;
}

export interface Meeting {
  id: number;
  /** "MTG-2026-0001", given by the server when the meeting is saved. */
  code: string;
  mode: MeetingMode;
  title: string;
  subject: string | null;
  description: string | null;
  meetingType: MeetingType;
  clientName: string | null;
  clientDescription: string | null;
  clientContact: string | null;
  outreachBusinessId: number | null;
  startsAt: string;
  endsAt: string;
  joinUrl: string | null;
  placeName: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  status: MeetingStatus;
  cancelReason: string | null;
  organizerId: number;
  organizerName: string;
  /** Empty in list rows (counts only). */
  attendees: Attendee[];
  feedbackCount: number;
  attendeeCount: number;
  completedAt: string | null;
  createdAt: string;
  /** The signed-in user's own attendance, when invited or organising. */
  myAttendance: Attendee | null;
  /** True for the organiser (who edits, cancels, replaces decliners and completes it). */
  canManage: boolean;
  /** My Meetings rows: feedback is asked of me and not given yet. */
  feedbackPending?: boolean;
}

/** One Spring page (`?page=0&size=20`, size capped at 100). */
export interface MeetingPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** POST / PUT body; attendees only when scheduling (the organiser is added by the server). */
export interface MeetingPayload {
  mode: MeetingMode;
  title: string;
  subject: string | null;
  description: string | null;
  meetingType: MeetingType;
  clientName: string | null;
  clientDescription: string | null;
  clientContact: string | null;
  startsAt: string;
  endsAt: string;
  joinUrl: string | null;
  placeName: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  attendeeEmployeeIds?: number[];
}

export interface InvitableStaff {
  employeeId: number;
  userId: number;
  name: string;
  designationLabel: string | null;
}

/** GET /v1/meetings/busy: one person already in another scheduled meeting during the asked span. */
export interface BusySlot {
  employeeId: number;
  name: string;
  /** The signed-in user (always checked, as the organiser attends too). */
  self: boolean;
  meetingId: number;
  code: string;
  startsAt: string;
  endsAt: string;
}

export interface MeetingFeedbackPayload {
  agenda: string;
  feedback: string;
  decisions: string;
  dealConfirmed: boolean;
  dealNotes: string | null;
  meetingType: MeetingType;
  rating: MeetingRating;
}

export interface MeetingFeedback extends MeetingFeedbackPayload {
  attendeeName?: string;
  submittedAt: string;
}

export interface MeetingListFilter {
  status: MeetingStatus | null;
  from: string;
  to: string;
}
