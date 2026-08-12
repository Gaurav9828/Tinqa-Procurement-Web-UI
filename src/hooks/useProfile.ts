import { useState, useEffect, useMemo, useRef } from 'react';
import { authService } from '../api/services/authService';
import type { AdminProfile } from '../types/auth';

export interface ProfileFormState {
    username: string;
    email: string;
    employee_code: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    display_name: string;
    date_of_birth: string;
    gender: string;
    designation: string;
    department: string;
    employment_type: string;
    joining_date: string;
    phone: string;
    alternate_phone: string;
    personal_email: string;
    status: string;
}

const EMPTY_FORM_STATE: ProfileFormState = {
    username: '',
    email: '',
    employee_code: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    display_name: '',
    date_of_birth: '',
    gender: '',
    designation: '',
    department: '',
    employment_type: '',
    joining_date: '',
    phone: '',
    alternate_phone: '',
    personal_email: '',
    status: '',
};

interface ApiResponseEnvelope<T> {
    success?: boolean;
    message?: string;
    data?: T;
}

export const useProfile = () => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [fetchError, setFetchError] = useState<string>('');
    const [updateStatus, setUpdateStatus] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);

    const [initialData, setInitialData] = useState<ProfileFormState>(EMPTY_FORM_STATE);
    const [employeeData, setEmployeeData] = useState<ProfileFormState>(EMPTY_FORM_STATE);
    const clearUpdateStatus = () => setUpdateStatus(null);
    const clearUpdateError = () => setUpdateError(null);
    // Ref guard prevents React 18 Strict Mode double-fetching
    const isFetched = useRef(false);

    useEffect(() => {
        if (isFetched.current) return;
        isFetched.current = true;

        const controller = new AbortController();

        const fetchProfile = async () => {
            setIsLoading(true);
            setFetchError('');
            try {
                const rawResponse = await authService.getProfile();
                const envelope = rawResponse as ApiResponseEnvelope<AdminProfile> & AdminProfile;
                const profilePayload: AdminProfile = envelope.data || envelope;

                const mappedData: ProfileFormState = {
                    username: profilePayload.username || '',
                    email: profilePayload.workEmail || '',
                    employee_code: profilePayload.employeeCode || '',
                    first_name: profilePayload.firstName || '',
                    middle_name: profilePayload.middleName || '',
                    last_name: profilePayload.lastName || '',
                    display_name: profilePayload.displayName || '',
                    date_of_birth: profilePayload.dateOfBirth || '',
                    gender: profilePayload.gender || 'MALE',
                    designation: profilePayload.designation || '',
                    department: profilePayload.department || '',
                    employment_type: profilePayload.employmentType || '',
                    joining_date: profilePayload.joiningDate || '',
                    phone: profilePayload.primaryPhone || '',
                    alternate_phone: profilePayload.alternatePhone || '',
                    personal_email: profilePayload.personalEmail || '',
                    status: profilePayload.status || 'ACTIVE',
                };

                setInitialData(mappedData);
                setEmployeeData(mappedData);
            } catch (err: unknown) {
                if ((err as Error).name === 'CanceledError' || (err as Error).name === 'AbortError') return;

                if (typeof err === 'object' && err !== null && 'response' in err) {
                    const apiError = err as { response?: { data?: { message?: string } } };
                    setFetchError(apiError.response?.data?.message || 'Failed to load profile details.');
                } else if (err instanceof Error) {
                    setFetchError(err.message);
                } else {
                    setFetchError('An unexpected error occurred while loading profile data.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();

        return () => controller.abort();
    }, []);

    // Compute modified fields only
    const dirtyFields = useMemo(() => {
        const payload: Partial<Record<string, string>> = {};

        if (employeeData.display_name !== initialData.display_name) payload.displayName = employeeData.display_name;
        if (employeeData.phone !== initialData.phone) payload.primaryPhone = employeeData.phone;
        if (employeeData.alternate_phone !== initialData.alternate_phone) payload.alternatePhone = employeeData.alternate_phone;
        if (employeeData.personal_email !== initialData.personal_email) payload.personalEmail = employeeData.personal_email;
        if (employeeData.date_of_birth !== initialData.date_of_birth) payload.dateOfBirth = employeeData.date_of_birth;
        if (employeeData.first_name !== initialData.first_name) payload.firstName = employeeData.first_name;
        if (employeeData.middle_name !== initialData.middle_name) payload.middleName = employeeData.middle_name;
        if (employeeData.last_name !== initialData.last_name) payload.lastName = employeeData.last_name;
        if (employeeData.department !== initialData.department) payload.department = employeeData.department;
        if (employeeData.designation !== initialData.designation) payload.designation = employeeData.designation;
        if (employeeData.gender !== initialData.gender) payload.gender = employeeData.gender;
        if (employeeData.employment_type !== initialData.employment_type) payload.employmentType = employeeData.employment_type;
        if (employeeData.joining_date !== initialData.joining_date) payload.joiningDate = employeeData.joining_date;
        if (employeeData.status !== initialData.status) payload.status = employeeData.status;

        return payload;
    }, [employeeData, initialData]);

    const hasChanges = useMemo(() => Object.keys(dirtyFields).length > 0, [dirtyFields]);

    const updateProfile = async () => {
        if (!hasChanges) return;

        setIsUpdating(true);
        setUpdateStatus(null);
        setUpdateError(null);

        try {
            const response = await authService.updateProfile(dirtyFields);
            setUpdateStatus(response.message || 'Profile update submitted successfully!');
            setInitialData(employeeData);
            setTimeout(() => setUpdateStatus(null), 4000);
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const apiError = err as { response?: { data?: { message?: string } } };
                setUpdateError(apiError.response?.data?.message || 'Failed to update profile.');
            } else if (err instanceof Error) {
                setUpdateError(err.message);
            } else {
                setUpdateError('An unexpected error occurred while updating profile.');
            }
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        isLoading,
        isUpdating,
        fetchError,
        updateStatus,
        updateError,
        employeeData,
        setEmployeeData,
        hasChanges,
        updateProfile,
        clearUpdateStatus,
        clearUpdateError
    };
};