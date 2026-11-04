import { useCallback } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useGatedLoad } from '../../../hooks/useGatedLoad';
import { accessService } from '../../../api/services/accessService';
import { errorCodeOf } from '../../../utils/apiErrorDetail';
import { rolesApi } from '../api/rolesApi';
import type { GrantableGroup, RolePayload, RoleSummary } from '../types/role.types';

/** GET /v1/access/roles (ROLE_VIEW): every role with its employee count, while the roles view is open. */
export const useRoles = (enabled: boolean) => {
  const { can } = useAccess();
  return useGatedLoad<RoleSummary[]>(rolesApi.list, enabled && can('ROLE_VIEW'), 'The roles could not be loaded.');
};

/** GET /v1/access/roles/grantable-groups (ROLE_MANAGE): only while the role editor is open. */
export const useGrantableGroups = (enabled: boolean) => {
  const { can } = useAccess();
  return useGatedLoad<GrantableGroup[]>(rolesApi.grantableGroups, enabled && can('ROLE_MANAGE'), 'The permission groups could not be loaded.');
};

/** The error code a role delete answers while employees still hold the role. */
export const ROLE_IN_USE = 'ROLE_IN_USE';

/**
 * Create, edit, (de)activate and delete custom roles (ROLE_MANAGE). After a change the roles list and the shared
 * access catalog (employee designation pickers) are loaded again; nothing else.
 */
export const useRoleActions = (onChanged: () => void) => {
  const afterChange = useCallback(() => {
    accessService.invalidateCatalog();
    onChanged();
  }, [onChanged]);
  const { isSubmitting, run } = useApiAction(afterChange);

  const create = (payload: RolePayload) =>
    run(() => rolesApi.create(payload), { success: `Role "${payload.label}" created.`, failure: 'The role could not be created.' });

  const update = (id: number, payload: RolePayload) =>
    run(() => rolesApi.update(id, payload), { success: `Role "${payload.label}" saved.`, failure: 'The role could not be saved.' });

  const setActive = (role: RoleSummary, active: boolean) =>
    run(
      () =>
        rolesApi.update(role.id ?? 0, {
          label: role.label,
          department: role.department,
          description: role.description,
          groups: role.groups,
          active,
        }),
      {
        success: active ? `Role "${role.label}" is active again.` : `Role "${role.label}" deactivated: no new employee can get it.`,
        failure: active ? 'The role could not be activated.' : 'The role could not be deactivated.',
      }
    );

  /** Resolves to 'deleted', 'inUse' (409 ROLE_IN_USE: deactivate it instead) or 'failed'. */
  const remove = async (role: RoleSummary): Promise<'deleted' | 'inUse' | 'failed'> => {
    let inUse = false;
    const ok = await run(() => rolesApi.remove(role.id ?? 0), {
      success: `Role "${role.label}" deleted.`,
      failure: 'The role could not be deleted.',
      onError: (err) => {
        inUse = errorCodeOf(err) === ROLE_IN_USE;
      },
    });
    if (ok) return 'deleted';
    return inUse ? 'inUse' : 'failed';
  };

  return { isSubmitting, create, update, setActive, remove };
};
