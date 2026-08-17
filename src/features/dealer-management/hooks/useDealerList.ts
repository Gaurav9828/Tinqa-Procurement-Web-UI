import { useState, useEffect, useCallback } from 'react';
import { dealerApi } from '../api/dealerApi';
import type { DealerResponse } from '../types/dealer.types';

export const useDealerList = () => {
    const [dealers, setDealers] = useState<DealerResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState<number | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDealers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await dealerApi.getAllDealers({search: search, categoryId: categoryId, page: page, size: 10});
            if (res.data?.content) {
                setDealers(res.data.content);
                setTotalElements(res.data.totalElements);
                setTotalPages(res.data.totalPages);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load dealers');
        } finally {
            setIsLoading(false);
        }
    }, [page, search, categoryId]);

    useEffect(() => {
        fetchDealers();
    }, [fetchDealers]);

    return {
        dealers,
        totalElements,
        totalPages,
        isLoading,
        error,
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