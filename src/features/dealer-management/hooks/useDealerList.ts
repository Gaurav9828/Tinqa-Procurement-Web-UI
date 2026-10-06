import { useState, useEffect, useCallback } from 'react';
import { dealerApi } from '../api/dealerApi';
import type { DealerResponse } from '../types/dealer.types';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

export const useDealerList = () => {
    const [dealers, setDealers] = useState<DealerResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState<number | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    const debouncedSearch = useDebouncedValue(search.trim());
    const notify = useNotify();
    const beginRequest = useLatestRequest();

    const fetchDealers = useCallback(async () => {
        const isCurrent = beginRequest();
        setIsLoading(true);
        try {
            const res = await dealerApi.getAllDealers({ search: debouncedSearch, categoryId, page, size: 10 });
            if (!isCurrent()) return;
            if (res.data?.content) {
                setDealers(res.data.content);
                setTotalElements(res.data.totalElements);
                setTotalPages(res.data.totalPages);
            } else {
                notify.error(res.message || 'Failed to load dealers');
            }
        } catch (err: unknown) {
            if (isCurrent()) notify.error(err, 'Failed to load dealers');
        } finally {
            if (isCurrent()) setIsLoading(false);
        }
    }, [notify, beginRequest, page, debouncedSearch, categoryId]);

    useEffect(() => {
        fetchDealers();
    }, [fetchDealers]);

    return {
        dealers,
        totalElements,
        totalPages,
        isLoading,
        page,
        setPage,
        filters: { search, categoryId },
        updateSearch: (q: string) => {
            setSearch(q);
            setPage(0);
        },
        updateCategoryFilter: (id?: number) => {
            setCategoryId(id);
            setPage(0);
        },
        refetch: fetchDealers,
    };
};
