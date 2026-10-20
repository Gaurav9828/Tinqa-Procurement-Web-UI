import { useState, useEffect, useCallback } from 'react';
import { employeeApi } from '../api/employeeApi';
import type { EmployeeFilterParams, EmployeeResponse } from '../types/employee.types';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { containsTerm, createSearchResultCache, type SearchPage } from '../../../utils/searchResultCache';

// The backend's employee search fields (EmployeeRepository search queries).
const matchesEmployee = (e: EmployeeResponse, term: string) =>
  containsTerm(term, e.firstName, e.lastName, `${e.firstName} ${e.lastName}`, e.employeeCode, e.department, e.phone);

export const useEmployeeList = (initialFilters: EmployeeFilterParams = {}) => {
  const [filters, setFilters] = useState<EmployeeFilterParams>({
    page: 0,
    size: 20,
    sort: 'createdAt,desc',
    search: '',
    status: '',
    ...initialFilters,
  });

  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // The input stays bound to `filters.search`; the API only sees the settled value.
  const { term: search, pending: searchPending, flush: searchNow } = useSearchTerm(filters.search || '');
  const [cache] = useState(() => createSearchResultCache<EmployeeResponse>({ matches: matchesEmployee }));
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const { page, size, sort, status } = filters;

  const fetchEmployees = useCallback(async () => {
    const isCurrent = beginRequest();
    const query = { scope: JSON.stringify({ size, sort, status }), term: search, page: page ?? 0 };
    const show = (data: SearchPage<EmployeeResponse>) => {
      setEmployees(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    };
    const cached = cache.get(query);
    if (cached) {
      show(cached);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const response = await employeeApi.getEmployees({ page, size, sort, status, search });
      if (!isCurrent()) return;
      if (response.success && response.data) {
        cache.set(query, response.data);
        show(response.data);
      } else {
        notify.error(response, 'Failed to fetch employee list.');
      }
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Server error fetching employees.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [notify, beginRequest, cache, page, size, sort, status, search]);

  useEffect(() => {
    if (!searchPending) fetchEmployees();
  }, [fetchEmployees, searchPending]);

  /** After a change to the data: drop remembered results and load again. */
  const refetch = useCallback(() => {
    cache.clear();
    return fetchEmployees();
  }, [cache, fetchEmployees]);

  const updateSearch = (search: string) => setFilters((prev) => ({ ...prev, search, page: 0 }));
  const updateStatus = (status: EmployeeFilterParams['status']) =>
    setFilters((prev) => ({ ...prev, status, page: 0 }));
  const updatePage = (page: number) => setFilters((prev) => ({ ...prev, page }));

  return {
    employees,
    totalPages,
    totalElements,
    isLoading,
    filters,
    updateSearch,
    updateStatus,
    updatePage,
    searchNow,
    refetch,
  };
};
