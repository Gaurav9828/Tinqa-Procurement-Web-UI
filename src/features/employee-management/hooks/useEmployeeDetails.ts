import { useState, useCallback } from 'react';
import { employeeApi } from '../api/employeeApi';
import type { EmployeeResponse } from '../types/employee.types';
import { useNotify } from '../../../hooks/useNotify';

export const useEmployeeDetails = () => {
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const notify = useNotify();

  const fetchDetails = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      const response = await employeeApi.getEmployeeById(id);
      if (response.success && response.data) {
        setEmployee(response.data);
      } else {
        notify.error(response.message || 'Unable to retrieve employee details.');
      }
    } catch (err: unknown) {
      notify.error(err, 'Error fetching employee details.');
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  return {
    employee,
    isLoading,
    fetchDetails,
    clearDetails: () => setEmployee(null),
  };
};
