import { useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { employeeApi } from '../api/employeeApi';
import type { CreateEmployeeRequest, UpdateEmployeeRequest } from '../types/employee.types';

export const useEmployeeActions = (onSuccessCallback?: () => void) => {
    const { user } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const userRole = user?.role || 'ADMIN_L1';

    const clearMessages = () => {
        setActionError(null);
        setActionSuccess(null);
    };

    const createEmployee = async (data: CreateEmployeeRequest) => {
        setIsSubmitting(true);
        try {
            const res = await employeeApi.createEmployee(data);
            if (res.success) {
                setActionSuccess('Employee created successfully');
                onSuccessCallback?.(); // 👈 Refetch called ONLY after user action succeeds
                return true;
            }
        } catch (err) {
            // handle error
        } finally {
            setIsSubmitting(false);
        }
        return false;
    };

    const updateEmployee = async (id: number, payload: UpdateEmployeeRequest): Promise<boolean> => {
        setIsSubmitting(true);
        clearMessages();
        try {
            const res = await employeeApi.updateEmployee(id, payload);
            if (res.success) {
                setActionSuccess(res.message || 'Employee updated successfully');
                if (onSuccessCallback) onSuccessCallback();
                return true;
            }
            setActionError(res.message || 'Failed to update employee');
            return false;
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setActionError(apiErr.response?.data?.message || 'Error occurred while updating employee.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestDeletion = async (id: number): Promise<boolean> => {
        setIsSubmitting(true);
        clearMessages();
        try {
            const res = await employeeApi.requestEmployeeDeletion(id);
            if (res.success) {
                setActionSuccess('Employee marked as WAITING_FOR_DELETION.');
                if (onSuccessCallback) onSuccessCallback();
                return true;
            }
            setActionError(res.message || 'Failed to request deletion');
            return false;
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setActionError(apiErr.response?.data?.message || 'Error requesting employee deletion.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const finalizeDelete = async (id: number): Promise<boolean> => {
        if (userRole !== 'ADMIN_L2') {
            setActionError('Permission Denied: Only ADMIN_L2 can permanently delete employee records.');
            return false;
        }
        setIsSubmitting(true);
        clearMessages();
        try {
            const res = await employeeApi.finalizeDeleteEmployee(id);
            if (res.success) {
                setActionSuccess('Employee permanently deleted.');
                if (onSuccessCallback) onSuccessCallback();
                return true;
            }
            setActionError(res.message || 'Failed to permanently delete employee');
            return false;
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setActionError(apiErr.response?.data?.message || 'Error executing permanent deletion.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        isSubmitting,
        actionError,
        actionSuccess,
        userRole,
        clearMessages,
        createEmployee,
        updateEmployee,
        requestDeletion,
        finalizeDelete,
    };
};