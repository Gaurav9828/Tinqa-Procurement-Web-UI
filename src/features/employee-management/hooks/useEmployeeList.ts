import { useState, useEffect, useCallback, useRef } from 'react';
import { employeeApi } from '../api/employeeApi';
import type { EmployeeFilterParams, EmployeeResponse } from '../types/employee.types';

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
  const [error, setError] = useState<string | null>(null);

  // Keep track of the current active API request to prevent duplicate concurrent executions
  const isFetchingRef = useRef(false);

  const executeFetch = async (currentFilters: EmployeeFilterParams) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await employeeApi.getEmployees(currentFilters);
      if (response.success && response.data) {
        setEmployees(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
      } else {
        setError(response.message || 'Failed to fetch employee list.');
      }
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const apiError = err as { response?: { data?: { message?: string } } };
        setError(apiError.response?.data?.message || 'Server error fetching employees.');
      } else {
        setError('An unexpected error occurred while fetching employee records.');
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // 1. Fetch strictly when filters change
  useEffect(() => {
    executeFetch(filters);
  }, [filters.page, filters.size, filters.sort, filters.search, filters.status]);

  // 2. Stable manual refetch function for buttons / post-action triggers
  const refetch = useCallback(() => {
    executeFetch(filters);
  }, [filters]);

  const updateSearch = (search: string) => setFilters((prev) => ({ ...prev, search, page: 0 }));
  const updateStatus = (status: EmployeeFilterParams['status']) =>
    setFilters((prev) => ({ ...prev, status, page: 0 }));
  const updatePage = (page: number) => setFilters((prev) => ({ ...prev, page }));

  return {
    employees,
    totalPages,
    totalElements,
    isLoading,
    error,
    filters,
    updateSearch,
    updateStatus,
    updatePage,
    refetch,
  };
};