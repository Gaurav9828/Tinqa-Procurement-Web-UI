import React from 'react';
import { useAccess } from '../hooks/useAccess';
import type { Permission } from '../config/access';

interface HasAccessProps {
  /** Shown when the user holds this permission. */
  permission?: Permission;
  /** Shown when the user holds any of these. */
  anyOf?: readonly Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Renders children only for users with the permission. UX only: the backend still refuses the action. */
export const HasAccess: React.FC<HasAccessProps> = ({ permission, anyOf, children, fallback = null }) => {
  const { can, canAny } = useAccess();
  const allowed = (!permission || can(permission)) && (!anyOf || canAny(...anyOf));
  return allowed ? <>{children}</> : <>{fallback}</>;
};
