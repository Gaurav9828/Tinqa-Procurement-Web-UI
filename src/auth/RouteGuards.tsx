import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { clearSession, isSessionExpired } from './session';
import { APP_NAVIGATION, type UserRole } from '../config/permissions.config';

/**
 * Blocks every child route unless there is a live session.
 * Users still on a default password are forced to /reset-password first.
 */
export const RequireAuth: React.FC<{ allowFirstLogin?: boolean }> = ({ allowFirstLogin = false }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user || isSessionExpired()) {
    // Storage-only cleanup: updating the store during render is not allowed.
    clearSession();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.isFirstLogin && !allowFirstLogin) {
    return <Navigate to="/reset-password" replace />;
  }

  return <Outlet />;
};

/** Redirects an already signed-in user away from public pages such as /login. */
export const RedirectIfAuthenticated: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user && !isSessionExpired()) {
    return <Navigate to={user.isFirstLogin ? '/reset-password' : '/analytics'} replace />;
  }
  return <>{children}</>;
};

const AccessDenied: React.FC = () => (
  <div className="apple-card p-10 flex flex-col items-center text-center gap-3">
    <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
      <ShieldAlert className="w-6 h-6" />
    </div>
    <h2 className="text-lg font-semibold">Access restricted</h2>
    <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-sm">
      Your role does not have permission to open this module. Contact an Admin L2 if you need access.
    </p>
  </div>
);

/**
 * Role gate for a module route. Roles come from APP_NAVIGATION so the sidebar
 * and the router can never disagree. This is UX only — the backend must enforce it too.
 */
export const RequireNavAccess: React.FC<{ navId: string }> = ({ navId }) => {
  const role = useAuthStore((state) => state.user?.role) as UserRole | undefined;
  const nav = APP_NAVIGATION.find((item) => item.id === navId);
  const allowed = !!role && !!nav && nav.allowedRoles.includes(role);
  return allowed ? <Outlet /> : <AccessDenied />;
};
