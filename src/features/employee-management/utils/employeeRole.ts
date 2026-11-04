import type { EmployeeRole } from '../types/employee.types';
import { isBuiltInDesignation, type AccessCatalog, type DesignationEntry, type PermissionGroupEntry } from '../../../config/access';

export const DEFAULT_EMPLOYEE_ROLE: EmployeeRole = 'ADMIN_L1';

/** The admin levels offered on the Employee form. The UI shows the label; the API always gets the value. */
export const EMPLOYEE_ROLE_OPTIONS: { value: EmployeeRole; label: string }[] = [
  { value: 'ADMIN_L1', label: 'Level 1 (maker)' },
  { value: 'ADMIN_L2', label: 'Level 2 (approver)' },
];

export const isEmployeeRole = (value: unknown): value is EmployeeRole =>
  EMPLOYEE_ROLE_OPTIONS.some((option) => option.value === value);

/** Friendly label for a level from the API; unknown values are shown as-is, missing ones as null. */
export const employeeRoleLabel = (role: string | null | undefined): string | null => {
  if (!role) return null;
  return EMPLOYEE_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
};

/**
 * Error text for a designation code, or null when valid. Required on create; on edit an empty value keeps the current
 * one. Valid: a built-in designation, an active custom role in the catalog, or the code the employee already holds
 * (a custom role deactivated since stays with its employees).
 */
export const validateDesignation = (
  value: string,
  required: boolean,
  catalog: AccessCatalog | null = null,
  saved: string | null = null
): string | null => {
  if (!value) return required ? 'Designation is required.' : null;
  if (value === saved || isBuiltInDesignation(value)) return null;
  const custom = findDesignation(catalog, value);
  return custom && custom.active !== false ? null : 'Pick a designation from the list.';
};

export const findDesignation = (catalog: AccessCatalog | null, code: string | null | undefined): DesignationEntry | undefined =>
  catalog?.designations.find((designation) => designation.code === code);

/**
 * The groups an account with this designation and level would hold, mirroring the backend rule: Level 2 holds all
 * of the designation's groups, Level 1 the same minus the approval-level ones. For previews only; the signed-in
 * user's own access always comes from the server.
 */
export const previewGroups = (
  catalog: AccessCatalog | null,
  designation: string | null | undefined,
  level: string | null | undefined
): { granted: PermissionGroupEntry[]; withheld: PermissionGroupEntry[] } => {
  const entry = findDesignation(catalog, designation);
  if (!catalog || !entry) return { granted: [], withheld: [] };
  const groups = entry.groups
    .map((code) => catalog.groups.find((group) => group.code === code))
    .filter((group): group is PermissionGroupEntry => !!group);
  const levelTwo = level === 'ADMIN_L2';
  return {
    granted: groups.filter((group) => levelTwo || !group.approvalLevel),
    withheld: groups.filter((group) => !levelTwo && group.approvalLevel),
  };
};

/**
 * Whether Level 2 adds anything for this designation (it carries an approval-level group). When it doesn't, the
 * designation only exists at Level 1; the backend enforces the same.
 */
export const designationHasApprovalLevel = (catalog: AccessCatalog | null, code: string | null | undefined): boolean => {
  const entry = findDesignation(catalog, code);
  if (!catalog || !entry) return true;
  return entry.groups.some((group) => catalog.groups.find((g) => g.code === group)?.approvalLevel);
};

/**
 * Whether creating this account waits for a second person, as the backend decides it: unless the creator can
 * approve employees, and always for a new Level 2 or Super Admin.
 */
export const creationNeedsApproval = (creatorCanApprove: boolean, role: string, designation: string): boolean =>
  !creatorCanApprove || role === 'ADMIN_L2' || designation === 'SUPER_ADMIN';

/**
 * The designation picker's options: built-in designations and active custom roles, both from the catalog. Super Admin
 * needs an employee approver. A custom role deactivated after it was given stays listed (disabled) for its employee.
 */
export const designationPickerOptions = (
  catalog: AccessCatalog | null,
  canApproveEmployees: boolean,
  savedDesignation: string | null,
  savedDesignationLabel: string | null
): { value: string; label: string; disabled: boolean }[] => {
  const options = (catalog?.designations ?? []).map((entry) => {
    const restricted = entry.code === 'SUPER_ADMIN' && !canApproveEmployees && savedDesignation !== 'SUPER_ADMIN';
    const label = entry.custom ? `${entry.label} (custom role)` : entry.label;
    return { value: entry.code, label: restricted ? `${label} (needs an employee approver)` : label, disabled: restricted };
  });
  if (catalog && savedDesignation && !findDesignation(catalog, savedDesignation)) {
    options.push({ value: savedDesignation, label: `${savedDesignationLabel ?? savedDesignation} (inactive)`, disabled: true });
  }
  return options;
};

/** The designation as read-only text: its catalog label, the saved label for a role no longer listed, or the code. */
export const designationText = (
  catalog: AccessCatalog | null,
  designation: string,
  savedDesignation: string | null,
  savedDesignationLabel: string | null
): string => {
  if (!catalog) return 'Loading designations…';
  const entry = findDesignation(catalog, designation);
  if (entry) return entry.label;
  if (designation && designation === savedDesignation && savedDesignationLabel) return savedDesignationLabel;
  return designation || 'Not assigned';
};
