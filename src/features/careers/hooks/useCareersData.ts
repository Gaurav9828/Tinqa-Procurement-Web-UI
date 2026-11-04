import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useAuthStore } from '../../../store/useAuthStore';
import { getAdminIdentity } from '../../../auth/adminIdentity';
import { careersApi } from '../api/careersApi';
import type { ApplicationSort, ApplicationStatus, CareerCategory, MatchLabel, OpeningStatus } from '../types/careers.types';
import { PAGE_SIZE } from '../utils/careers';
import { usePagedSearch, useRecord } from './useCareerLoaders';

// ---------- categories: one shared, cached lookup ----------

let categories: CareerCategory[] | null = null;
let categoriesLoading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getCategories = () => categories;

const loadCategories = () => {
  categoriesLoading ??= careersApi
    .categories()
    .then((res) => {
      categories = res.success && Array.isArray(res.data) ? res.data : [];
    })
    .catch(() => {
      categories = [];
    })
    .finally(() => {
      categoriesLoading = null;
      emit();
    });
  return categoriesLoading;
};

/** Forget the categories, e.g. after saving an opening (its category may be new). The next screen loads them again. */
export const invalidateCareerCategories = () => {
  categories = null;
};

/** Tests start from an empty cache. */
export const resetCareerCategories = () => {
  categories = null;
  categoriesLoading = null;
};

/**
 * GET /admin/careers/categories (CAREER_OPENING_VIEW), loaded once and shared by the openings filter and the opening
 * form (engineering rule 29). Quiet: without it the filter is just empty and a category can still be typed.
 */
export const useCareerCategories = (enabled = true) => {
  const allowed = useAccess().can('CAREER_OPENING_VIEW') && enabled;
  const snapshot = useSyncExternalStore(subscribe, getCategories);
  useEffect(() => {
    if (allowed && categories === null) void loadCategories();
  }, [allowed, snapshot]);
  return { categories: snapshot ?? [], isLoading: allowed && snapshot === null };
};

// ---------- openings ----------

/** GET /openings (CAREER_OPENING_VIEW): one page by status, category and search (2 s debounce, Enter at once). */
export const useOpenings = () => {
  const allowed = useAccess().can('CAREER_OPENING_VIEW');
  const [status, setStatusState] = useState<OpeningStatus | null>(null);
  const [categoryId, setCategoryState] = useState<number | null>(null);
  const [search, setSearchState] = useState('');
  const [page, setPage] = useState(0);
  const { term, pending, flush } = useSearchTerm(search);
  const scope = JSON.stringify({ status, categoryId });
  const load = useCallback(
    (q: string, p: number) => careersApi.openings({ status: status ?? undefined, categoryId: categoryId ?? undefined, q, page: p, size: PAGE_SIZE }),
    [status, categoryId]
  );
  const list = usePagedSearch(load, { scope, term, pending, page, enabled: allowed, failure: 'The openings could not be loaded.' });
  return {
    allowed,
    ...list,
    rows: list.data?.content ?? [],
    totalPages: list.data?.totalPages ?? 0,
    totalElements: list.data?.totalElements ?? 0,
    status,
    categoryId,
    search,
    page,
    setPage,
    searchNow: flush,
    setStatus: (value: OpeningStatus | null) => {
      setStatusState(value);
      setPage(0);
    },
    setCategoryId: (value: number | null) => {
      setCategoryState(value);
      setPage(0);
    },
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(0);
    },
  };
};

/** GET /openings/{id} (CAREER_OPENING_VIEW); nothing while there is no id. */
export const useOpening = (id: number | null) => {
  const allowed = useAccess().can('CAREER_OPENING_VIEW');
  const load = useCallback(() => careersApi.opening(id ?? 0), [id]);
  return useRecord(load, allowed && id !== null, 'The opening could not be loaded.');
};

// ---------- applications ----------

export interface ApplicationFilters {
  statuses: ApplicationStatus[];
  match: MatchLabel | null;
  sort: ApplicationSort;
}

/**
 * GET /applications (CAREER_APPLICATION_VIEW): one opening's applicants (`openingId`) or every opening's, with the
 * status, match, search and sort filters. `enabled` keeps a hidden list (a closed hub tab) from loading.
 */
export const useApplications = ({
  openingId = null,
  initial = { statuses: [], match: null, sort: 'NEWEST' },
  enabled = true,
  quiet = false,
}: { openingId?: number | null; initial?: ApplicationFilters; enabled?: boolean; quiet?: boolean } = {}) => {
  const allowed = useAccess().can('CAREER_APPLICATION_VIEW');
  const [filters, setFiltersState] = useState<ApplicationFilters>(initial);
  const [search, setSearchState] = useState('');
  const [page, setPage] = useState(0);
  const { term, pending, flush } = useSearchTerm(search);
  const scope = JSON.stringify({ openingId, ...filters });
  const load = useCallback(
    (q: string, p: number) =>
      careersApi.applications({
        openingId: openingId ?? undefined,
        status: filters.statuses,
        match: filters.match ?? undefined,
        q,
        sort: filters.sort,
        page: p,
        size: PAGE_SIZE,
      }),
    [openingId, filters]
  );
  const list = usePagedSearch(load, { scope, term, pending, page, enabled: allowed && enabled, failure: 'The applicants could not be loaded.', quiet });
  return {
    allowed,
    ...list,
    rows: list.data?.content ?? [],
    totalPages: list.data?.totalPages ?? 0,
    totalElements: list.data?.totalElements ?? 0,
    filters,
    search,
    page,
    setPage,
    searchNow: flush,
    setFilters: (patch: Partial<ApplicationFilters>) => {
      setFiltersState((prev) => ({ ...prev, ...patch }));
      setPage(0);
    },
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(0);
    },
  };
};

/** GET /applications/{id} (CAREER_APPLICATION_VIEW). */
export const useApplication = (id: number | null) => {
  const allowed = useAccess().can('CAREER_APPLICATION_VIEW');
  const load = useCallback(() => careersApi.application(id ?? 0), [id]);
  return useRecord(load, allowed && id !== null, 'The application could not be loaded.');
};

/** The signed-in username, for maker-checker (a request's maker never confirms it). */
export const useSignedInUsername = (): string | null => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  return useMemo(() => getAdminIdentity(token, user).username, [token, user]);
};
