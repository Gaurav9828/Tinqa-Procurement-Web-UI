import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import type {
  CreateEmployeeRequest,
  EmployeeResponse,
  EmployeeStatus,
  UpdateEmployeeRequest,
} from '../types/employee.types';

import { EmployeeConstants } from '../types/employee.types';
import { DEPARTMENTS, DESIGNATIONS, GENDERS } from '../../../types/common.types';
import { Validator, type ValidationRule } from '../../../utils/validator';

interface Props {
  isOpen: boolean;
  employeeToEdit: EmployeeResponse | null;
  existingEmployees?: EmployeeResponse[];
  userRole: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitCreate: (data: CreateEmployeeRequest) => Promise<boolean>;
  onSubmitUpdate: (id: number, data: UpdateEmployeeRequest) => Promise<boolean>;
}

const mapDesignationForDb = (designation: string): string => {
  if (designation === 'Administrator Level 1') return 'ADMIN_L1';
  if (designation === 'Administrator Level 2') return 'ADMIN_L2';
  return designation;
};

// Helper to determine accurate status based on User Role and Selected Designation
const getComputedEmployeeStatus = (
  isL2User: boolean,
  designation: string,
  selectedStatus: EmployeeStatus
): EmployeeStatus => {
  const isAdminRole = designation === 'Administrator Level 1' || designation === 'Administrator Level 2';
  
  if (isAdminRole && !isL2User) {
    return EmployeeConstants.APPROVAL_PENDING as EmployeeStatus;
  }
  
  return selectedStatus;
};

// Custom validator function for email with restricted TLDs (.com, .co.in, .net, .org)
const isValidEmailTLD = (email: string): boolean => {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.(com|co\.in|net|org)$/i;
  return regex.test(email.trim());
};

const FORM_RULES: Record<string, ValidationRule> = {
  username: {
    required: true,
    type: 'alphanumeric',
    min: 3,
    max: 30,
    customMessage: 'Username can only contain letters and numbers (no special characters, dots, or spaces).',
  },
  firstName: { required: true, min: 2, customMessage: 'First name is required (min 2 chars).' },
  lastName: { required: true, min: 1, customMessage: 'Last name is required.' },
  phone: { required: true, type: 'phone', customMessage: 'Please enter a valid phone number.' },
  salaryAmount: { type: 'number', min: 0, customMessage: 'Salary amount must be a positive number.' },
  dateOfBirth: { required: true, customMessage: 'Date of birth is required.' },
  joiningDate: { required: true, customMessage: 'Joining date is required.' },
};

export const EmployeeFormModal: React.FC<Props> = ({
  isOpen,
  employeeToEdit,
  existingEmployees = [],
  userRole,
  isSubmitting,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEditMode = Boolean(employeeToEdit);
  const isL2User = userRole === 'ADMIN_L2';

  const maxDobDate = useMemo(() => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    return today.toISOString().split('T')[0];
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    middleName: '',
    lastName: '',
    displayName: '',
    dateOfBirth: '',
    gender: GENDERS[0] || 'MALE',
    designation: DESIGNATIONS[0] || '',
    department: DEPARTMENTS[0] || '',
    employmentType: 'FULL_TIME',
    joiningDate: new Date().toISOString().split('T')[0],
    salaryAmount: '',
    salaryCurrency: 'INR',
    phone: '',
    alternatePhone: '',
    personalEmail: '',
    status: EmployeeConstants.FIRST_LOGIN as EmployeeStatus,
  });

  // Track initial state to detect changes
  const [initialFormData, setInitialFormData] = useState(formData);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Compute if any field in the form has changed
  const isFormDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const computedWorkEmail = isEditMode
    ? undefined
    : formData.username
    ? `${formData.username.trim().toLowerCase()}@tinqa.com`
    : '';

  // Uniqueness Checks: Username
  const isUsernameTaken = useMemo(() => {
    if (isEditMode || !formData.username.trim()) return false;
    const inputClean = formData.username.trim().toLowerCase();

    return existingEmployees.some((emp) => {
      const existingUsername = emp.username ? emp.username.trim().toLowerCase() : '';
      const workEmailPrefix = emp.workEmail ? emp.workEmail.split('@')[0].trim().toLowerCase() : '';
      return existingUsername === inputClean || workEmailPrefix === inputClean;
    });
  }, [formData.username, existingEmployees, isEditMode]);

  // Uniqueness Checks: Personal Email
  const isPersonalEmailTaken = useMemo(() => {
    if (!formData.personalEmail.trim()) return false;
    const inputEmail = formData.personalEmail.trim().toLowerCase();

    return existingEmployees.some((emp) => {
      if (isEditMode && employeeToEdit && emp.id === employeeToEdit.id) {
        return false;
      }
      const existingPersonal = emp.personalEmail ? emp.personalEmail.trim().toLowerCase() : '';
      const existingWork = emp.workEmail ? emp.workEmail.trim().toLowerCase() : '';
      return existingPersonal === inputEmail || existingWork === inputEmail;
    });
  }, [formData.personalEmail, existingEmployees, isEditMode, employeeToEdit]);

  // Uniqueness Checks: Phone & Alternate Phone across all employees
  const phoneUniquenessError = useMemo(() => {
    const cleanPhone = formData.phone.trim().replace(/\s+/g, '');
    const cleanAltPhone = formData.alternatePhone.trim().replace(/\s+/g, '');

    if (cleanPhone && cleanAltPhone && cleanPhone === cleanAltPhone) {
      return 'Primary and Alternate phone numbers cannot be identical.';
    }

    for (const emp of existingEmployees) {
      if (isEditMode && employeeToEdit && emp.id === employeeToEdit.id) {
        continue;
      }

      const existingPhone = emp.phone ? emp.phone.trim().replace(/\s+/g, '') : '';
      const existingAltPhone = emp.alternatePhone ? emp.alternatePhone.trim().replace(/\s+/g, '') : '';

      if (cleanPhone && (cleanPhone === existingPhone || cleanPhone === existingAltPhone)) {
        return `Phone number '${formData.phone}' is already registered with another employee.`;
      }

      if (cleanAltPhone && (cleanAltPhone === existingPhone || cleanAltPhone === existingAltPhone)) {
        return `Alternate phone number '${formData.alternatePhone}' is already registered with another employee.`;
      }
    }

    return null;
  }, [formData.phone, formData.alternatePhone, existingEmployees, isEditMode, employeeToEdit]);

  useEffect(() => {
    let initialValues;
    if (employeeToEdit) {
      initialValues = {
        username: employeeToEdit.username,
        email: employeeToEdit.personalEmail || `${employeeToEdit.username}@tinqa.com`,
        firstName: employeeToEdit.firstName,
        middleName: employeeToEdit.middleName || '',
        lastName: employeeToEdit.lastName,
        displayName: employeeToEdit.displayName,
        dateOfBirth: employeeToEdit.dateOfBirth,
        gender: employeeToEdit.gender,
        designation: employeeToEdit.designation,
        department: employeeToEdit.department,
        employmentType: employeeToEdit.employmentType,
        joiningDate: employeeToEdit.joiningDate,
        salaryAmount: employeeToEdit.salaryAmount ? String(employeeToEdit.salaryAmount) : '',
        salaryCurrency: employeeToEdit.salaryCurrency || 'INR',
        phone: employeeToEdit.phone,
        alternatePhone: employeeToEdit.alternatePhone || '',
        personalEmail: employeeToEdit.personalEmail || '',
        status: employeeToEdit.status,
      };
    } else {
      initialValues = {
        username: '',
        email: '',
        firstName: '',
        middleName: '',
        lastName: '',
        displayName: '',
        dateOfBirth: '',
        gender: GENDERS[0] || 'MALE',
        designation: DESIGNATIONS[0] || '',
        department: DEPARTMENTS[0] || '',
        employmentType: 'FULL_TIME',
        joiningDate: new Date().toISOString().split('T')[0],
        salaryAmount: '',
        salaryCurrency: 'INR',
        phone: '',
        alternatePhone: '',
        personalEmail: '',
        status: EmployeeConstants.FIRST_LOGIN as EmployeeStatus,
      };
    }
    setFormData(initialValues);
    setInitialFormData(initialValues);
    setValidationError(null);
    setIsConfirmModalOpen(false);
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValidationError(null);
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'status' ? (value as EmployeeStatus) : value,
    }));
  };

  // 1. Validation Step
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!isEditMode) {
      const usernameErr = Validator.validateField(formData.username, FORM_RULES.username);
      if (usernameErr) return setValidationError(usernameErr);

      if (!Validator.isAlphanumeric(formData.username)) {
        return setValidationError('Username can only contain letters and numbers.');
      }
    }

    const firstNameErr = Validator.validateField(formData.firstName, FORM_RULES.firstName);
    if (firstNameErr) return setValidationError(firstNameErr);

    const lastNameErr = Validator.validateField(formData.lastName, FORM_RULES.lastName);
    if (lastNameErr) return setValidationError(lastNameErr);

    const phoneErr = Validator.validateField(formData.phone, FORM_RULES.phone);
    if (phoneErr) return setValidationError(phoneErr);

    if (formData.personalEmail) {
      if (!isValidEmailTLD(formData.personalEmail)) {
        return setValidationError('Personal email must be a valid address ending with .com, .co.in, .net, or .org.');
      }
    }

    if (formData.salaryAmount) {
      const salaryErr = Validator.validateField(Number(formData.salaryAmount), FORM_RULES.salaryAmount);
      if (salaryErr) return setValidationError(salaryErr);
    }

    const dobErr = Validator.validateField(formData.dateOfBirth, FORM_RULES.dateOfBirth);
    if (dobErr) return setValidationError(dobErr);

    const joinErr = Validator.validateField(formData.joiningDate, FORM_RULES.joiningDate);
    if (joinErr) return setValidationError(joinErr);

    if (!isEditMode && isUsernameTaken) {
      return setValidationError(`Username '${formData.username}' already exists. Please enter a unique username.`);
    }

    if (isPersonalEmailTaken) {
      return setValidationError(`Personal email '${formData.personalEmail}' is already registered with another employee.`);
    }

    if (phoneUniquenessError) {
      return setValidationError(phoneUniquenessError);
    }

    const finalWorkEmail = computedWorkEmail?.trim().toLowerCase();
    const finalPersonalEmail = formData.personalEmail.trim().toLowerCase();

    if (finalPersonalEmail && finalPersonalEmail === finalWorkEmail) {
      return setValidationError('Personal email address cannot be identical to the work email address.');
    }

    setIsConfirmModalOpen(true);
  };

  // 2. Submission Step
  const executeSubmit = async () => {
    const finalWorkEmail = computedWorkEmail?.trim().toLowerCase();
    const finalDesignation = mapDesignationForDb(formData.designation);
    const computedStatus = getComputedEmployeeStatus(isL2User, formData.designation, formData.status);

    if (isEditMode && employeeToEdit) {
      const success = await onSubmitUpdate(employeeToEdit.id, {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        displayName: formData.displayName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        designation: formData.designation,
        department: formData.department,
        employmentType: formData.employmentType,
        joiningDate: formData.joiningDate,
        salaryAmount: formData.salaryAmount ? Number(formData.salaryAmount) : undefined,
        salaryCurrency: formData.salaryCurrency,
        phone: formData.phone,
        alternatePhone: formData.alternatePhone,
        personalEmail: formData.personalEmail,
        status: computedStatus,
      });
      if (success) {
        setIsConfirmModalOpen(false);
        onClose();
      }
    } else {
      const success = await onSubmitCreate({
        username: formData.username.trim().toLowerCase(),
        email: finalWorkEmail ?? '',
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        displayName: formData.displayName || `${formData.firstName} ${formData.lastName}`.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        designation: formData.designation,
        department: formData.department,
        employmentType: formData.employmentType,
        joiningDate: formData.joiningDate,
        salaryAmount: formData.salaryAmount ? Number(formData.salaryAmount) : undefined,
        salaryCurrency: formData.salaryCurrency,
        phone: formData.phone,
        alternatePhone: formData.alternatePhone,
        personalEmail: formData.personalEmail,
        role: finalDesignation,
      });
      if (success) {
        setIsConfirmModalOpen(false);
        onClose();
      }
    }
  };

  const isSelectedAdminRole =
    formData.designation === 'Administrator Level 1' || formData.designation === 'Administrator Level 2';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-3xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
            <h3 className="font-bold text-base text-black dark:text-white">
              {isEditMode ? `Edit Employee: ${employeeToEdit?.employeeCode}` : 'Create New Employee'}
            </h3>
            <button type="button" onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {validationError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {!isEditMode && (
                <>
                  <div className="space-y-1">
                    <CommonInput
                      label="Username"
                      name="username"
                      required
                      placeholder="e.g. tinwa123"
                      value={formData.username}
                      onChange={handleChange}
                    />
                    {formData.username && !Validator.isAlphanumeric(formData.username) && (
                      <p className="text-[11px] text-red-500 font-medium pt-0.5">
                        ✕ Only letters and numbers allowed
                      </p>
                    )}
                    {isUsernameTaken && Validator.isAlphanumeric(formData.username) && (
                      <p className="text-[11px] text-red-500 font-medium pt-0.5">
                        ✕ Username '{formData.username}' is already taken
                      </p>
                    )}
                    {formData.username && !isUsernameTaken && Validator.isAlphanumeric(formData.username) && formData.username.length >= 3 && (
                      <p className="text-[11px] text-emerald-600 font-medium pt-0.5">
                        ✓ Username is valid and available
                      </p>
                    )}
                  </div>

                  <CommonInput
                    label="Work Email (Auto-generated)"
                    name="email"
                    type="email"
                    readOnly
                    disabled
                    placeholder="username@tinqa.com"
                    value={computedWorkEmail}
                    onChange={() => {}}
                    className="bg-gray-100 dark:bg-neutral-800 text-gray-500 cursor-not-allowed border-dashed"
                  />
                </>
              )}

              <CommonInput label="First Name" name="firstName" required placeholder="e.g. John" value={formData.firstName} onChange={handleChange} />
              <CommonInput label="Middle Name" name="middleName" placeholder="e.g. Robert" value={formData.middleName} onChange={handleChange} />
              <CommonInput label="Last Name" name="lastName" required placeholder="e.g. Doe" value={formData.lastName} onChange={handleChange} />
              <CommonInput label="Display Name" name="displayName" placeholder="e.g. Johnny Doe" value={formData.displayName} onChange={handleChange} />

              <CommonSelect
                label="Department"
                name="department"
                required
                options={DEPARTMENTS}
                value={formData.department}
                onChange={handleChange}
              />

              <CommonSelect
                label="Designation"
                name="designation"
                required
                options={DESIGNATIONS}
                value={formData.designation}
                onChange={handleChange}
                disabled={formData.status === EmployeeConstants.FIRST_LOGIN}
              />

              <CommonSelect
                label="Gender"
                name="gender"
                required
                options={GENDERS}
                value={formData.gender}
                onChange={handleChange}
              />

              <div className="space-y-1">
                <CommonInput label="Phone Number" name="phone" type="tel" required placeholder="+91 9876543210" value={formData.phone} onChange={handleChange} />
                {phoneUniquenessError && formData.phone && (
                  <p className="text-[11px] text-red-500 font-medium pt-0.5">
                    ✕ {phoneUniquenessError}
                  </p>
                )}
              </div>

              <CommonInput
                label="Alternate Phone"
                name="alternatePhone"
                type="tel"
                placeholder="+91 9876543211"
                value={formData.alternatePhone}
                onChange={handleChange}
              />

              <div className="space-y-1">
                <CommonInput label="Personal Email" name="personalEmail" type="email" placeholder="john.personal@gmail.com" value={formData.personalEmail} onChange={handleChange} />
                {formData.personalEmail && !isValidEmailTLD(formData.personalEmail) && (
                  <p className="text-[11px] text-red-500 font-medium pt-0.5">
                    ✕ Must end with .com, .co.in, .net, or .org
                  </p>
                )}
                {isPersonalEmailTaken && <p className="text-[11px] text-red-500 font-medium pt-0.5">✕ Email address is already registered</p>}
                {formData.personalEmail && !isPersonalEmailTaken && isValidEmailTLD(formData.personalEmail) && (
                  <p className="text-[11px] text-emerald-600 font-medium pt-0.5">✓ Personal email is valid and available</p>
                )}
              </div>

              <CommonInput label="Date of Birth (At least 18 yrs old)" name="dateOfBirth" type="date" required max={maxDobDate} value={formData.dateOfBirth} onChange={handleChange} />
              <CommonInput label="Joining Date" name="joiningDate" type="date" required value={formData.joiningDate} onChange={handleChange} />
              <CommonInput label="Salary Amount" name="salaryAmount" type="number" placeholder="e.g. 50000" value={formData.salaryAmount} onChange={handleChange} />

              <CommonSelect
                label="Employment Type"
                name="employmentType"
                options={['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']}
                value={formData.employmentType}
                onChange={handleChange}
              />

              {isEditMode && (
                <CommonSelect
                  label={isL2User ? 'Employee Status (L2 Override)' : 'Employee Status'}
                  name="status"
                  options={[
                    EmployeeConstants.ACTIVE,
                    EmployeeConstants.FIRST_LOGIN,
                    EmployeeConstants.BLOCKED,
                    EmployeeConstants.IN_ACTIVE,
                    EmployeeConstants.WAITING_FOR_DELETION,
                    EmployeeConstants.APPROVAL_PENDING,
                  ]}
                  value={getComputedEmployeeStatus(isL2User, formData.designation, formData.status)}
                  onChange={handleChange}
                  disabled={!isL2User && isSelectedAdminRole}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !isFormDirty ||
                  isUsernameTaken ||
                  isPersonalEmailTaken ||
                  Boolean(phoneUniquenessError) ||
                  (!isEditMode && !Validator.isAlphanumeric(formData.username))
                }
                className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" /> Continue to Save
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        actionType={isEditMode ? 'UPDATE' : 'SUBMIT'}
        title={isEditMode ? 'Confirm Employee Update' : 'Confirm New Employee'}
        description={
          isEditMode
            ? `Are you sure you want to update the details for ${formData.firstName} ${formData.lastName}?`
            : `Are you sure you want to create a new employee profile for ${formData.firstName} ${formData.lastName}?`
        }
        isSubmitting={isSubmitting}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={executeSubmit}
      />
    </>
  );
};