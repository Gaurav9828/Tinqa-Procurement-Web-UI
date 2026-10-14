import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { companyProfileApi } from '../api/companyProfileApi';
import type { CompanyProfileOverview, CompanyProfileVersion } from '../types/companyProfile.types';
import type { PageResponse } from '../../../types/common.types';
import { getApiErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

/** Whether a change is waiting for approval — drives the "1" badge in the navigation. */
export const useCompanyPendingStore = create<{ hasPending: boolean; setHasPending: (value: boolean) => void }>((set) => ({
  hasPending: false,
  setHasPending: (hasPending) => set({ hasPending }),
}));

/** Re-runs `reload` when the tab regains focus (another admin may have acted). */
const useRefreshOnFocus = (reload: () => void) => {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);
};

interface Loaded<T> {
  data: T | null;
  errorKind: ApiErrorKind | null;
  /** Which request produced this state; anything else means a load is in flight. */
  fetcher: unknown;
  round: number;
}

/**
 * Shared loader. `reload()` keeps the current data on screen and replaces it when the response arrives;
 * a different `fetcher` (another id or page) starts a fresh load. Pass null to skip loading.
 */
const useLoader = <T,>(fetcher: (() => Promise<{ success: boolean; data?: T | null }>) | null) => {
  const [round, setRound] = useState(0);
  const [state, setState] = useState<Loaded<T>>({ data: null, errorKind: null, fetcher: null, round: -1 });

  useEffect(() => {
    if (!fetcher) return;
    let active = true;
    fetcher()
      .then((res) => {
        if (!active) return;
        setState((s) =>
          res.success && res.data
            ? { data: res.data, errorKind: null, fetcher, round }
            : { data: s.fetcher === fetcher ? s.data : null, errorKind: s.fetcher === fetcher && s.data ? null : 'unknown', fetcher, round }
        );
      })
      .catch((err: unknown) => {
        if (!active) return;
        const kind = getApiErrorKind(err);
        setState((s) => {
          // Keep the last data on a transient failure of a reload; drop it when it's gone or forbidden.
          const keep = s.fetcher === fetcher && !!s.data && kind !== 'notFound' && kind !== 'forbidden';
          return { data: keep ? s.data : null, errorKind: keep ? null : kind, fetcher, round };
        });
      });
    return () => {
      active = false;
    };
  }, [fetcher, round]);

  const isCurrent = state.fetcher === fetcher;
  const reload = useCallback(() => setRound((r) => r + 1), []);
  const set = useCallback((data: T) => setState({ data, errorKind: null, fetcher, round }), [fetcher, round]);
  return {
    data: isCurrent ? state.data : null,
    isLoading: !!fetcher && (!isCurrent || state.round !== round),
    errorKind: isCurrent ? state.errorKind : null,
    reload,
    set,
  };
};

/** GET /admin/company/profile — live, pending and my drafts. */
export const useCompanyProfileOverview = () => {
  const loader = useLoader<CompanyProfileOverview>(companyProfileApi.getOverview);
  const setHasPending = useCompanyPendingStore((s) => s.setHasPending);
  useRefreshOnFocus(loader.reload);

  const pending = loader.data?.pending ?? null;
  useEffect(() => {
    if (loader.data) setHasPending(!!pending);
  }, [loader.data, pending, setHasPending]);

  return { overview: loader.data, isLoading: loader.isLoading, errorKind: loader.errorKind, reload: loader.reload };
};

/** GET /versions/{id} — with changes vs live and the audit trail. Pass null to skip loading. */
export const useCompanyProfileVersion = (id: number | null) => {
  const fetcher = useCallback(() => companyProfileApi.getVersion(id as number), [id]);
  const loader = useLoader<CompanyProfileVersion>(id ? fetcher : null);
  return { version: loader.data, isLoading: loader.isLoading, errorKind: loader.errorKind, reload: loader.reload, set: loader.set };
};

export const HISTORY_PAGE_SIZE = 20;

/** GET /versions — newest first, paged. */
export const useCompanyProfileHistory = () => {
  const [page, setPage] = useState(0);
  const fetcher = useCallback(() => companyProfileApi.listVersions(page, HISTORY_PAGE_SIZE), [page]);
  const loader = useLoader<PageResponse<CompanyProfileVersion>>(fetcher);
  useRefreshOnFocus(loader.reload);
  return { page, setPage, result: loader.data, isLoading: loader.isLoading, errorKind: loader.errorKind, reload: loader.reload };
};

/** Navigation badge: loads the overview once (and on focus) so the menu can show a pending change. */
export const usePendingCompanyChangeBadge = (enabled: boolean) => {
  const setHasPending = useCompanyPendingStore((s) => s.setHasPending);
  const hasPending = useCompanyPendingStore((s) => s.hasPending);
  const refresh = useCallback(() => {
    if (!enabled) return;
    companyProfileApi
      .getOverview()
      .then((res) => {
        if (res.success && res.data) setHasPending(!!res.data.pending);
      })
      .catch(() => {
        // The badge is a hint only; the page itself reports errors.
      });
  }, [enabled, setHasPending]);
  useEffect(refresh, [refresh]);
  useRefreshOnFocus(refresh);
  return enabled && hasPending;
};
