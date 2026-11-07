import { useState, useEffect, useCallback } from 'react';
import { supplierApi } from '../api/supplierApi';
import type { SupplierResponse } from '../types/supplier.types';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { isActiveFromStatuses } from '../../../utils/activeStatusFilter';
import { containsTerm, createSearchResultCache, type SearchPage } from '../../../utils/searchResultCache';

export const SUPPLIER_PAGE_SIZE = 20;

export interface SupplierListFilters {
    page: number;
    search: string;
    categoryIds: number[];
    cities: string[];
    /** Header filter values ('Active' / 'Inactive'). */
    statuses: string[];
}

const INITIAL_FILTERS: SupplierListFilters = { page: 0, search: '', categoryIds: [], cities: [], statuses: [] };

// The backend's supplier search fields (SupplierServiceImpl#matching).
const matchesSupplier = (d: SupplierResponse, term: string) =>
    containsTerm(term, d.name, d.tradeName, d.gstin, d.panNumber, d.phoneNumber, d.email, d.city);

/** Server-side paginated supplier directory: search and every filter are applied by the backend across all pages. */
export const useSupplierList = () => {
    const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filters, setFilters] = useState<SupplierListFilters>(INITIAL_FILTERS);
    const [cities, setCities] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const { term: search, pending: searchPending, flush: searchNow } = useSearchTerm(filters.search);
    const [cache] = useState(() => createSearchResultCache<SupplierResponse>({ matches: matchesSupplier }));
    const notify = useNotify();
    const beginRequest = useLatestRequest();
    const { page, categoryIds, cities: selectedCities, statuses } = filters;

    const fetchSuppliers = useCallback(async () => {
        const isCurrent = beginRequest();
        const query = { scope: JSON.stringify({ categoryIds, selectedCities, statuses }), term: search, page };
        const show = (data: SearchPage<SupplierResponse>) => {
            // An action can empty the last page (e.g. deactivating its only row under an "Active" filter); step back.
            if (page > 0 && page >= data.totalPages) {
                setFilters((prev) => ({ ...prev, page: Math.max(0, data.totalPages - 1) }));
                return;
            }
            setSuppliers(data.content);
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
            const res = await supplierApi.getAllSuppliers({
                page,
                size: SUPPLIER_PAGE_SIZE,
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
                notify.error(res, 'Failed to load suppliers');
            }
        } catch (err: unknown) {
            if (isCurrent()) notify.error(err, 'Failed to load suppliers');
        } finally {
            if (isCurrent()) setIsLoading(false);
        }
    }, [notify, beginRequest, cache, page, search, categoryIds, selectedCities, statuses]);

    /** Options of the City column filter: every supplier city, not only the loaded page's. */
    const loadCities = useCallback(async () => {
        try {
            const res = await supplierApi.getSupplierCities();
            if (res.success && res.data) setCities(res.data);
        } catch (err: unknown) {
            notify.error(err, 'Failed to load supplier cities.');
        }
    }, [notify]);

    useEffect(() => {
        if (!searchPending) fetchSuppliers();
    }, [fetchSuppliers, searchPending]);

    useEffect(() => {
        loadCities();
    }, [loadCities]);

    /** After a save: the rows (remembered results dropped) and the city options (a supplier may have a new city). */
    const refetch = useCallback(async () => {
        cache.clear();
        await Promise.all([fetchSuppliers(), loadCities()]);
    }, [cache, fetchSuppliers, loadCities]);

    /** Any filter change returns to the first page. */
    const updateFilter = useCallback(
        <K extends Exclude<keyof SupplierListFilters, 'page'>>(key: K, value: SupplierListFilters[K]) =>
            setFilters((prev) => ({ ...prev, [key]: value, page: 0 })),
        []
    );

    const setPage = useCallback((next: number) => setFilters((prev) => ({ ...prev, page: next })), []);

    return {
        suppliers,
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
