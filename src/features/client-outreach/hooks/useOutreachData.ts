import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { useGatedLoad } from '../../../hooks/useGatedLoad';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { createSearchResultCache } from '../../../utils/searchResultCache';
import { outreachApi } from '../api/outreachApi';
import type { BusinessType, Interest, OutreachBusiness, OutreachContact, OutreachPage, OutreachSummary } from '../types/outreach.types';
import { BUSINESS_PAGE_SIZE, CONTACT_PAGE_SIZE } from '../utils/outreach';

/** GET /v1/outreach/summary (OUTREACH_VIEW) for [from, to]. */
export const useOutreachSummary = (from: string, to: string, enabled = true) => {
  const { can } = useAccess();
  const load = useCallback(() => outreachApi.summary(from, to), [from, to]);
  return useGatedLoad<OutreachSummary>(load, enabled && can('OUTREACH_VIEW') && !!from && !!to && from <= to, 'The outreach summary could not be loaded.');
};

export interface BusinessFilters {
  search: string;
  businessType: BusinessType | '';
  interest: Interest | '';
  followUpDue: boolean;
}

/**
 * GET /v1/outreach/businesses (OUTREACH_VIEW) while the Businesses tab is open. The search settles for 2 s (Enter
 * searches at once), and a query already answered is served from memory. No local narrowing: the server matches
 * phone numbers in their normalised form, so a local "contains" could drop rows it would return.
 */
export const useBusinessList = (enabled: boolean) => {
  const { can } = useAccess();
  const allowed = enabled && can('OUTREACH_VIEW');
  const [filters, setFilters] = useState<BusinessFilters>({ search: '', businessType: '', interest: '', followUpDue: false });
  const [page, setPage] = useState(0);
  const { term, pending, flush } = useSearchTerm(filters.search);
  const [seen] = useState(() => createSearchResultCache<OutreachBusiness, OutreachPage<OutreachBusiness>>());
  const [attempt, setAttempt] = useState(0);

  const params = useMemo(
    () => ({ search: term, businessType: filters.businessType, interest: filters.interest, followUpDue: filters.followUpDue, page, size: BUSINESS_PAGE_SIZE }),
    [term, filters.businessType, filters.interest, filters.followUpDue, page]
  );
  const seenQuery = useMemo(
    () => ({ scope: JSON.stringify({ t: filters.businessType, i: filters.interest, f: filters.followUpDue }), term, page }),
    [filters.businessType, filters.interest, filters.followUpDue, term, page]
  );
  const requestKey = `${JSON.stringify(params)}#${attempt}`;
  const [result, setResult] = useState<{ key: string; data: OutreachPage<OutreachBusiness> | null; failed: boolean }>({ key: '', data: null, failed: false });
  const answered = pending ? null : seen.get(seenQuery);
  const beginRequest = useLatestRequest();
  const notify = useNotify();

  useEffect(() => {
    if (!allowed || pending || seen.get(seenQuery)) return;
    const isCurrent = beginRequest();
    outreachApi
      .businesses(params)
      .then((res) => {
        if (!isCurrent()) return;
        if (res.success && res.data) {
          seen.set(seenQuery, res.data);
          setResult({ key: requestKey, data: res.data, failed: false });
        } else {
          notify.error(res, 'The businesses could not be loaded.');
          setResult((prev) => ({ ...prev, key: requestKey, failed: true }));
        }
      })
      .catch((err: unknown) => {
        if (!isCurrent()) return;
        notify.error(err, 'The businesses could not be loaded.');
        setResult((prev) => ({ ...prev, key: requestKey, failed: true }));
      });
  }, [allowed, pending, params, seen, seenQuery, requestKey, beginRequest, notify]);

  const update = useCallback((patch: Partial<BusinessFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
  }, []);

  /** Load again (after a change or a manual refresh): forgets every cached answer. */
  const refresh = useCallback(() => {
    seen.clear();
    setAttempt((n) => n + 1);
  }, [seen]);

  const data = answered ?? result.data;
  const isLoading = allowed && (pending || (!answered && result.key !== requestKey));
  return {
    filters,
    update,
    searchNow: flush,
    page,
    setPage,
    businesses: data?.content ?? [],
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    loadFailed: !answered && !isLoading && result.failed,
    refresh,
  };
};

/** GET /v1/outreach/businesses/{id} (OUTREACH_VIEW). */
export const useBusiness = (id: number | null) => {
  const { can } = useAccess();
  const load = useCallback(() => outreachApi.business(id ?? 0), [id]);
  return useGatedLoad<OutreachBusiness>(load, can('OUTREACH_VIEW') && id !== null, 'The business could not be loaded.');
};

/** GET /v1/outreach/businesses/{id}/contacts (OUTREACH_VIEW): its contact history, newest first, a page at a time. */
export const useBusinessContacts = (id: number | null, page: number) => {
  const { can } = useAccess();
  const load = useCallback(() => outreachApi.contacts(id ?? 0, page, CONTACT_PAGE_SIZE), [id, page]);
  return useGatedLoad<OutreachPage<OutreachContact>>(load, can('OUTREACH_VIEW') && id !== null, 'The contact history could not be loaded.');
};

/** GET /v1/outreach/follow-ups (OUTREACH_VIEW) while the follow-ups tab is open: yours, or everyone's. */
export const useFollowUps = (mine: boolean, page: number, enabled: boolean) => {
  const { can } = useAccess();
  const load = useCallback(() => outreachApi.followUps(mine, page, CONTACT_PAGE_SIZE), [mine, page]);
  return useGatedLoad<OutreachPage<OutreachContact>>(load, enabled && can('OUTREACH_VIEW'), 'The follow-ups could not be loaded.');
};
