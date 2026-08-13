import React, { useMemo, useEffect, useState } from 'react';
import { Lock, Briefcase, Save, Loader2 } from 'lucide-react';
import { CommonInput, CommonSelect } from '../ui/FormInputs';
import { Alert } from '../ui/Alert';
import { Validator } from '../../utils/validator';
import type { ProfileFormState } from '../../hooks/useProfile';
import { HasAccess } from '../../auth/HasAccess';
import { ConfirmationModal } from '../ui/ConfirmationModal';

interface ProfileTabProps {
    employeeData: ProfileFormState;
    setEmployeeData: React.Dispatch<React.SetStateAction<ProfileFormState>>;
    onSubmit: (e: React.FormEvent) => void;
    updateStatus: string | null;
    updateError: string | null;
    onClearStatus?: () => void;
    onClearError?: () => void;
    onValidationChange: (isValid: boolean) => void;
    isSubmitting?: boolean;
}

const DEPARTMENTS = [
    'Procurement',
    'Procurement Logistics',
    'Inventory Management',
    'Vendor Operations',
    'Finance & Accounts',
    'Legal & Compliance',
    'IT & Infrastructure',
];

const DESIGNATIONS = [
    'Administrator',
    'Junior Procurement Specialist',
    'Senior Procurement Manager',
    'Logistics Coordinator',
    'Operations Lead',
    'Regional Director',
];

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export const ProfileTab: React.FC<ProfileTabProps> = ({
    employeeData,
    setEmployeeData,
    onSubmit,
    updateStatus,
    updateError,
    onClearStatus,
    onClearError,
    onValidationChange,
    isSubmitting = false,
}) => {
    const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
    const [pendingEvent, setPendingEvent] = useState<React.FormEvent | null>(null);

    const errors = useMemo(() => {
        const errs: Record<string, string> = {};

        const displayNameErr = Validator.validateField(employeeData.display_name, {
            required: true,
            min: 2,
            customMessage: 'Display name must be at least 2 characters.',
        });
        if (displayNameErr) errs.display_name = displayNameErr;

        const phoneErr = Validator.validateField(employeeData.phone, {
            required: true,
            type: 'phone',
            customMessage: 'Enter a valid primary phone number (10+ digits).',
        });
        if (phoneErr) errs.phone = phoneErr;

        if (employeeData.alternate_phone) {
            const altPhoneErr = Validator.validateField(employeeData.alternate_phone, {
                type: 'phone',
                customMessage: 'Enter a valid alternate phone number.',
            });
            if (altPhoneErr) errs.alternate_phone = altPhoneErr;
        }

        if (employeeData.personal_email) {
            const personalEmailErr = Validator.validateField(employeeData.personal_email, {
                type: 'email',
                customMessage: 'Enter a valid email address.',
            });
            if (personalEmailErr) errs.personal_email = personalEmailErr;
        }

        const firstNameErr = Validator.validateField(employeeData.first_name, {
            required: true,
            min: 2,
            customMessage: 'First name is required.',
        });
        if (firstNameErr) errs.first_name = firstNameErr;

        const lastNameErr = Validator.validateField(employeeData.last_name, {
            required: true,
            min: 2,
            customMessage: 'Last name is required.',
        });
        if (lastNameErr) errs.last_name = lastNameErr;

        const dobErr = Validator.validateField(employeeData.date_of_birth, {
            required: true,
            customMessage: 'Date of birth is required.',
        });
        if (dobErr) errs.date_of_birth = dobErr;

        const departmentErr = Validator.validateField(employeeData.department, {
            required: true,
            customMessage: 'Please select a department.',
        });
        if (departmentErr) errs.department = departmentErr;

        const designationErr = Validator.validateField(employeeData.designation, {
            required: true,
            customMessage: 'Please select a designation.',
        });
        if (designationErr) errs.designation = designationErr;

        const genderErr = Validator.validateField(employeeData.gender, {
            required: true,
            customMessage: 'Please select a gender.',
        });
        if (genderErr) errs.gender = genderErr;

        return errs;
    }, [employeeData]);

    const isFormValid = Object.keys(errors).length === 0;

    useEffect(() => {
        onValidationChange(isFormValid);
    }, [isFormValid, onValidationChange]);

    // Handle initial form submission trigger and show confirmation popup
    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        // Persist synthetic event context and open modal
        e.persist();
        setPendingEvent(e);
        setIsConfirmOpen(true);
    };

    // Execute actual submit on confirmation
    const handleConfirmSubmit = () => {
        setIsConfirmOpen(false);
        if (pendingEvent) {
            onSubmit(pendingEvent);
            setPendingEvent(null);
        }
    };

    return (
        <>
            <form id="profile-form" onSubmit={handlePreSubmit} className="space-y-6">
                {/* Dismissible Feedback Alerts */}
                <Alert type="success" message={updateStatus} onClose={onClearStatus} />
                <Alert type="error" message={updateError} onClose={onClearError} />

                {/* Section 1: Contact Details */}
                <div className="apple-card p-6 space-y-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0071e3] dark:text-blue-400">
                        Personal Contact Details (Direct Update)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CommonInput
                            label="Display Name"
                            required
                            value={employeeData.display_name}
                            error={errors.display_name}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, display_name: e.target.value })
                            }
                        />

                        <CommonInput
                            label="Primary Phone"
                            required
                            value={employeeData.phone}
                            error={errors.phone}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, phone: e.target.value })
                            }
                        />

                        <CommonInput
                            label="Alternate Phone"
                            value={employeeData.alternate_phone}
                            error={errors.alternate_phone}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, alternate_phone: e.target.value })
                            }
                        />

                        <CommonInput
                            label="Personal Email"
                            type="email"
                            value={employeeData.personal_email}
                            error={errors.personal_email}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, personal_email: e.target.value })
                            }
                        />
                    </div>
                </div>

                {/* Section 2: Organizational Details */}
                <div className="apple-card p-6 space-y-5">
                    <div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Organizational & System Identity
                        </h3>

                        <HasAccess roles="ADMIN_L1">
                            <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5 uppercase tracking-wider">
                                <Lock className="w-3.5 h-3.5" /> Requires Admin II Approval
                            </span>
                        </HasAccess>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                        <CommonSelect
                            label="Assigned Department"
                            required
                            value={employeeData.department}
                            error={errors.department}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, department: e.target.value })
                            }
                            options={DEPARTMENTS}
                        />

                        <CommonSelect
                            label="Designation"
                            required
                            value={employeeData.designation}
                            error={errors.designation}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, designation: e.target.value })
                            }
                            options={DESIGNATIONS}
                        />

                        <CommonInput
                            label="First Name"
                            required
                            value={employeeData.first_name}
                            error={errors.first_name}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, first_name: e.target.value })
                            }
                        />

                        <CommonInput
                            label="Last Name"
                            required
                            value={employeeData.last_name}
                            error={errors.last_name}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, last_name: e.target.value })
                            }
                        />

                        <CommonInput
                            label="Date of Birth"
                            type="date"
                            required
                            value={employeeData.date_of_birth}
                            error={errors.date_of_birth}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, date_of_birth: e.target.value })
                            }
                        />

                        <CommonSelect
                            label="Gender"
                            required
                            value={employeeData.gender}
                            error={errors.gender}
                            onChange={(e) =>
                                setEmployeeData({ ...employeeData, gender: e.target.value })
                            }
                            options={GENDERS}
                        />
                    </div>
                </div>

                {/* Section 3: Read-only HR Information */}
                <div className="apple-card p-6 bg-gray-50/50 dark:bg-neutral-900/50 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> System Credentials & HR Contract Info
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                            <span className="text-gray-400 block mb-1">Username</span>
                            <span className="font-mono font-semibold">{employeeData.username}</span>
                        </div>

                        <div>
                            <span className="text-gray-400 block mb-1">System / Work Email</span>
                            <span className="font-semibold">{employeeData.email}</span>
                        </div>

                        <div>
                            <span className="text-gray-400 block mb-1">Employment Type</span>
                            <span className="font-semibold">{employeeData.employment_type.replace('_', ' ')}</span>
                        </div>

                        <div>
                            <span className="text-gray-400 block mb-1">Joining Date</span>
                            <span className="font-semibold">{employeeData.joining_date}</span>
                        </div>
                    </div>
                </div>
            </form>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                actionType="UPDATE"
                title="Update Profile Details"
                description="Are you sure you want to update your profile information? Organizational changes may require administrator review."
                isSubmitting={isSubmitting}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmSubmit}
            />
        </>
    );
};