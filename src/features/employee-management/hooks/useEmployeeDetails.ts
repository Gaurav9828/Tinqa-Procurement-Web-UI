import { useState, useCallback } from 'react';
import { employeeApi } from '../api/employeeApi';
import type { EmployeeResponse } from '../types/employee.types';

export const useEmployeeDetails = () => {
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeApi.getEmployeeById(id);
      if (response.success && response.data) {
        setEmployee(response.data);
      } else {
        setError(response.message || 'Unable to retrieve employee details.');
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr.response?.data?.message || 'Error fetching employee details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    employee,
    isLoading,
    error,
    fetchDetails,
    clearDetails: () => setEmployee(null),
  };
};