import { useCallback, useMemo, useRef, useState } from 'react';
import type { ApiResponse } from '../../../types/common.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind } from '../../../utils/apiErrorKind';
import { careersApi } from '../api/careersApi';
import type { AdminOpening, ApplicationDetail, InterviewRequest, MatchRequest, OpeningRequest, OutcomeRequest } from '../types/careers.types';
import { invalidateCareerCategories } from './useCareersData';

/**
 * Runs one careers action at a time and reports through the global alert (the server's message first). The record the
 * server returns goes to `onResult`, so the screen shows it without another request; when the server refused because
 * the record changed meanwhile (409) or is gone (404), `onStale` reloads it.
 */
const useRunner = <T,>(onResult: (record: T) => void, onStale?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const notify = useNotify();

  const run = useCallback(
    async (call: () => Promise<ApiResponse<T>>, success: string | null, failure: string): Promise<T | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const res = await call();
        if (!res.success || !res.data) {
          notify.error(res, failure);
          return null;
        }
        if (success !== null) notify.success(res.message || success);
        onResult(res.data);
        return res.data;
      } catch (err: unknown) {
        notify.error(err, failure);
        const kind = getApiErrorKind(err);
        if (kind === 'conflict' || kind === 'notFound') onStale?.();
        return null;
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [notify, onResult, onStale]
  );

  return { isSubmitting, run };
};

/** Every action on an application (CAREER_APPLICATION_SCREEN, or CAREER_DECISION_APPROVE for the L2 decisions). */
export const useApplicationActions = (onDetail: (detail: ApplicationDetail) => void, onStale?: () => void) => {
  const { isSubmitting, run } = useRunner<ApplicationDetail>(onDetail, onStale);
  // Stable between renders, so effects (the first match save) don't re-run for nothing
  const calls = useMemo(() => ({
    /** Saved quietly: the match panel already shows the result. */
    saveMatch: (id: number, match: MatchRequest, quiet: boolean) =>
      run(() => careersApi.saveMatch(id, match), quiet ? null : 'Match saved.', 'The match could not be saved.'),
    shortlist: (id: number, note: string | null) =>
      run(() => careersApi.shortlist(id, note), 'Shortlist sent to a Level 2 approver.', 'The shortlist could not be sent.'),
    select: (id: number, note: string | null) =>
      run(() => careersApi.select(id, note), 'Selection sent to a Level 2 approver.', 'The selection could not be sent.'),
    reject: (id: number, reason: string, notifyCandidate: boolean) =>
      run(() => careersApi.reject(id, reason, notifyCandidate), notifyCandidate ? 'Rejected; the candidate is emailed.' : 'Rejected.', 'The application could not be rejected.'),
    withdraw: (id: number, reason: string) => run(() => careersApi.withdraw(id, reason), 'Marked as withdrawn.', 'It could not be marked as withdrawn.'),
    approve: (id: number, note: string | null) => run(() => careersApi.approve(id, note), 'Confirmed; the candidate is emailed.', 'It could not be confirmed.'),
    returnDecision: (id: number, note: string) => run(() => careersApi.returnDecision(id, note), 'Returned with your note.', 'It could not be returned.'),
    schedule: (id: number, request: InterviewRequest) =>
      run(() => careersApi.scheduleInterview(id, request), 'Interview scheduled; the candidate is emailed the invite.', 'The interview could not be scheduled.'),
    reschedule: (id: number, interviewId: number, request: InterviewRequest) =>
      run(() => careersApi.rescheduleInterview(id, interviewId, request), 'Interview rescheduled; the candidate is emailed the new time.', 'The interview could not be rescheduled.'),
    cancelInterview: (id: number, interviewId: number, reason: string) =>
      run(() => careersApi.cancelInterview(id, interviewId, reason), 'Interview cancelled; the candidate is emailed.', 'The interview could not be cancelled.'),
    recordOutcome: (id: number, interviewId: number, outcome: OutcomeRequest) =>
      run(() => careersApi.recordOutcome(id, interviewId, outcome), 'Outcome recorded.', 'The outcome could not be recorded.'),
  }), [run]);
  return { isSubmitting, ...calls };
};

/** Saving, publishing and closing openings (CAREER_OPENING_MANAGE). */
export const useOpeningActions = (onOpening: (opening: AdminOpening) => void, onStale?: () => void) => {
  const { isSubmitting, run } = useRunner<AdminOpening>(onOpening, onStale);
  return {
    isSubmitting,
    save: (id: number | null, request: OpeningRequest) =>
      run(
        () => {
          // Its category may be new (find-or-create): the shared list is loaded again next time
          invalidateCareerCategories();
          return id === null ? careersApi.createOpening(request) : careersApi.updateOpening(id, request);
        },
        id === null ? 'Opening saved as a draft.' : 'Opening saved.',
        'The opening could not be saved.'
      ),
    publish: (id: number, reopen: boolean) =>
      run(() => careersApi.publishOpening(id), reopen ? 'Opening reopened.' : 'Opening published on the website.', 'The opening could not be published.'),
    close: (id: number) => run(() => careersApi.closeOpening(id), 'Opening closed; it no longer takes applications.', 'The opening could not be closed.'),
  };
};
