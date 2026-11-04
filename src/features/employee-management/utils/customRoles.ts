/** Custom roles: form rules mirrored from the backend (docs/outreach-meetings-roles.md § 1). */

/** Always added to every role by the server; never offered in the picker. */
export const ALWAYS_INCLUDED_GROUP = 'SELF_SERVICE';

export const ROLE_LIMITS = { label: 100, department: 100, description: 500 } as const;

/** The code the server makes from a label: "Marketing Executive" → MARKETING_EXECUTIVE. Preview only. */
export const roleCodeFromLabel = (label: string): string =>
  label
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .join('_');

export interface RoleForm {
  label: string;
  department: string;
  description: string;
  groups: string[];
}

/** Field → message for every problem; empty when the form can be sent. */
export const validateRoleForm = ({ label, department, description, groups }: RoleForm): Partial<Record<keyof RoleForm, string>> => {
  const errors: Partial<Record<keyof RoleForm, string>> = {};
  if (!label.trim()) errors.label = 'Give the role a name.';
  else if (!roleCodeFromLabel(label)) errors.label = 'Use letters or digits in the name.';
  else if (label.trim().length > ROLE_LIMITS.label) errors.label = `At most ${ROLE_LIMITS.label} characters.`;
  if (!department.trim()) errors.department = 'Say which department the role belongs to.';
  else if (department.trim().length > ROLE_LIMITS.department) errors.department = `At most ${ROLE_LIMITS.department} characters.`;
  if (description.trim().length > ROLE_LIMITS.description) errors.description = `At most ${ROLE_LIMITS.description} characters.`;
  if (!groups.some((group) => group !== ALWAYS_INCLUDED_GROUP)) errors.groups = 'Pick at least one permission group.';
  return errors;
};
