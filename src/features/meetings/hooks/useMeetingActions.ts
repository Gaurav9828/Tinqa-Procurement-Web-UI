import { useCallback, useRef, useState } from 'react';
import type { ApiResponse } from '../../../types/common.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind } from '../../../utils/apiErrorKind';
import { meetingApi } from '../api/meetingApi';
import type { Meeting, MeetingFeedback, MeetingFeedbackPayload, MeetingPayload } from '../types/meeting.types';
import { decrementPendingFeedbackCount } from './useMeetingData';

/**
 * Every meeting action: one in flight at a time, the outcome through the global alert (the server's message). A
 * meeting the server returns is handed to `onMeeting` so the page shows it without another request; otherwise, or
 * when the server refused because the meeting changed meanwhile (409 / 404), `onStale` reloads it.
 */
export const useMeetingActions = (onMeeting: (meeting: Meeting) => void, onStale: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const notify = useNotify();

  const run = useCallback(
    async <T,>(call: () => Promise<ApiResponse<T>>, success: string, failure: string): Promise<T | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const res = await call();
        if (!res.success) {
          notify.error(res, failure);
          return null;
        }
        notify.success(res.message || success);
        return res.data ?? ({} as T);
      } catch (err: unknown) {
        notify.error(err, failure);
        const kind = getApiErrorKind(err);
        if (kind === 'conflict' || kind === 'notFound') onStale();
        return null;
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [notify, onStale]
  );

  /** Shows the meeting the server returned, or reloads it when the answer carried none. */
  const change = useCallback(
    async (call: () => Promise<ApiResponse<Meeting>>, success: string, failure: string): Promise<boolean> => {
      const meeting = await run(call, success, failure);
      if (meeting === null) return false;
      if (meeting.id) onMeeting(meeting);
      else onStale();
      return true;
    },
    [run, onMeeting, onStale]
  );

  return {
    isSubmitting,
    /** Saves a new meeting; resolves to it (its ID given by the server), or null. */
    create: (payload: MeetingPayload) => run(() => meetingApi.create(payload), 'Meeting scheduled. The invitees are emailed.', 'The meeting could not be scheduled.'),
    update: (id: number, payload: MeetingPayload) =>
      run(() => meetingApi.update(id, payload), 'Meeting updated. The attendees are told of any change of time or place.', 'The meeting could not be updated.'),
    invite: (id: number, employeeIds: number[], replacesAttendeeId: number | null) =>
      change(() => meetingApi.addAttendees(id, employeeIds, replacesAttendeeId), replacesAttendeeId ? 'Replacement invited.' : 'Invited.',
        'The invitation could not be sent.'),
    cancel: (id: number, reason: string) => change(() => meetingApi.cancel(id, reason), 'Meeting cancelled. The attendees are told.', 'The meeting could not be cancelled.'),
    complete: (id: number) => change(() => meetingApi.complete(id), 'Meeting completed. The attendees are asked for feedback.', 'The meeting could not be completed.'),
    decline: (id: number, reason: string) => change(() => meetingApi.decline(id, reason), 'You declined. The organiser is told.', 'You could not decline.'),
    submitFeedback: async (id: number, payload: MeetingFeedbackPayload): Promise<MeetingFeedback | null> => {
      const saved = await run(() => meetingApi.submitFeedback(id, payload), 'Thank you, your feedback is saved.', 'Your feedback could not be saved.');
      if (saved) decrementPendingFeedbackCount();
      return saved;
    },
  };
};
