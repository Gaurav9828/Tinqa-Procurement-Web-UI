export type UserRole = 'ADMIN_L1' | 'ADMIN_L2';

export type FeatureKey =
  | 'VIEW_PROFILE'
  | 'EDIT_PROFILE_DIRECT'
  | 'APPROVE_PROFILE_CHANGES'
  | 'VIEW_DOCUMENTS'
  | 'UPLOAD_DOCUMENTS'
  | 'MANAGE_SYSTEM_SETTINGS'
  | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_ORDERS'
  | 'MANAGE_AUCTIONS'
  | 'MANAGE_DEALERS'
  | 'MANAGE_PAYMENTS'
  | 'MANAGE_COMPLAINTS'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_EMPLOYEES'
  | 'FINALIZE_EMPLOYEE_DELETE';

export const FEATURE_PERMISSIONS: Record<FeatureKey, UserRole[]> = {
  VIEW_PROFILE: ['ADMIN_L1', 'ADMIN_L2'],
  EDIT_PROFILE_DIRECT: ['ADMIN_L1', 'ADMIN_L2'],
  APPROVE_PROFILE_CHANGES: ['ADMIN_L2'],
  VIEW_DOCUMENTS: ['ADMIN_L1', 'ADMIN_L2'],
  UPLOAD_DOCUMENTS: ['ADMIN_L1'],
  MANAGE_SYSTEM_SETTINGS: ['ADMIN_L2'],
  VIEW_AUDIT_LOGS: ['ADMIN_L2'],
  MANAGE_ORDERS: ['ADMIN_L1', 'ADMIN_L2'],
  MANAGE_AUCTIONS: ['ADMIN_L1', 'ADMIN_L2'],
  MANAGE_DEALERS: ['ADMIN_L1', 'ADMIN_L2'],
  MANAGE_PAYMENTS: ['ADMIN_L1', 'ADMIN_L2'],
  MANAGE_COMPLAINTS: ['ADMIN_L1', 'ADMIN_L2'],
  VIEW_ANALYTICS: ['ADMIN_L1', 'ADMIN_L2'],
  MANAGE_EMPLOYEES: ['ADMIN_L1', 'ADMIN_L2'],
  FINALIZE_EMPLOYEE_DELETE: ['ADMIN_L2'],
};

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  allowedRoles: UserRole[];
}

export const APP_NAVIGATION: NavigationItem[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    iconName: 'BarChart3',
    allowedRoles: ['ADMIN_L1', 'ADMIN_L2'],
  },
  {
    id: 'approvals',
    label: 'Approvals Hub',
    path: '/approvals',
    iconName: 'CheckCircle2',
    allowedRoles: ['ADMIN_L1', 'ADMIN_L2'],
  },
  {
    id: 'orders',
    label: 'Orders Management',
    path: '/orders',
    iconName: 'Package',
    allowedRoles: ['ADMIN_L1', 'ADMIN_L2'],
  },
  {
    id: 'employees',
    label: 'Employee Management',
    path: '/employees',
    iconName: 'UserCheck',
    allowedRoles: ['ADMIN_L1', 'ADMIN_L2'],
  },
  {
    id: 'auctions',
    label: 'Auctions Control',
    path: '/auctions',
    iconName: 'Gavel',
    allowedRoles: ['ADMIN_L1', 'ADMIN_L2'],
  },
  {
    id: 'dealers',
    label: 'Dealers & Labours',
    path: '/dealers',
    iconName: 'Users',
    allowedRoles: ['ADMIN_L1', 'ADMIN_L2'],
  },
  {
    id: 'payments',
    label: 'Payments & Chalans',
    path: '/payments',
    iconName: 'CreditCard',
    allowedRoles: ['ADMIN_L1', 'ADMIN_L2'],
  },
  {
    id: 'complaints',
    label: 'Complaints & Claims',
    path: '/complaints',
    iconName: 'AlertCircle',
    allowedRoles: ['ADMIN_L1', 'ADMIN_L2'],
  },
  {
    id: 'documents',
    label: 'Document Library',
    path: '/documents',
    iconName: 'Folder',
    allowedRoles: ['ADMIN_L1', 'ADMIN_L2'],
  },
  {
    id: 'system-settings',
    label: 'System Configuration',
    path: '/settings',
    iconName: 'Settings',
    allowedRoles: ['ADMIN_L2'],
  },
];