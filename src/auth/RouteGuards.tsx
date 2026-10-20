import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { clearSession, isSessionExpired } from './session';
import { APP_NAVIGATION } from '../config/permissions.config';
import type { Permission } from '../config/access';
import { useAccess } from '../hooks/useAccess';

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
    return <Navigate to={user.isFirstLogin ? '/reset-password' : '/'} replace />;
  }
  return <>{children}</>;
};

/** The landing page: the first module the user may open, or their profile when there is none. */
export const HomeRedirect: React.FC = () => {
  const { authorizedNavigation } = useAccess();
  const first = authorizedNavigation()[0];
  return <Navigate to={first ? first.path : '/profile'} replace />;
};

export const AccessDenied: React.FC = () => {
  const { designationLabel, can } = useAccess();
  if (can('DEALER_PORTAL_VIEW')) {
    return (
      <div className="apple-card p-10 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold">Access restricted</h2>
        <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-sm">
          This area isn't part of the dealer portal. Use My Quotations and My Orders.
        </p>
      </div>
    );
  }
  return (
    <div className="apple-card p-10 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-semibold">Access restricted</h2>
      <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-sm">
        {designationLabel
          ? `Your designation (${designationLabel}) doesn't include this area.`
          : 'No designation is assigned to your account yet.'}{' '}
        Ask an administrator in Employee Management if you need access.
      </p>
    </div>
  );
};

/**
 * Permission gate for a module route. The permissions come from APP_NAVIGATION so the sidebar and the router can
 * never disagree; `requires` narrows a sub-route further (e.g. stock inside Item Management). UX only: the backend
 * enforces it too.
 */
export const RequireNavAccess: React.FC<{ navId: string; requires?: readonly Permission[] }> = ({ navId, requires }) => {
  const { canAny, canOpen } = useAccess();
  const nav = APP_NAVIGATION.find((item) => item.id === navId);
  const allowed = !!nav && canOpen(nav) && (!requires || canAny(...requires));
  return allowed ? <Outlet /> : <AccessDenied />;
};
