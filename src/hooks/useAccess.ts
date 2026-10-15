import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { APP_NAVIGATION, type NavigationItem } from '../config/permissions.config';
import type { Permission } from '../config/access';

/**
 * What the signed-in user may do, from the permissions the server sent (login, GET /v1/access/me).
 * Gate every screen and button with `can(...)`, never with the role or designation. UX only: the backends enforce it.
 */
export const useAccess = () => {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions;
  const groups = user?.permissionGroups;

  const granted = useMemo(() => new Set(permissions ?? []), [permissions]);
  const heldGroups = useMemo(() => new Set(groups ?? []), [groups]);

  const can = useCallback((permission: Permission): boolean => granted.has(permission), [granted]);
  const canAny = useCallback((...required: Permission[]): boolean => required.some((p) => granted.has(p)), [granted]);
  const canAll = useCallback((...required: Permission[]): boolean => required.every((p) => granted.has(p)), [granted]);
  const inGroup = useCallback((group: string): boolean => heldGroups.has(group), [heldGroups]);

  const canOpen = useCallback((item: NavigationItem): boolean => canAny(...item.requires), [canAny]);
  const authorizedNavigation = useCallback((): NavigationItem[] => APP_NAVIGATION.filter(canOpen), [canOpen]);

  return {
    /** Admin level (ADMIN_L1 / ADMIN_L2); for display, not for gating. */
    level: user?.role ?? null,
    designation: user?.designation ?? null,
    designationLabel: user?.designationLabel ?? null,
    /** False for a session saved before permissions existed, until the next refresh. */
    accessLoaded: permissions !== undefined,
    can,
    canAny,
    canAll,
    inGroup,
    canOpen,
    authorizedNavigation,
  };
};
