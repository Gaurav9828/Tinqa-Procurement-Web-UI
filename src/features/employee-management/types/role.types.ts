/** Custom roles (docs/outreach-meetings-roles.md § 1): designations stored by the Procurement backend. */

/** GET /v1/access/roles: every built-in and custom role. */
export interface RoleSummary {
  /** Null for built-in roles. */
  id: number | null;
  code: string;
  label: string;
  department: string;
  description: string;
  groups: string[];
  custom: boolean;
  active: boolean;
  employeeCount: number;
  createdByName: string | null;
  updatedAt: string | null;
}

/** POST /v1/access/roles and PUT /v1/access/roles/{id} (`active` on update only). */
export interface RolePayload {
  label: string;
  department: string;
  description: string;
  groups: string[];
  active?: boolean;
}

/** GET /v1/access/roles/grantable-groups: the groups the signed-in admin may put in a role. */
export interface GrantableGroup {
  code: string;
  label: string;
  approvalLevel: boolean;
}
