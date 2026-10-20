import { useState, useEffect, useCallback } from 'react';
import { dealerApi } from '../api/dealerApi';
import type { DealerResponse } from '../types/dealer.types';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { isActiveFromStatuses } from '../../../utils/activeStatusFilter';
import { containsTerm, createSearchResultCache, type SearchPage } from '../../../utils/searchResultCache';

export const DEALER_PAGE_SIZE = 20;

export interface DealerListFilters {
    page: number;
    search: string;
    categoryIds: number[];
    cities: string[];
    /** Header filter values ('Active' / 'Inactive'). */
    statuses: string[];
}

const INITIAL_FILTERS: DealerListFilters = { page: 0, search: '', categoryIds: [], cities: [], statuses: [] };

// The backend's dealer search fields (DealerServiceImpl#matching).
const matchesDealer = (d: DealerResponse, term: string) =>
    containsTerm(term, d.name, d.tradeName, d.gstin, d.panNumber, d.phoneNumber, d.email, d.city);

/** Server-side paginated dealer directory: search and every filter are applied by the backend across all pages. */
export const useDealerList = () => {
    const [dealers, setDealers] = useState<DealerResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState<DealerListFilters>(INITIAL_FILTERS);
    const [cities, setCities] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const { term: search, pending: searchPending, flush: searchNow } = useSearchTerm(filters.search);
    const [cache] = useState(() => createSearchResultCache<DealerResponse>({ matches: matchesDealer }));
    const notify = useNotify();
    const beginRequest = useLatestRequest();
    const { page, categoryIds, cities: selectedCities, statuses } = filters;

    const fetchDealers = useCallback(async () => {
        const isCurrent = beginRequest();
        const query = { scope: JSON.stringify({ categoryIds, selectedCities, statuses }), term: search, page };
        const show = (data: SearchPage<DealerResponse>) => {
            // An action can empty the last page (e.g. deactivating its only row under an "Active" filter); step back.
            if (page > 0 && page >= data.totalPages) {
                setFilters((prev) => ({ ...prev, page: Math.max(0, data.totalPages - 1) }));
                return;
            }
            setDealers(data.content);
            setTotalElements(data.totalElements);
            setTotalPages(data.totalPages);
        };
        const cached = cache.get(query);
        if (cached) {
            show(cached);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = await dealerApi.getAllDealers({
                page,
                size: DEALER_PAGE_SIZE,
                sort: 'name,asc',
                search,
                categoryIds,
                cities: selectedCities,
                isActive: isActiveFromStatuses(statuses),
            });
            if (!isCurrent()) return;
            if (res.data?.content) {
                cache.set(query, res.data);
                show(res.data);
            } else {
                notify.error(res, 'Failed to load dealers');
            }
        } catch (err: unknown) {
            if (isCurrent()) notify.error(err, 'Failed to load dealers');
        } finally {
            if (isCurrent()) setIsLoading(false);
        }
    }, [notify, beginRequest, cache, page, search, categoryIds, selectedCities, statuses]);

    /** Options of the City column filter: every dealer city, not only the loaded page's. */
    const loadCities = useCallback(async () => {
        try {
            const res = await dealerApi.getDealerCities();
            if (res.success && res.data) setCities(res.data);
        } catch (err: unknown) {
            notify.error(err, 'Failed to load dealer cities.');
        }
    }, [notify]);

    useEffect(() => {
        if (!searchPending) fetchDealers();
    }, [fetchDealers, searchPending]);

    useEffect(() => {
        loadCities();
    }, [loadCities]);

    /** After a save: the rows (remembered results dropped) and the city options (a dealer may have a new city). */
    const refetch = useCallback(async () => {
        cache.clear();
        await Promise.all([fetchDealers(), loadCities()]);
    }, [cache, fetchDealers, loadCities]);

    /** Any filter change returns to the first page. */
    const updateFilter = useCallback(
        <K extends Exclude<keyof DealerListFilters, 'page'>>(key: K, value: DealerListFilters[K]) =>
            setFilters((prev) => ({ ...prev, [key]: value, page: 0 })),
        []
    );

    const setPage = useCallback((next: number) => setFilters((prev) => ({ ...prev, page: next })), []);

    return {
        dealers,
        totalElements,
        totalPages,
        isLoading,
        filters,
        cityOptions: cities,
        updateFilter,
        setPage,
        searchNow,
        refetch,
    };
};
