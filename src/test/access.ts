import { PERMISSIONS, type AdminLevel, type Permission } from '../config/access';
import { useAuthStore } from '../store/useAuthStore';

/** Permissions of approval-level groups (Procurement's *_APPROVAL groups and SYSTEM_ADMINISTRATION): Level 2 only. */
export const APPROVAL_LEVEL_PERMISSIONS: readonly Permission[] = [
  'EMPLOYEE_APPROVE',
  'EMPLOYEE_DELETE',
  'EMPLOYEE_PROFILE_CHANGE_APPROVE',
  'SUPPLIER_DELETE',
  'SUPPLIER_LOGIN_APPROVE',
  'PROCUREMENT_ORDER_APPROVE',
  'SUPPLIER_PAYMENT_APPROVE',
  'SUPPLIER_RETURN_APPROVE',
  'PRODUCT_APPROVAL_DECIDE',
  'STOCK_APPROVE',
  'BARCODE_APPROVE',
  'REFUND_APPROVE',
  'COMPANY_PROFILE_APPROVE',
  'DOCUMENT_APPROVE',
  'PAYMENT_APPROVE',
  'EXPENSE_APPROVE',
  'DEMO_APPROVE',
  'SYSTEM_SETTINGS_MANAGE',
  'AUDIT_LOG_VIEW',
  'COMPANY_PROFILE_DRAFT_DELETE_ANY',
  'DEMO_COMPLETED_EDIT',
  'CAREER_DECISION_APPROVE',
  'STOREFRONT_FEATURE_TOGGLE',
  'PROMO_CODE_MANAGE',
];

/** What a supplier login holds (Procurement's SUPPLIER_PORTAL group), and nothing else. */
export const SUPPLIER_PORTAL: readonly Permission[] = [
  'SUPPLIER_PORTAL_VIEW',
  'SUPPLIER_QUOTATION_SUBMIT',
  'SUPPLIER_QUOTATION_CHANGE_REQUEST',
  'SUPPLIER_ORDER_RESPOND',
  'SUPPLIER_ORDER_SHIP',
  'SUPPLIER_PAYMENT_CONFIRM',
  'SUPPLIER_RETURN_RESPOND',
  'SUPPLIER_REPAYMENT_SUBMIT',
];

/**
 * What a Super Admin holds at the given level(s), as the backend would report it: everything internal at Level 2,
 * everything but the approval-level permissions at Level 1. Tests use it to sign in as the old "L1" / "L2" admins.
 */
export const superAdminPermissions = (...levels: AdminLevel[]): Permission[] =>
  PERMISSIONS.filter(
    (permission) =>
      !SUPPLIER_PORTAL.includes(permission) && (levels.includes('ADMIN_L2') || !APPROVAL_LEVEL_PERMISSIONS.includes(permission))
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

/** Signs a test user in as a supplier with a supplier login. */
export const signInAsSupplier = (username = 'supplier') =>
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: {
      userId: 7,
      username,
      email: `${username}@supplier.test`,
      role: 'SUPPLIER',
      authClient: 'WEB',
      isFirstLogin: false,
      designation: null,
      designationLabel: 'Supplier',
      permissionGroups: ['SUPPLIER_PORTAL'],
      permissions: [...SUPPLIER_PORTAL],
    },
  });
