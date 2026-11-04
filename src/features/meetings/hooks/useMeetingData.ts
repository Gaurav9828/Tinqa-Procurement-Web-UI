import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import type { ApiResponse } from '../../../types/common.types';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { createSearchResultCache } from '../../../utils/searchResultCache';
import { getApiErrorKind } from '../../../utils/apiErrorKind';
import { meetingApi } from '../api/meetingApi';
import type { BusySlot, InvitableStaff, Meeting, MeetingFeedback, MeetingListFilter, MeetingPage, MeetingStatus } from '../types/meeting.types';

/**
 * One page of a list. `scope` holds every input except the search term and the page (JSON), so a query already
 * answered is served from the search cache; `pending` (typing not settled, useSearchTerm) holds the request back.
 * Nothing is loaded while `enabled` is false. `refresh` forgets the cache and asks again.
 */
const usePagedQuery = <T,>(
  load: (term: string, page: number) => Promise<ApiResponse<MeetingPage<T>>>,
  { scope, term, pending, page, enabled, failure }: { scope: string; term: string; pending: boolean; page: number; enabled: boolean; failure: string }
) => {
  const [cache] = useState(() => createSearchResultCache<T, MeetingPage<T>>());
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${scope}|${term}|${page}#${attempt}`;
  const [result, setResult] = useState<{ key: string; data: MeetingPage<T> | null; failed: boolean }>({ key: '', data: null, failed: false });
  const beginRequest = useLatestRequest();
  const notify = useNotify();
  const answered = enabled && !pending ? cache.get({ scope, term, page }) : null;

  useEffect(() => {
    const query = { scope, term, page };
    if (!enabled || pending || cache.get(query)) return;
    const isCurrent = beginRequest();
    load(term, page)
      .then((res) => {
        if (!isCurrent()) return;
        if (res.success && res.data) {
          cache.set(query, res.data);
          setResult({ key: requestKey, data: res.data, failed: false });
        } else {
          notify.error(res, failure);
          setResult((prev) => ({ ...prev, key: requestKey, failed: true }));
        }
      })
      .catch((err: unknown) => {
        if (!isCurrent()) return;
        notify.error(err, failure);
        setResult((prev) => ({ ...prev, key: requestKey, failed: true }));
      });
  }, [enabled, pending, scope, term, page, requestKey, cache, load, beginRequest, notify, failure]);

  const refresh = useCallback(() => {
    cache.clear();
    setAttempt((value) => value + 1);
  }, [cache]);

  const data = answered ?? (enabled ? result.data : null);
  const isLoading = enabled && (pending || (!answered && result.key !== requestKey));
  return { data, isLoading, loadFailed: !answered && !isLoading && result.failed, refresh };
};

/**
 * One record, loaded whenever `load` changes while `enabled`; an older answer never overwrites a newer one. `missing`
 * (a 404 that means "not there yet") clears it quietly. `replace` shows a record a mutation returned.
 */
const useRecord = <T,>(load: () => Promise<ApiResponse<T>>, enabled: boolean, failure: string, quietNotFound = false) => {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ data: T | null; failed: boolean; load: unknown; version: number }>({ data: null, failed: false, load: null, version: -1 });
  const notify = useNotify();

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    load()
      .then((res) => {
        if (!current) return;
        if (!res.success) notify.error(res, failure);
        setResult((prev) => ({ data: res.success ? res.data : prev.data, failed: !res.success, load, version }));
      })
      .catch((err: unknown) => {
        if (!current) return;
        const missing = quietNotFound && getApiErrorKind(err) === 'notFound';
        if (!missing) notify.error(err, failure);
        setResult({ data: null, failed: !missing, load, version });
      });
    return () => {
      current = false;
    };
  }, [enabled, load, version, notify, failure, quietNotFound]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const replace = useCallback((data: T) => setResult((prev) => ({ ...prev, data })), []);
  const isLoading = enabled && (result.load !== load || result.version !== version);
  const data = enabled && result.load === load ? result.data : null;
  return { data, isLoading, loadFailed: !isLoading && result.failed, refresh, replace };
};

const monthStart = (offset: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
};

/**
 * GET /v1/meetings (MEETING_VIEW_ALL): the Meetings tab, loaded only while the tab is open (`enabled`). Filters: status,
 * a date range and a server search (2 s debounce, Enter searches at once).
 */
export const useMeetingList = (enabled: boolean) => {
  const { can } = useAccess();
  const allowed = can('MEETING_VIEW_ALL');
  const [filter, setFilterState] = useState<MeetingListFilter>(() => ({ status: null, from: monthStart(-1), to: '' }));
  const [search, setSearchState] = useState('');
  const [page, setPage] = useState(0);
  const { term, pending, flush } = useSearchTerm(search);
  const load = useCallback((q: string, p: number) => meetingApi.list(filter, q, p), [filter]);
  const list = usePagedQuery(load, { scope: JSON.stringify(filter), term, pending, page, enabled: allowed && enabled, failure: 'The meetings could not be loaded.' });
  return {
    ...list,
    filter,
    search,
    page,
    setPage,
    searchNow: flush,
    setFilter: (patch: Partial<MeetingListFilter>) => {
      setFilterState((prev) => ({ ...prev, ...patch }));
      setPage(0);
    },
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(0);
    },
  };
};

/** GET /v1/meetings/mine (MEETING_VIEW_OWN): meetings I organise or am invited to, in one status or all. */
export const useMyMeetings = (status: MeetingStatus | null, page: number) => {
  const { can } = useAccess();
  const load = useCallback((_q: string, p: number) => meetingApi.mine(status, p), [status]);
  return usePagedQuery(load, { scope: status ?? 'ALL', term: '', pending: false, page, enabled: can('MEETING_VIEW_OWN'), failure: 'Your meetings could not be loaded.' });
};

/** GET /v1/meetings/{id}: MEETING_VIEW_ALL, or MEETING_VIEW_OWN as its organiser or an attendee. */
export const useMeeting = (id: number | null) => {
  const { canAny } = useAccess();
  const load = useCallback(() => meetingApi.get(id ?? 0), [id]);
  return useRecord<Meeting>(load, canAny('MEETING_VIEW_ALL', 'MEETING_VIEW_OWN') && id !== null, 'The meeting could not be loaded.');
};

/**
 * GET /v1/meetings/invitable-staff (MEETING_SCHEDULE): active employees to invite, searched on the server while the
 * picker is shown (`enabled`).
 */
export const useInvitableStaff = (enabled: boolean) => {
  const { can } = useAccess();
  const [search, setSearchState] = useState('');
  const [page, setPage] = useState(0);
  const { term, pending, flush } = useSearchTerm(search);
  const list = usePagedQuery<InvitableStaff>(meetingApi.invitableStaff, {
    scope: 'staff', term, pending, page, enabled: can('MEETING_SCHEDULE') && enabled, failure: 'The staff list could not be loaded.',
  });
  return {
    ...list,
    search,
    page,
    setPage,
    searchNow: flush,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(0);
    },
  };
};

/**
 * GET /v1/meetings/busy (MEETING_SCHEDULE): who of `employeeIds`, and I, is already in another scheduled meeting from
 * `from` to `to` (ISO), other than `excludeMeetingId`: the clock greys that time out and the form warns. Asked again only
 * when the span or the people change; nothing while `enabled` is false or the span is not known.
 */
export const useBusyTimes = (from: string, to: string, employeeIds: number[], excludeMeetingId: number | null, enabled: boolean) => {
  const { can } = useAccess();
  const ids = [...new Set(employeeIds)].sort((a, b) => a - b).join(',');
  const load = useCallback(
    () => meetingApi.busy(from, to, ids ? ids.split(',').map(Number) : [], excludeMeetingId),
    [from, to, ids, excludeMeetingId]
  );
  return useRecord<BusySlot[]>(load, can('MEETING_SCHEDULE') && enabled && !!from && !!to, 'Who is busy then could not be checked.');
};

/**
 * GET …/feedback/mine (MEETING_RESPOND_OWN): asked only when the meeting says I already gave it (`enabled`), so a
 * form never waits on a 404. A 404 anyway means "not given".
 */
export const useMyFeedback = (id: number, enabled: boolean) => {
  const { can } = useAccess();
  const load = useCallback(() => meetingApi.myFeedback(id), [id]);
  return useRecord<MeetingFeedback>(load, can('MEETING_RESPOND_OWN') && enabled, 'Your feedback could not be loaded.', true);
};

/** GET …/feedback: every attendee's feedback, for the organiser or MEETING_VIEW_ALL, loaded when its panel opens. */
export const useAllFeedback = (id: number, enabled: boolean) => {
  const load = useCallback(() => meetingApi.allFeedback(id), [id]);
  return useRecord<MeetingFeedback[]>(load, enabled, 'The feedback could not be loaded.');
};

// ---------- the My Meetings menu badge ----------

/**
 * Meetings waiting for my feedback, next to My Meetings. The count comes with GET /v1/notifications/unread-count,
 * which the notification bell asks once when the app opens, so the badge costs no call of its own; never polled.
 */
const useFeedbackBadgeStore = create<{ count: number }>(() => ({ count: 0 }));

/** Set from the unread-count response. */
export const setPendingFeedbackCount = (count: number) => useFeedbackBadgeStore.setState({ count: Math.max(0, count) });

/** Feedback is given once per meeting, so a saved feedback takes exactly one off the badge. */
export const decrementPendingFeedbackCount = () =>
  useFeedbackBadgeStore.setState((state) => ({ count: Math.max(0, state.count - 1) }));

export const usePendingFeedbackCount = (enabled: boolean): number => {
  const { can } = useAccess();
  const count = useFeedbackBadgeStore((state) => state.count);
  return enabled && can('MEETING_VIEW_OWN') ? count : 0;
};
