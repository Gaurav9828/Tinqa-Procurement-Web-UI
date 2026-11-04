import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
  BusySlot,
  InvitableStaff,
  Meeting,
  MeetingFeedback,
  MeetingFeedbackPayload,
  MeetingListFilter,
  MeetingPage,
  MeetingPayload,
  MeetingStatus,
} from '../types/meeting.types';

const BASE = '/v1/meetings';
export const MEETING_PAGE_SIZE = 20;

const get = async <T,>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> =>
  (await axiosClient.get<ApiResponse<T>>(url, { params })).data;
const post = async <T,>(url: string, body?: unknown): Promise<ApiResponse<T>> => (await axiosClient.post<ApiResponse<T>>(url, body)).data;

/** Leaves out blank filters, so no empty parameter is sent. */
const present = (params: Record<string, string | number | null | undefined>) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''));

/** Meetings API (docs/outreach-meetings-roles.md §3). Each call's permission is in config/endpointAccess.ts. */
export const meetingApi = {
  /** GET /v1/meetings (MEETING_VIEW_ALL): every meeting, soonest upcoming first for SCHEDULED, latest first otherwise. */
  list: (filter: MeetingListFilter, search: string, page: number) =>
    get<MeetingPage<Meeting>>(BASE, present({ status: filter.status, from: filter.from, to: filter.to, search, page, size: MEETING_PAGE_SIZE })),

  /** GET /v1/meetings/mine (MEETING_VIEW_OWN): meetings I organise or am invited to, with myAttendance. */
  mine: (status: MeetingStatus | null, page: number) => get<MeetingPage<Meeting>>(`${BASE}/mine`, present({ status, page, size: MEETING_PAGE_SIZE })),


  /** GET /v1/meetings/{id}: MEETING_VIEW_ALL, or MEETING_VIEW_OWN as its organiser or an attendee (403 otherwise). */
  get: (id: number) => get<Meeting>(`${BASE}/${id}`),

  /** GET /v1/meetings/invitable-staff (MEETING_SCHEDULE): active employees, without emails or phones. */
  invitableStaff: (search: string, page: number) => get<MeetingPage<InvitableStaff>>(`${BASE}/invitable-staff`, present({ search, page })),

  /**
   * GET /v1/meetings/busy (MEETING_SCHEDULE): who of these employees, and the caller, is already in another scheduled
   * meeting between `from` and `to` (at most two days), other than `excludeMeetingId`. Ids go comma-separated.
   */
  busy: (from: string, to: string, employeeIds: number[], excludeMeetingId: number | null) =>
    get<BusySlot[]>(`${BASE}/busy`, present({ from, to, employeeIds: employeeIds.join(','), excludeMeetingId })),

  /** POST /v1/meetings (MEETING_SCHEDULE): no approval; the meeting ID is given by the server. 409 MEETING_TIME_CLASH when someone is busy then. */
  create: (payload: MeetingPayload) => post<Meeting>(BASE, payload),

  /** PUT /v1/meetings/{id} (organiser): a time or place/link change emails the attendees again. */
  update: async (id: number, payload: MeetingPayload): Promise<ApiResponse<Meeting>> =>
    (await axiosClient.put<ApiResponse<Meeting>>(`${BASE}/${id}`, payload)).data,

  /** POST …/attendees (organiser): adds attendees, or one in place of a declined attendee (`replacesAttendeeId`). */
  addAttendees: (id: number, employeeIds: number[], replacesAttendeeId: number | null) =>
    post<Meeting>(`${BASE}/${id}/attendees`, { employeeIds, ...(replacesAttendeeId ? { replacesAttendeeId } : {}) }),

  cancel: (id: number, reason: string) => post<Meeting>(`${BASE}/${id}/cancel`, { reason }),

  /** POST …/complete (organiser, once it has started): every attendee is asked for feedback. */
  complete: (id: number) => post<Meeting>(`${BASE}/${id}/complete`),

  /** POST …/decline (MEETING_RESPOND_OWN): only before the decline deadline (409 DECLINE_WINDOW_CLOSED). */
  decline: (id: number, reason: string) => post<Meeting>(`${BASE}/${id}/decline`, { reason }),

  /** GET …/feedback/mine (MEETING_RESPOND_OWN): my feedback, or 404 when not given. */
  myFeedback: (id: number) => get<MeetingFeedback>(`${BASE}/${id}/feedback/mine`),

  /** POST …/feedback (MEETING_RESPOND_OWN): once, final. */
  submitFeedback: (id: number, payload: MeetingFeedbackPayload) => post<MeetingFeedback>(`${BASE}/${id}/feedback`, payload),

  /** GET …/feedback: the organiser, or MEETING_VIEW_ALL. */
  allFeedback: (id: number) => get<MeetingFeedback[]>(`${BASE}/${id}/feedback`),
};
