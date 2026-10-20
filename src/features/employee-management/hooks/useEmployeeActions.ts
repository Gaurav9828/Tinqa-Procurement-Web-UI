import { useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAccess } from '../../../hooks/useAccess';
import { employeeApi } from '../api/employeeApi';
import { useNotify } from '../../../hooks/useNotify';
import { getApiFieldErrors } from '../../../utils/apiError';
import type { CreateEmployeeRequest, EmployeeResponse, UpdateEmployeeRequest } from '../types/employee.types';
import { EmployeeConstants, SELF_LOCKED_FIELDS } from '../types/employee.types';
import { creationNeedsApproval } from '../utils/employeeRole';

/** Field errors are keyed by the API's `field` (e.g. `role`, `designation`) so the form can show them inline. */
export type EmployeeSaveResult = { ok: true; employee?: EmployeeResponse } | { ok: false; fieldErrors: Record<string, string> };

const APPROVAL_NOTE = "They can't sign in until another administrator who can approve employees approves them.";

export const useEmployeeActions = (onSuccessCallback?: () => void) => {
    const user = useAuthStore((state) => state.user);
    const { can } = useAccess();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const notify = useNotify();


    /** True when the employee record belongs to the signed-in admin. UX only — the backend must enforce it too. */
    const isSelf = (emp: Pick<EmployeeResponse, 'userId' | 'username'>): boolean => {
        if (!user) return false;
        if (user.userId != null && emp.userId != null) return user.userId === emp.userId;
        return !!user.username && !!emp.username && user.username.trim().toLowerCase() === emp.username.trim().toLowerCase();
    };

    const createEmployee = async (data: CreateEmployeeRequest): Promise<EmployeeSaveResult> => {
        setIsSubmitting(true);
        try {
            const res = await employeeApi.createEmployee(data);
            if (res.success) {
                // The response status is authoritative; the backend's rule is the fallback.
                const pending = res.data?.status
                    ? res.data.status === EmployeeConstants.APPROVAL_PENDING
                    : creationNeedsApproval(can('EMPLOYEE_APPROVE'), data.role, data.designation);
                if (pending) {
                    notify.warning(`Employee created and sent for approval (status: APPROVAL_PENDING). ${APPROVAL_NOTE}`);
                } else {
                    notify.success(res.message || 'Employee created successfully');
                }
                onSuccessCallback?.();
                return { ok: true, employee: res.data };
            }
            notify.error(res, 'Failed to create employee');
            return { ok: false, fieldErrors: getApiFieldErrors(res) };
        } catch (err: unknown) {
            notify.error(err, 'Error occurred while creating employee.');
            return { ok: false, fieldErrors: getApiFieldErrors(err) };
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateEmployee = async (
        id: number,
        payload: UpdateEmployeeRequest,
        target?: Pick<EmployeeResponse, 'userId' | 'username'>
    ): Promise<EmployeeSaveResult> => {
        if (target && isSelf(target) && SELF_LOCKED_FIELDS.some((field) => payload[field] !== undefined)) {
            notify.error('You cannot change your own admin level, designation, department, salary, employment terms or status.');
            return { ok: false, fieldErrors: {} };
        }
        if (payload.role !== undefined && !can('EMPLOYEE_APPROVE')) {
            notify.error('Only an administrator who can approve employees can change an admin level.');
            return { ok: false, fieldErrors: {} };
        }
        setIsSubmitting(true);
        try {
            const res = await employeeApi.updateEmployee(id, payload);
            if (res.success) {
                // Report what the server says happened — e.g. a promotion to ADMIN_L2 may wait for approval.
                const message = res.message || 'Employee updated successfully';
                if (res.data?.status === EmployeeConstants.APPROVAL_PENDING) {
                    notify.warning(`${message} Status: APPROVAL_PENDING — the change takes effect once another administrator approves it.`);
                } else {
                    notify.success(res.data?.status ? `${message} Status: ${res.data.status}.` : message);
                }
                // Refetch the list so the saved record (role, designation, status) shows server truth.
                if (onSuccessCallback) onSuccessCallback();
                return { ok: true, employee: res.data };
            }
            notify.error(res, 'Failed to update employee');
            return { ok: false, fieldErrors: getApiFieldErrors(res) };
        } catch (err: unknown) {
            notify.error(err, 'Error occurred while updating employee.');
            return { ok: false, fieldErrors: getApiFieldErrors(err) };
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
            notify.error(res, 'Failed to request deletion');
            return false;
        } catch (err: unknown) {
            notify.error(err, 'Error requesting employee deletion.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const finalizeDelete = async (id: number): Promise<boolean> => {
        if (!can('EMPLOYEE_DELETE')) {
            notify.error("Your designation doesn't include deleting employee records.");
            return false;
        }
        setIsSubmitting(true);
        try {
            const res = await employeeApi.finalizeDeleteEmployee(id);
            if (res.success) {
                notify.success(res.message || 'Employee deleted. The record is kept with status DELETED.');
                if (onSuccessCallback) onSuccessCallback();
                return true;
            }
            notify.error(res, 'Failed to delete employee');
            return false;
        } catch (err: unknown) {
            notify.error(err, 'Error deleting employee.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        isSubmitting,
        isSelf,
        createEmployee,
        updateEmployee,
        requestDeletion,
        finalizeDelete,
    };
};