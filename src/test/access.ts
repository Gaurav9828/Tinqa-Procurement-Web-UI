import { PERMISSIONS, type AdminLevel, type Permission } from '../config/access';
import { useAuthStore } from '../store/useAuthStore';

/** Permissions of approval-level groups (Procurement's *_APPROVAL groups and SYSTEM_ADMINISTRATION): Level 2 only. */
export const APPROVAL_LEVEL_PERMISSIONS: readonly Permission[] = [
  'EMPLOYEE_APPROVE',
  'EMPLOYEE_DELETE',
  'EMPLOYEE_PROFILE_CHANGE_APPROVE',
  'DEALER_DELETE',
  'PROCUREMENT_ORDER_APPROVE',
  'PRODUCT_APPROVAL_DECIDE',
  'STOCK_APPROVE',
  'REFUND_APPROVE',
  'COMPANY_PROFILE_APPROVE',
  'DOCUMENT_APPROVE',
  'PAYMENT_APPROVE',
  'SYSTEM_SETTINGS_MANAGE',
  'AUDIT_LOG_VIEW',
];

const DEALER_PORTAL: readonly Permission[] = ['DEALER_QUOTATION_SUBMIT', 'DEALER_ORDER_RESPOND'];

/**
 * What a Super Admin holds at the given level(s), as the backend would report it: everything internal at Level 2,
 * everything but the approval-level permissions at Level 1. Tests use it to sign in as the old "L1" / "L2" admins.
 */
export const superAdminPermissions = (...levels: AdminLevel[]): Permission[] =>
  PERMISSIONS.filter(
    (permission) =>
      !DEALER_PORTAL.includes(permission) && (levels.includes('ADMIN_L2') || !APPROVAL_LEVEL_PERMISSIONS.includes(permission))
  );

/** Signs a test user in with a Super Admin's permissions at the given level. */
export const signInAsSuperAdmin = (level: AdminLevel = 'ADMIN_L1', username = 'admin') =>
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: {
      userId: 1,
      username,
      email: `${username}@tinqa.com`,
      role: level,
      authClient: 'web',
      isFirstLogin: false,
      permissions: superAdminPermissions(level),
    },
  });
