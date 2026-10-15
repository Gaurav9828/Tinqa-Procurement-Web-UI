/**
 * The access catalog as the UI knows it: designation -> permission groups -> permissions.
 *
 * The Procurement backend owns the catalog (com.tinqa.procurement.security.access) and tells the UI which
 * permissions the signed-in user holds (login response, GET /v1/access/me). These names must match the backend's
 * exactly. Never derive a user's permissions here from their designation: always use the list the server sent.
 * UI checks are UX only; both backends refuse anything the user lacks.
 */

export const PERMISSIONS = [
  // Employees
  'EMPLOYEE_VIEW',
  'EMPLOYEE_CREATE',
  'EMPLOYEE_UPDATE',
  'EMPLOYEE_REQUEST_DELETION',
  'EMPLOYEE_APPROVE',
  'EMPLOYEE_DELETE',
  'EMPLOYEE_PROFILE_CHANGE_APPROVE',
  // Dealers
  'DEALER_VIEW',
  'DEALER_CREATE',
  'DEALER_UPDATE',
  'DEALER_TOGGLE_STATUS',
  'DEALER_CATEGORY_MANAGE',
  'DEALER_DELETE',
  // Procurement orders
  'PROCUREMENT_ORDER_VIEW',
  'PROCUREMENT_ORDER_CREATE',
  'PROCUREMENT_ORDER_UPDATE',
  'PROCUREMENT_ORDER_UPDATE_STATUS',
  'PROCUREMENT_ORDER_APPROVE',
  // Catalog
  'ITEM_VIEW',
  'PRODUCT_VIEW',
  'ITEM_CREATE',
  'ITEM_UPDATE',
  'ITEM_DELETE',
  'ITEM_CATEGORY_MANAGE',
  'PRODUCT_CREATE',
  'PRODUCT_UPDATE',
  'PRODUCT_DELETE',
  'PRODUCT_APPROVAL_SUBMIT',
  'PRODUCT_PUBLISH',
  'PRODUCT_APPROVAL_DECIDE',
  // Inventory
  'STOCK_VIEW',
  'STOCK_CREATE',
  'STOCK_ADJUST',
  'STOCK_UPDATE',
  'STOREFRONT_STOCK_UPDATE',
  'STOCK_APPROVE',
  // Customer orders and delivery
  'CUSTOMER_ORDER_VIEW',
  'CUSTOMER_ORDER_UPDATE_STATUS',
  'CUSTOMER_ORDER_PRE_ORDER_APPROVE',
  'CUSTOMER_ORDER_TRACKING_UPDATE',
  // Delivery riders: only the delivery outcomes (DELIVERY_OUTCOMES in order-tracking/utils/statusWorkflow.ts)
  'DELIVERY_STATUS_UPDATE',
  'DELIVERY_ASSIGN',
  // Refunds
  'REFUND_VIEW',
  'REFUND_REQUEST',
  'REFUND_SYNC',
  'REFUND_APPROVE',
  // Customer care
  'SUPPORT_TICKET_VIEW',
  'SUPPORT_TICKET_REPLY',
  'SUPPORT_TICKET_UPDATE_STATUS',
  'REVIEW_VIEW',
  'REVIEW_MODERATE',
  // Company profile
  'COMPANY_PROFILE_VIEW',
  'COMPANY_PROFILE_EDIT',
  'COMPANY_PROFILE_APPROVE',
  // Documents
  'DOCUMENT_VIEW',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_DELETE',
  'DOCUMENT_APPROVE',
  // Money
  'PAYMENT_VIEW',
  'PAYMENT_RECORD',
  'PAYMENT_APPROVE',
  'FINANCE_REPORT_VIEW',
  'FINANCE_REPORT_EXPORT',
  'ANALYTICS_VIEW',
  // Platform
  'SYSTEM_SETTINGS_MANAGE',
  'AUDIT_LOG_VIEW',
  // Dealer portal (external dealers)
  'DEALER_QUOTATION_SUBMIT',
  'DEALER_ORDER_RESPOND',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const DESIGNATIONS = [
  'SUPER_ADMIN',
  'STORE_MANAGER',
  'DEALER_MANAGER',
  'CATALOG_SPECIALIST',
  'FULFILLMENT_SPECIALIST',
  'DELIVERY_RIDER',
  'FLEET_COORDINATOR',
  'CUSTOMER_SUPPORT',
  'FINANCIAL_AUDITOR',
] as const;

export type Designation = (typeof DESIGNATIONS)[number];

/** Admin levels. Level 1 never holds approval-level groups; Level 2 holds every group of its designation. */
export type AdminLevel = 'ADMIN_L1' | 'ADMIN_L2';

export const ADMIN_LEVEL_LABELS: Record<AdminLevel, string> = {
  ADMIN_L1: 'Level 1 (maker)',
  ADMIN_L2: 'Level 2 (approver)',
};

/** Every approval action. Holding any of them opens the Approvals Hub. */
export const APPROVAL_PERMISSIONS: readonly Permission[] = [
  'EMPLOYEE_APPROVE',
  'EMPLOYEE_PROFILE_CHANGE_APPROVE',
  'DOCUMENT_APPROVE',
  'STOCK_APPROVE',
  'PRODUCT_APPROVAL_DECIDE',
  'PROCUREMENT_ORDER_APPROVE',
  'REFUND_APPROVE',
  'COMPANY_PROFILE_APPROVE',
];

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);
const DESIGNATION_SET: ReadonlySet<string> = new Set(DESIGNATIONS);

export const isPermission = (value: unknown): value is Permission => typeof value === 'string' && PERMISSION_SET.has(value);

export const isDesignation = (value: unknown): value is Designation => typeof value === 'string' && DESIGNATION_SET.has(value);

/** Server catalog (GET /v1/access/catalog). */
export interface DesignationEntry {
  code: Designation;
  label: string;
  /** The department every employee with this designation belongs to. */
  department: string;
  description: string;
  /** Groups held at Level 2; Level 1 holds these minus the approval-level ones. */
  groups: string[];
}

export interface PermissionGroupEntry {
  code: string;
  label: string;
  approvalLevel: boolean;
}

export interface PermissionEntry {
  code: string;
  label: string;
  group: string;
}

export interface AccessCatalog {
  designations: DesignationEntry[];
  groups: PermissionGroupEntry[];
  permissions: PermissionEntry[];
}

/** One account's access (GET /v1/access/me, and the same fields on the login response). */
export interface MyAccess {
  role: string | null;
  designation: string | null;
  designationLabel: string | null;
  permissionGroups: string[];
  permissions: string[];
}
