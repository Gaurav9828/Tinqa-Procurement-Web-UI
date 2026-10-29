import { useCallback, useEffect, useState } from 'react';
import { financeApi } from '../api/financeApi';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  FinanceCategory,
  FinanceOverview,
  Granularity,
  LedgerEntry,
  LedgerListParams,
  Period,
  Voucher,
  VoucherListParams,
} from '../types/finance.types';
import type { GstRegisterEntry, GstRegisterParams, GstSummary } from '../types/gst.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { useAccess } from '../../../hooks/useAccess';
import {
  containsTerm,
  createSearchResultCache,
  type SearchQuery,
  type SearchResultCache,
} from '../../../utils/searchResultCache';

/**
 * Loads one resource whenever its inputs change; the latest request wins. `enabled` must reflect the endpoint's
 * permission, so nothing is requested that the backend would refuse.
 */
const useLoad = <T,>(load: () => Promise<ApiResponse<T>>, enabled: boolean, failure: string) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await load();
      if (!isCurrent()) return;
      if (res.success) {
        setData(res.data);
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
        notify.error(res, failure);
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setLoadFailed(true);
      notify.error(err, failure);
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [enabled, load, beginRequest, notify, failure]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, loadFailed, refresh };
};

let categoriesCache: FinanceCategory[] | null = null;

/** GET /admin/finance/categories, once per session (reference data). */
export const useFinanceCategories = () => {
  const [categories, setCategories] = useState<FinanceCategory[]>(categoriesCache ?? []);
  const notify = useNotify();
  useEffect(() => {
    if (categoriesCache) return;
    let alive = true;
    financeApi
      .categories()
      .then((res) => {
        if (res.success && res.data) {
          categoriesCache = res.data;
          if (alive) setCategories(res.data);
        }
      })
      .catch((err: unknown) => notify.error(err, 'Finance categories could not be loaded.'));
    return () => {
      alive = false;
    };
  }, [notify]);
  return categories;
};

/** Answers a page from `cache` when it can (same or narrower search), otherwise loads and remembers it. */
const throughCache = async <T,>(
  cache: SearchResultCache<T, PageResponse<T>>,
  query: SearchQuery,
  load: () => Promise<ApiResponse<PageResponse<T>>>
): Promise<ApiResponse<PageResponse<T>>> => {
  const hit = cache.get(query);
  if (hit) return { success: true, message: '', errorCode: null, data: hit, timestamp: '', path: '' };
  const res = await load();
  if (res.success && res.data) cache.set(query, res.data);
  return res;
};

/** A searchable page list: remembered results are reused; `refresh` (after a change) drops them first. */
const useSearchableList = <T,>(
  cache: SearchResultCache<T, PageResponse<T>>,
  load: () => Promise<ApiResponse<PageResponse<T>>>,
  enabled: boolean,
  failure: string
) => {
  const result = useLoad<PageResponse<T>>(load, enabled, failure);
  const { refresh } = result;
  const refreshFresh = useCallback(() => {
    cache.clear();
    return refresh();
  }, [cache, refresh]);
  return { ...result, refresh: refreshFresh };
};

// The backend's search fields (LedgerEntryRepository#search, VoucherRepository#search).
const matchesLedgerEntry = (e: LedgerEntry, term: string) => containsTerm(term, e.description, e.reference, e.counterparty);
const matchesVoucher = (v: Voucher, term: string) => containsTerm(term, v.title, v.voucherNumber, v.payee, v.reference);

export const useFinanceOverview = (period: Period, granularity?: Granularity) => {
  const { can } = useAccess();
  const load = useCallback(() => financeApi.overview(period, granularity), [period, granularity]);
  return useLoad<FinanceOverview>(load, can('FINANCE_REPORT_VIEW'), 'The finance overview could not be loaded.');
};

/** `enabled` false holds the request, e.g. while the search box is still being typed in. */
export const useLedger = ({ from, to, category, section, source, search, page, size }: LedgerListParams, enabled = true) => {
  const { can } = useAccess();
  const [cache] = useState(() => createSearchResultCache<LedgerEntry, PageResponse<LedgerEntry>>({ matches: matchesLedgerEntry }));
  const load = useCallback(
    () =>
      throughCache(
        cache,
        { scope: JSON.stringify({ from, to, category, section, source, size }), term: search ?? '', page: page ?? 0 },
        () => financeApi.ledger({ from, to, category, section, source, search, page, size })
      ),
    [cache, from, to, category, section, source, search, page, size]
  );
  return useSearchableList(cache, load, enabled && can('FINANCE_REPORT_VIEW'), 'The ledger could not be loaded.');
};

export const useGstSummary = (period: Period) => {
  const { can } = useAccess();
  const load = useCallback(() => financeApi.gstSummary(period), [period]);
  return useLoad<GstSummary>(load, can('FINANCE_REPORT_VIEW'), 'The GST position could not be loaded.');
};

// The backend's search fields (GstRegisterRepository#search).
const matchesGstRow = (e: GstRegisterEntry, term: string) =>
  containsTerm(term, e.documentNumber, e.orderReference, e.description, e.counterpartyName, e.counterpartyGstin);

/** `enabled` false holds the request, e.g. while the search box is still being typed in. */
export const useGstRegister = ({ from, to, direction, source, search, page, size }: GstRegisterParams, enabled = true) => {
  const { can } = useAccess();
  const [cache] = useState(() => createSearchResultCache<GstRegisterEntry, PageResponse<GstRegisterEntry>>({ matches: matchesGstRow }));
  const load = useCallback(
    () =>
      throughCache(
        cache,
        { scope: JSON.stringify({ from, to, direction, source, size }), term: search ?? '', page: page ?? 0 },
        () => financeApi.gstRegister({ from, to, direction, source, search, page, size })
      ),
    [cache, from, to, direction, source, search, page, size]
  );
  return useSearchableList(cache, load, enabled && can('FINANCE_REPORT_VIEW'), 'The GST register could not be loaded.');
};

export const useVoucherList = ({ status, category, submittedBy, reference, search, page, size }: VoucherListParams, enabled = true) => {
  const { can } = useAccess();
  const [cache] = useState(() => createSearchResultCache<Voucher, PageResponse<Voucher>>({ matches: matchesVoucher }));
  const load = useCallback(
    () =>
      throughCache(
        cache,
        { scope: JSON.stringify({ status, category, submittedBy, reference, size }), term: search ?? '', page: page ?? 0 },
        () => financeApi.listVouchers({ status, category, submittedBy, reference, search, page, size })
      ),
    [cache, status, category, submittedBy, reference, search, page, size]
  );
  return useSearchableList(cache, load, enabled && can('EXPENSE_VIEW'), 'Vouchers could not be loaded.');
};

