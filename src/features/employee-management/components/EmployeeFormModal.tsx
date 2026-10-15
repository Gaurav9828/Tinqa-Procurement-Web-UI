import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, Lock } from 'lucide-react';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import type {
  CreateEmployeeRequest,
  EmployeeResponse,
  EmployeeStatus,
  UpdateEmployeeRequest,
} from '../types/employee.types';

import { EmployeeConstants, SELF_LOCKED_FIELDS } from '../types/employee.types';
import type { EmployeeSaveResult } from '../hooks/useEmployeeActions';
import { EmployeeAccessFields } from './EmployeeAccessFields';
import { useAccess } from '../../../hooks/useAccess';
import { useAccessCatalog } from '../../../hooks/useAccessCatalog';
import { GENDERS } from '../../../types/common.types';
import { Validator, type ValidationRule } from '../../../utils/validator';
import { DEFAULT_EMPLOYEE_ROLE, designationHasApprovalLevel, isEmployeeRole, validateDesignation } from '../utils/employeeRole';

interface Props {
  isOpen: boolean;
  employeeToEdit: EmployeeResponse | null;
  existingEmployees?: EmployeeResponse[];
  /** The record being edited belongs to the signed-in admin: level/designation/salary/employment fields are locked. */
  isSelfEdit?: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitCreate: (data: CreateEmployeeRequest) => Promise<EmployeeSaveResult>;
  onSubmitUpdate: (id: number, data: UpdateEmployeeRequest) => Promise<EmployeeSaveResult>;
}


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
  isSelfEdit = false,
  isSubmitting,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEditMode = Boolean(employeeToEdit);
  const isSelfLocked = isEditMode && isSelfEdit;
  const { can } = useAccess();
  const canApproveEmployees = can('EMPLOYEE_APPROVE');
  const { catalog, error: catalogError, retry: retryCatalog } = useAccessCatalog();
  // The level is set only by an employee approver, never on their own record, and only for admin accounts.
  const canChooseRole =
    canApproveEmployees && !isSelfLocked && (!isEditMode || isEmployeeRole(employeeToEdit?.role));

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
    designation: '',
    // '' only when editing a record the backend returned without a role.
    role: DEFAULT_EMPLOYEE_ROLE as string,
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
  // 400 field errors from the API, keyed by the error item's `field`.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Compute if any field in the form has changed
  const isFormDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const requiredFilled =
    (isEditMode || !!String(formData.username).trim()) &&
    [
      formData.firstName,
      formData.lastName,
      formData.gender,
      formData.phone,
      formData.alternatePhone,
      formData.dateOfBirth,
      formData.joiningDate,
    ].every((value) => !!String(value ?? '').trim()) &&
    (isEditMode || !!formData.designation) &&
    (!canChooseRole || isEditMode || isEmployeeRole(formData.role));

  // Shown once something is picked, so a fresh form isn't covered in errors.
  const designationError = formData.designation ? validateDesignation(formData.designation, !isEditMode) : null;

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
    // Compared in normalised form so "+91 98765 43210" and "9876543210" count as the same number.
    const cleanPhone = Validator.normalizePhone(formData.phone);
    const cleanAltPhone = Validator.normalizePhone(formData.alternatePhone);

    if (cleanPhone && cleanAltPhone && cleanPhone === cleanAltPhone) {
      return 'Primary and Alternate phone numbers cannot be identical.';
    }

    for (const emp of existingEmployees) {
      if (isEditMode && employeeToEdit && emp.id === employeeToEdit.id) {
        continue;
      }

      const existingPhone = Validator.normalizePhone(emp.phone);
      const existingAltPhone = Validator.normalizePhone(emp.alternatePhone);

      if (cleanPhone && (cleanPhone === existingPhone || cleanPhone === existingAltPhone)) {
        return `Phone number '${formData.phone}' is already registered with another employee.`;
      }

      if (cleanAltPhone && (cleanAltPhone === existingPhone || cleanAltPhone === existingAltPhone)) {
        return `Alternate phone number '${formData.alternatePhone}' is already registered with another employee.`;
      }
    }

    return null;
  }, [formData.phone, formData.alternatePhone, existingEmployees, isEditMode, employeeToEdit]);

  // Alternate phone is required, must be a valid number and must differ from the primary.
  const alternatePhoneError =
    Validator.validatePhonePair(formData.phone, formData.alternatePhone, { primaryRequired: false }).alternate ?? null;
  // Only shown once the user has typed something, so a fresh form isn't covered in errors.
  const alternatePhoneFormatError = formData.alternatePhone.trim() ? alternatePhoneError : null;

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
        designation: employeeToEdit.designation || '',
        role: isEmployeeRole(employeeToEdit.role) ? employeeToEdit.role : '',
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
        designation: '',
        role: DEFAULT_EMPLOYEE_ROLE,
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
    setFieldErrors({});
    setIsConfirmModalOpen(false);
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const setField = (name: string, value: string) => {
    setValidationError(null);
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'status' ? (value as EmployeeStatus) : value,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setField(e.target.name, e.target.value);

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

    const designationErr = validateDesignation(formData.designation, !isEditMode);
    if (designationErr) return setValidationError(designationErr);

    if (!isEditMode && canChooseRole && !isEmployeeRole(formData.role)) {
      return setValidationError('Please select a role.');
    }

    const phoneErr = Validator.validateField(formData.phone, FORM_RULES.phone);
    if (phoneErr) return setValidationError(phoneErr);
    if (alternatePhoneError) return setValidationError(alternatePhoneError);

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
  const handleResult = (result: EmployeeSaveResult) => {
    if (result.ok) {
      setIsConfirmModalOpen(false);
      onClose();
      return;
    }
    setFieldErrors(result.fieldErrors);
    setIsConfirmModalOpen(false);
  };

  /** Edit: only the fields that changed are sent. */
  const buildUpdatePayload = (): UpdateEmployeeRequest => {
    const changed = (key: keyof typeof formData) => formData[key] !== initialFormData[key];
    const payload: UpdateEmployeeRequest = {};

    if (changed('firstName')) payload.firstName = formData.firstName;
    if (changed('middleName')) payload.middleName = formData.middleName;
    if (changed('lastName')) payload.lastName = formData.lastName;
    if (changed('displayName')) payload.displayName = formData.displayName;
    if (changed('dateOfBirth')) payload.dateOfBirth = formData.dateOfBirth;
    if (changed('gender')) payload.gender = formData.gender;
    if (changed('phone')) payload.phone = formData.phone;
    if (changed('alternatePhone')) payload.alternatePhone = formData.alternatePhone;
    if (changed('personalEmail')) payload.personalEmail = formData.personalEmail;
    if (changed('designation') && formData.designation) payload.designation = formData.designation;
    if (changed('employmentType')) payload.employmentType = formData.employmentType;
    if (changed('joiningDate')) payload.joiningDate = formData.joiningDate;
    if (changed('salaryAmount')) payload.salaryAmount = formData.salaryAmount ? Number(formData.salaryAmount) : undefined;
    if (changed('salaryCurrency')) payload.salaryCurrency = formData.salaryCurrency;
    if (changed('status')) payload.status = formData.status;
    if (canChooseRole && changed('role') && isEmployeeRole(formData.role)) payload.role = formData.role;

    // Own record: level, designation, salary and employment terms are never sent.
    if (isSelfLocked) SELF_LOCKED_FIELDS.forEach((field) => delete payload[field]);
    return payload;
  };

  const executeSubmit = async () => {
    const finalWorkEmail = computedWorkEmail?.trim().toLowerCase();

    if (isEditMode && employeeToEdit) {
      handleResult(await onSubmitUpdate(employeeToEdit.id, buildUpdatePayload()));
    } else {
      handleResult(
        await onSubmitCreate({
          username: formData.username.trim().toLowerCase(),
          email: finalWorkEmail ?? '',
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          displayName: formData.displayName || `${formData.firstName} ${formData.lastName}`.trim(),
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          designation: formData.designation,
          employmentType: formData.employmentType,
          joiningDate: formData.joiningDate,
          salaryAmount: formData.salaryAmount ? Number(formData.salaryAmount) : undefined,
          salaryCurrency: formData.salaryCurrency,
          phone: formData.phone,
          alternatePhone: formData.alternatePhone,
          personalEmail: formData.personalEmail,
          // Always the enum value, never a label. Only an employee approver picks the level; others create Level 1.
          role: canChooseRole && isEmployeeRole(formData.role) ? formData.role : DEFAULT_EMPLOYEE_ROLE,
        })
      );
    }
  };

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

          {isSelfLocked && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                This is your own record. Admin level, designation, department, salary, employment type, joining date and
                status can only be changed by another administrator.
              </span>
            </div>
          )}

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
                required
                placeholder="+91 9876543211"
                value={formData.alternatePhone}
                onChange={handleChange}
                error={alternatePhoneFormatError ?? undefined}
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
              <CommonInput
                label="Joining Date"
                name="joiningDate"
                type="date"
                required
                value={formData.joiningDate}
                onChange={handleChange}
                disabled={isSelfLocked}
              />
              <CommonInput
                label="Salary Amount"
                name="salaryAmount"
                type="number"
                placeholder="e.g. 50000"
                value={formData.salaryAmount}
                onChange={handleChange}
                disabled={isSelfLocked}
              />

              <CommonSelect
                label="Employment Type"
                name="employmentType"
                options={['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']}
                value={formData.employmentType}
                onChange={handleChange}
                disabled={isSelfLocked}
              />

              {isEditMode && (
                <CommonSelect
                  label="Employee Status"
                  name="status"
                  options={[
                    EmployeeConstants.ACTIVE,
                    EmployeeConstants.FIRST_LOGIN,
                    EmployeeConstants.BLOCKED,
                    EmployeeConstants.IN_ACTIVE,
                    EmployeeConstants.WAITING_FOR_DELETION,
                    EmployeeConstants.APPROVAL_PENDING,
                  ]}
                  value={formData.status}
                  onChange={handleChange}
                  // Only an employee approver changes the status of a Level 2 account.
                  disabled={isSelfLocked || (!canApproveEmployees && employeeToEdit?.role === 'ADMIN_L2')}
                />
              )}

              <EmployeeAccessFields
                catalog={catalog}
                catalogError={catalogError}
                onRetryCatalog={retryCatalog}
                designation={formData.designation}
                role={formData.role}
                savedRole={employeeToEdit?.role ?? null}
                savedDesignation={employeeToEdit?.designation ?? null}
                savedDepartment={employeeToEdit?.department ?? null}
                isEditMode={isEditMode}
                isSelfLocked={isSelfLocked}
                canApproveEmployees={canApproveEmployees}
                canEditDesignation={!isEditMode || can('EMPLOYEE_UPDATE')}
                errors={{ designation: fieldErrors.designation ?? designationError ?? undefined, role: fieldErrors.role }}
                onDesignationChange={(code) => {
                  setField('designation', code);
                  // No approval powers means Level 1 only
                  if (!designationHasApprovalLevel(catalog, code)) setField('role', 'ADMIN_L1');
                }}
                onRoleChange={(value) => setField('role', value)}
              />
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
                  !requiredFilled ||
                  isUsernameTaken ||
                  isPersonalEmailTaken ||
                  Boolean(phoneUniquenessError) ||
                  Boolean(alternatePhoneFormatError) ||
                  Boolean(designationError) ||
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