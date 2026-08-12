import { useAuth } from '../context/AuthContext'; // Access your global auth state
import { FEATURE_PERMISSIONS, APP_NAVIGATION, } from '../config/permissions.config';
import type { FeatureKey, UserRole, NavigationItem } from '../config/permissions.config';

export const useAccess = () => {
  const { user } = useAuth(); // Contains user.role from AuthResponse
  const userRole = user?.role as UserRole | undefined;

  /**
   * Check if current user has access to a specific feature key
   */
  const hasFeature = (feature: FeatureKey): boolean => {
    if (!userRole) return false;
    const allowedRoles = FEATURE_PERMISSIONS[feature];
    return allowedRoles ? allowedRoles.includes(userRole) : false;
  };

  /**
   * Check if current user explicitly holds a specific role or set of roles
   */
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!userRole) return false;
    if (Array.isArray(roles)) {
      return roles.includes(userRole);
    }
    return userRole === roles;
  };

  /**
   * Returns filtered list of navigation menus user is authorized to see
   */
  const authorizedNavigation = (): NavigationItem[] => {
    if (!userRole) return [];
    return APP_NAVIGATION.filter((nav) => nav.allowedRoles.includes(userRole));
  };

  return {
    userRole,
    hasFeature,
    hasRole,
    authorizedNavigation,
  };
};