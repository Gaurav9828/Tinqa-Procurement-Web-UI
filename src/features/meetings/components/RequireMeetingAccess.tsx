import React from 'react';
import { Outlet } from 'react-router-dom';
import { AccessDenied } from '../../../auth/RouteGuards';
import type { Permission } from '../../../config/access';
import { useAccess } from '../../../hooks/useAccess';

/**
 * Gate for the /meetings/* pages, which belong to no single menu item: a meeting opens from Client Demos & Meetings
 * (MEETING_VIEW_ALL), from My Meetings (MEETING_VIEW_OWN) and from emailed or in-app links. Opens for any of
 * `requires`. UX only: the backend enforces it too.
 */
export const RequireMeetingAccess: React.FC<{ requires: readonly Permission[] }> = ({ requires }) => {
  const { canAny } = useAccess();
  return canAny(...requires) ? <Outlet /> : <AccessDenied />;
};
