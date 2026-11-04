import { useCallback, useMemo, useState } from 'react';
import { promoCodesApi } from '../api/promoCodesApi';
import type { PromoStatusFilter } from '../types/promoCode.types';
import { PROMO_HISTORY_PAGE_SIZE, PROMO_PAGE_SIZE, PROMO_SEARCH_MAX_LENGTH } from '../utils/promoCodeForm';
import { useAccess } from '../../../hooks/useAccess';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { usePagedSearch, useRecord } from '../../careers/hooks/useCareerLoaders';

/**
 * GET /admin/promo-codes (PROMO_CODE_VIEW): one page of codes starting with the search text, optionally of one
 * status. The search settles through useSearchTerm (2 s, Enter at once) and answered queries come from the search
 * cache (rules 28). `refresh` after a change asks again.
 */
export const usePromoCodes = () => {
  const allowed = useAccess().can('PROMO_CODE_VIEW');
  const [search, setSearchText] = useState('');
  const [status, setStatusValue] = useState<PromoStatusFilter>('');
  const [page, setPage] = useState(0);
  const { term, pending, flush } = useSearchTerm(search);

  const load = useCallback(
    (searchTerm: string, pageNumber: number) => promoCodesApi.list({ search: searchTerm, status, page: pageNumber, size: PROMO_PAGE_SIZE }),
    [status]
  );
  const list = usePagedSearch(load, {
    scope: JSON.stringify({ status }),
    term,
    pending,
    page,
    enabled: allowed,
    failure: 'Failed to load promo codes.',
  });

  const setSearch = useCallback((value: string) => {
    setSearchText(value.slice(0, PROMO_SEARCH_MAX_LENGTH));
    setPage(0);
  }, []);
  const setStatus = useCallback((value: PromoStatusFilter) => {
    setStatusValue(value);
    setPage(0);
  }, []);

  return {
    codes: list.data?.content ?? [],
    totalElements: list.data?.totalElements ?? 0,
    totalPages: list.data?.totalPages ?? 0,
    hasLoaded: !!list.data,
    isLoading: list.isLoading,
    loadFailed: list.loadFailed,
    refresh: list.refresh,
    search,
    setSearch,
    searchNow: flush,
    status,
    setStatus,
    page,
    setPage,
  };
};

/** GET /admin/promo-codes/{id} (PROMO_CODE_VIEW), only while its detail is open (`id` set). */
export const usePromoCodeDetail = (id: number | null) => {
  const allowed = useAccess().can('PROMO_CODE_VIEW');
  const load = useCallback(() => promoCodesApi.get(id as number), [id]);
  return useRecord(load, allowed && id !== null, 'Failed to load the promo code.');
};

/** GET /admin/promo-codes/{id}/redemptions (PROMO_CODE_VIEW), only while its use history is open. */
export const usePromoRedemptions = (id: number | null, open: boolean) => {
  const allowed = useAccess().can('PROMO_CODE_VIEW');
  const [page, setPage] = useState(0);
  const load = useCallback(
    (_term: string, pageNumber: number) => promoCodesApi.redemptions(id as number, pageNumber, PROMO_HISTORY_PAGE_SIZE),
    [id]
  );
  const scope = useMemo(() => String(id), [id]);
  const history = usePagedSearch(load, {
    scope,
    term: '',
    pending: false,
    page,
    enabled: allowed && open && id !== null,
    failure: 'Failed to load the use history.',
  });
  return {
    rows: history.data?.content ?? [],
    totalPages: history.data?.totalPages ?? 0,
    totalElements: history.data?.totalElements ?? 0,
    hasLoaded: !!history.data,
    isLoading: history.isLoading,
    loadFailed: history.loadFailed,
    refresh: history.refresh,
    page,
    setPage,
  };
};
