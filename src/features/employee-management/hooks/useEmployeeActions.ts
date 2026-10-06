import { useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { employeeApi } from '../api/employeeApi';
import { useNotify } from '../../../hooks/useNotify';
import type { CreateEmployeeRequest, UpdateEmployeeRequest } from '../types/employee.types';

export const useEmployeeActions = (onSuccessCallback?: () => void) => {
    const { user } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const notify = useNotify();

    const userRole = user?.role ?? '';

    const createEmployee = async (data: CreateEmployeeRequest): Promise<boolean> => {
        setIsSubmitting(true);
        try {
            const res = await employeeApi.createEmployee(data);
            if (res.success) {
                notify.success(res.message || 'Employee created successfully');
                onSuccessCallback?.();
                return true;
            }
            notify.error(res.message || 'Failed to create employee');
            return false;
        } catch (err: unknown) {
            notify.error(err, 'Error occurred while creating employee.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateEmployee = async (id: number, payload: UpdateEmployeeRequest): Promise<boolean> => {
        setIsSubmitting(true);
        try {
            const res = await employeeApi.updateEmployee(id, payload);
            if (res.success) {
                notify.success(res.message || 'Employee updated successfully');
                if (onSuccessCallback) onSuccessCallback();
                return true;
            }
            notify.error(res.message || 'Failed to update employee');
            return false;
        } catch (err: unknown) {
            notify.error(err, 'Error occurred while updating employee.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestDeletion = async (id: number): Promise<boolean> => {
        setIsSubmitting(true);
        try {
            const res = await employeeApi.requestEmployeeDeletion(id);
            if (res.success) {
                notify.success('Employee marked as WAITING_FOR_DELETION.');
                if (onSuccessCallback) onSuccessCallback();
                return true;
            }
            notify.error(res.message || 'Failed to request deletion');
            return false;
        } catch (err: unknown) {
            notify.error(err, 'Error requesting employee deletion.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const finalizeDelete = async (id: number): Promise<boolean> => {
        if (userRole !== 'ADMIN_L2') {
            notify.error('Permission Denied: Only ADMIN_L2 can permanently delete employee records.');
            return false;
        }
        setIsSubmitting(true);
        try {
            const res = await employeeApi.finalizeDeleteEmployee(id);
            if (res.success) {
                notify.success('Employee permanently deleted.');
                if (onSuccessCallback) onSuccessCallback();
                return true;
            }
            notify.error(res.message || 'Failed to permanently delete employee');
            return false;
        } catch (err: unknown) {
            notify.error(err, 'Error executing permanent deletion.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        isSubmitting,
        userRole,
        createEmployee,
        updateEmployee,
        requestDeletion,
        finalizeDelete,
    };
};