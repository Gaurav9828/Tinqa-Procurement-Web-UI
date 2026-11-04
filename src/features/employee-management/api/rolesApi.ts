import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { GrantableGroup, RolePayload, RoleSummary } from '../types/role.types';

const BASE = '/v1/access/roles';

/** Custom roles (Procurement AccessRoleController, docs/outreach-meetings-roles.md § 1). */
export const rolesApi = {
  /** GET: every built-in and custom role with its employee count (ROLE_VIEW). Small by design, not paginated. */
  list: async (): Promise<ApiResponse<RoleSummary[]>> => (await axiosClient.get<ApiResponse<RoleSummary[]>>(BASE)).data,

  /** GET …/grantable-groups: the groups the caller holds and may grant (ROLE_MANAGE). */
  grantableGroups: async (): Promise<ApiResponse<GrantableGroup[]>> =>
    (await axiosClient.get<ApiResponse<GrantableGroup[]>>(`${BASE}/grantable-groups`)).data,

  /** POST: a new custom role; its code is made from the label (ROLE_MANAGE). */
  create: async (payload: RolePayload): Promise<ApiResponse<RoleSummary>> =>
    (await axiosClient.post<ApiResponse<RoleSummary>>(BASE, payload)).data,

  /** PUT …/{id}: label, department, description, groups and active (ROLE_MANAGE, custom roles only). */
  update: async (id: number, payload: RolePayload): Promise<ApiResponse<RoleSummary>> =>
    (await axiosClient.put<ApiResponse<RoleSummary>>(`${BASE}/${id}`, payload)).data,

  /** DELETE …/{id}: 409 ROLE_IN_USE while any employee holds it (ROLE_MANAGE). */
  remove: async (id: number): Promise<ApiResponse<void>> => (await axiosClient.delete<ApiResponse<void>>(`${BASE}/${id}`)).data,
};
