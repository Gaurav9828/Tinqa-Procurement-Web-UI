import { useState, useEffect, useCallback } from 'react';
import { employeeApi } from '../api/employeeApi';
import type { EmployeeFilterParams, EmployeeResponse } from '../types/employee.types';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

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
  const debouncedSearch = useDebouncedValue((filters.search || '').trim());
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const { page, size, sort, status } = filters;

  const fetchEmployees = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);

    try {
      const response = await employeeApi.getEmployees({ page, size, sort, status, search: debouncedSearch });
      if (!isCurrent()) return;
      if (response.success && response.data) {
        setEmployees(response.data.content);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
      } else {
        notify.error(response.message || 'Failed to fetch employee list.');
      }
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Server error fetching employees.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [notify, beginRequest, page, size, sort, status, debouncedSearch]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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
    refetch: fetchEmployees,
  };
};
