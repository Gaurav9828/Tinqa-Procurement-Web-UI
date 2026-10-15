import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../api/services/authService';
import { useNotify } from './useNotify';
import { useAppDispatch, useAppSelector } from '../store/store';
import { fetchProfile, profileSaved, type ProfileFormState } from '../store/profileSlice';

export type { ProfileFormState };

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
    designation_label: '',
    department: '',
    employment_type: '',
    joining_date: '',
    phone: '',
    alternate_phone: '',
    personal_email: '',
    status: '',
};

export const useProfile = () => {
    const dispatch = useAppDispatch();
    const notify = useNotify();
    // The profile lives in Redux, so it is fetched once per session — not on every visit to the page.
    const cached = useAppSelector((state) => state.profile.data);
    const status = useAppSelector((state) => state.profile.status);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);

    const initialData = cached ?? EMPTY_FORM_STATE;
    // Unsaved edits; null means "same as the saved profile".
    const [draft, setDraft] = useState<ProfileFormState | null>(null);
    const employeeData = draft ?? initialData;

    useEffect(() => {
        // No-op while a request is in flight or once the profile is loaded (see fetchProfile's condition).
        dispatch(fetchProfile());
    }, [dispatch]);

    const setEmployeeData = useCallback<React.Dispatch<React.SetStateAction<ProfileFormState>>>(
        (value) => setDraft((prev) => (typeof value === 'function' ? value(prev ?? initialData) : value)),
        [initialData]
    );

    // Compute modified fields only
    const dirtyFields = useMemo(() => {
        const payload: Partial<Record<string, string>> = {};

        if (employeeData.display_name !== initialData.display_name) payload.displayName = employeeData.display_name.trim();
        if (employeeData.phone !== initialData.phone) payload.primaryPhone = employeeData.phone.trim();
        if (employeeData.alternate_phone !== initialData.alternate_phone) payload.alternatePhone = employeeData.alternate_phone.trim();
        if (employeeData.personal_email !== initialData.personal_email) payload.personalEmail = employeeData.personal_email.trim().toLowerCase();
        if (employeeData.date_of_birth !== initialData.date_of_birth) payload.dateOfBirth = employeeData.date_of_birth;
        if (employeeData.first_name !== initialData.first_name) payload.firstName = employeeData.first_name.trim();
        if (employeeData.middle_name !== initialData.middle_name) payload.middleName = employeeData.middle_name.trim();
        if (employeeData.last_name !== initialData.last_name) payload.lastName = employeeData.last_name.trim();
        if (employeeData.gender !== initialData.gender) payload.gender = employeeData.gender;
        // designation, department, status, employmentType and joiningDate are HR-controlled and never sent from self-service.

        return payload;
    }, [employeeData, initialData]);

    const hasChanges = useMemo(() => Object.keys(dirtyFields).length > 0, [dirtyFields]);

    const updateProfile = async () => {
        if (!hasChanges) return;

        setIsUpdating(true);

        try {
            const response = await authService.updateProfile(dirtyFields);
            notify.success(response.message || 'Profile update submitted successfully!');
            dispatch(profileSaved(employeeData));
            setDraft(null);
        } catch (err: unknown) {
            notify.error(err, 'Failed to update profile.');
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        isLoading: status === 'idle' || status === 'loading',
        isUpdating,
        loadFailed: status === 'failed',
        employeeData,
        setEmployeeData,
        hasChanges,
        updateProfile,
    };
};