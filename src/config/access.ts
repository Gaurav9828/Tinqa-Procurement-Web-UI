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
  // Custom roles (e.g. Marketing Executive) built from the permission groups the admin holds (docs/outreach-meetings-roles.md)
  'ROLE_VIEW',
  'ROLE_MANAGE',
  // Suppliers
  'SUPPLIER_VIEW',
  'SUPPLIER_CREATE',
  'SUPPLIER_UPDATE',
  'SUPPLIER_TOGGLE_STATUS',
  'SUPPLIER_CATEGORY_MANAGE',
  'SUPPLIER_DELETE',
  // Supplier logins: a Supplier Manager creates one, someone else (Level 2) approves it
  'SUPPLIER_LOGIN_MANAGE',
  'SUPPLIER_LOGIN_APPROVE',
  // Procurement orders
  'PROCUREMENT_ORDER_VIEW',
  'PROCUREMENT_ORDER_CREATE',
  'PROCUREMENT_ORDER_UPDATE',
  'PROCUREMENT_ORDER_UPDATE_STATUS',
  'PROCUREMENT_ORDER_APPROVE',
  // Suppliers' changes to their quotations apply only once a Supplier Manager (either level) approves them
  'SUPPLIER_QUOTATION_CHANGE_APPROVE',
  // Payments to suppliers against a quotation's payment plan, and refunds from them. The Finance Manager requests a
  // payment (RECORD), only the Super Admin approves it (APPROVE), then the Finance Manager pays it and gives the UTR /
  // transaction ID / cheque number. Seen by everyone with PROCUREMENT_ORDER_VIEW
  'SUPPLIER_PAYMENT_RECORD',
  'SUPPLIER_PAYMENT_APPROVE',
  // Failed-piece returns to the supplier: a Supplier Manager raises, dispatches, sends again or cancels a return
  // (PROCUREMENT_ORDER_MANAGEMENT); only the Super Admin approves it (SUPPLIER_PAYMENT_APPROVAL). RECORD now also lets
  // the Finance Manager ask for a reversal and check the money suppliers pay back
  'SUPPLIER_RETURN_REQUEST',
  'SUPPLIER_RETURN_APPROVE',
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
  // Product costing: cost sheets (component costs + extra costs such as manpower), product and order profit / PAT
  'PRODUCT_COST_VIEW',
  'PRODUCT_COST_EDIT',
  // Inventory
  'STOCK_VIEW',
  'STOCK_CREATE',
  'STOCK_ADJUST',
  'STOCK_UPDATE',
  'STOREFRONT_STOCK_UPDATE',
  'STOCK_APPROVE',
  // Barcodes: one on every piece of item stock and every product unit, entered with the stock or product change that
  // creates it and locked once that is approved. Afterwards only a Level 2 Super Admin (BARCODE_APPROVE) changes them
  'BARCODE_VIEW',
  'BARCODE_REQUEST',
  'BARCODE_APPROVE',
  // Customer orders and delivery
  'CUSTOMER_ORDER_VIEW',
  'CUSTOMER_ORDER_UPDATE_STATUS',
  'CUSTOMER_ORDER_PRE_ORDER_APPROVE',
  'CUSTOMER_ORDER_TRACKING_UPDATE',
  // Delivery riders: only the delivery outcomes (DELIVERY_OUTCOMES in order-tracking/utils/statusWorkflow.ts)
  'DELIVERY_STATUS_UPDATE',
  'DELIVERY_ASSIGN',
  // Store sales: agents book orders for walk-in customers (cash they received is booked at once); managers read all
  'STORE_SALES_VIEW_ALL',
  'STORE_CUSTOMER_REGISTER',
  'STORE_ORDER_CREATE',
  'STORE_ORDER_VIEW',
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
  // Customers: profile, order history, cart and tickets (customer care); changes are asked for and made by Super Admin
  'CUSTOMER_VIEW',
  'CUSTOMER_CHANGE_REQUEST',
  'CUSTOMER_UPDATE',
  // Promo codes (docs/promo-codes.md): group PROMO_CODE_READ "Promo codes - view" (Super Admin, Store Manager, Store
  // Sales Agent, Customer Support, Finance Manager, Financial Auditor) sees the codes to tell customers which one to
  // use (a code for chosen customers only as TINQA***). PROMO_CODE_SHARE (group PROMO_CODE_MANAGEMENT: Super Admin,
  // Store Manager, Sales Agent, Customer Support) emails such a code to its customers and shows an everyone code on
  // the storefront; PROMO_CODE_MANAGE (SYSTEM_ADMINISTRATION, Super Admin Level 2 only, never in a custom role)
  // creates, edits, switches them off and sees every code in full
  'PROMO_CODE_VIEW',
  'PROMO_CODE_SHARE',
  'PROMO_CODE_MANAGE',
  // Company profile
  'COMPANY_PROFILE_VIEW',
  'COMPANY_PROFILE_EDIT',
  'COMPANY_PROFILE_APPROVE',
  // Super Admin: delete anyone's draft (COMPANY_PROFILE_EDIT deletes only your own)
  'COMPANY_PROFILE_DRAFT_DELETE_ANY',
  // Documents
  'DOCUMENT_VIEW',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_DELETE',
  'DOCUMENT_APPROVE',
  // Money. Salaries (Payments & Chalans): recorded as transferred, confirmed by a different Level 2 approver
  'PAYMENT_VIEW',
  'PAYMENT_RECORD',
  'PAYMENT_APPROVE',
  'FINANCE_REPORT_VIEW',
  'FINANCE_REPORT_EXPORT',
  // Expenses and other vouchers: raised, approved by someone else, then posted to the company account
  'EXPENSE_VIEW',
  'EXPENSE_SUBMIT',
  'EXPENSE_APPROVE',
  'ANALYTICS_VIEW',
  // Client demos & meetings: planned as a quotation (cost estimate), approved, bills recorded, completion approved and
  // booked as travel; a completed demo is reopened and corrected only by a Super Admin (DEMO_COMPLETED_EDIT)
  'DEMO_VIEW',
  'DEMO_MANAGE',
  'DEMO_APPROVE',
  'DEMO_COMPLETED_EDIT',
  // A product unit that did not come back from a demo is written off by a Super Admin (Level 2)
  'DEMO_UNIT_WRITE_OFF',
  // Client outreach: every call, email and WhatsApp message with a business we pitch to
  'OUTREACH_VIEW',
  'OUTREACH_LOG',
  // Meetings: scheduled without approval; the organiser cancels, replaces decliners and completes them
  'MEETING_VIEW_ALL',
  'MEETING_SCHEDULE',
  // Careers (Procurement catalog groups RECRUITMENT_READ "Careers - view openings and applications",
  // RECRUITMENT_MANAGEMENT "Careers - post openings, screen applicants and schedule interviews" and RECRUITMENT_APPROVAL
  // "Careers - confirm shortlists and selections", approval level): Level 1 screens and shortlists, a different
  // Level 2 confirms every shortlist and selection (docs/careers.md)
  'CAREER_OPENING_VIEW',
  'CAREER_APPLICATION_VIEW',
  'CAREER_OPENING_MANAGE',
  'CAREER_APPLICATION_SCREEN',
  'CAREER_DECISION_APPROVE',
  // Platform
  'SYSTEM_SETTINGS_MANAGE',
  'AUDIT_LOG_VIEW',
  // Hide the website's Careers tab and bring it back (Super Admin, Level 2)
  'STOREFRONT_FEATURE_TOGGLE',
  // In-app user guide and its per-role PDF downloads (Super Admin, Store Manager)
  'USER_GUIDE_VIEW',
  // Every employee: their own payslips (My Payslips)
  'PAYSLIP_VIEW_OWN',
  // Staff whose role goes on client demos (group CLIENT_DEMO_ATTENDANCE: Super Admin, Store Manager, Finance Manager,
  // Sales Agent): the demos they are tagged on (My Demos) and their own bills there. Riders and others have none
  'DEMO_VIEW_OWN',
  'DEMO_EXPENSE_RECORD_OWN',
  // Hand out and back the product units taken on demos you attend, by barcode
  'DEMO_UNITS_HANDLE_OWN',
  // Meetings you are invited to: decline within 24 hours of the invite, give feedback once completed
  'MEETING_VIEW_OWN',
  'MEETING_RESPOND_OWN',
  // Supplier portal: held only by supplier logins, always limited to the supplier's own records on the server
  'SUPPLIER_PORTAL_VIEW',
  'SUPPLIER_QUOTATION_SUBMIT',
  'SUPPLIER_QUOTATION_CHANGE_REQUEST',
  'SUPPLIER_ORDER_RESPOND',
  'SUPPLIER_ORDER_SHIP',
  // Confirm whether a payment recorded for your order reached you, whatever its method (it counts as paid only then)
  'SUPPLIER_PAYMENT_CONFIRM',
  // Accept or decline a return of failed pieces, and confirm the pieces arrived
  'SUPPLIER_RETURN_RESPOND',
  // Pay back what TinQa asks (a reversal, a return's pieces and shipping) and refunds due, with the UTR and a receipt
  'SUPPLIER_REPAYMENT_SUBMIT',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const DESIGNATIONS = [
  'SUPER_ADMIN',
  'STORE_MANAGER',
  'SUPPLIER_MANAGER',
  'CATALOG_SPECIALIST',
  'FULFILLMENT_SPECIALIST',
  'DELIVERY_RIDER',
  'FLEET_COORDINATOR',
  'CUSTOMER_SUPPORT',
  'FINANCIAL_AUDITOR',
  'FINANCE_MANAGER',
  'SALES_AGENT',
] as const;

/** A designation built into the backend (Procurement `DesignationAccess`). */
export type BuiltInDesignation = (typeof DESIGNATIONS)[number];

/**
 * A designation code: a built-in one, or a custom role an admin created (e.g. `MARKETING_EXECUTIVE`, listed by
 * GET /v1/access/catalog). Custom codes are only known at run time, so any string is accepted; built-ins keep their
 * literal types for autocompletion.
 */
export type Designation = BuiltInDesignation | (string & {});

/** Admin levels. Level 1 never holds approval-level groups; Level 2 holds every group of its designation. */
export type AdminLevel = 'ADMIN_L1' | 'ADMIN_L2';

export const ADMIN_LEVEL_LABELS: Record<AdminLevel, string> = {
  ADMIN_L1: 'Level 1 (maker)',
  ADMIN_L2: 'Level 2 (approver)',
};

/** Every approval action (and reviewing suppliers' quotations, and making approved payments). Holding any opens the Approvals Hub. */
export const APPROVAL_PERMISSIONS: readonly Permission[] = [
  'EMPLOYEE_APPROVE',
  'EMPLOYEE_PROFILE_CHANGE_APPROVE',
  'DOCUMENT_APPROVE',
  'STOCK_APPROVE',
  'PRODUCT_APPROVAL_DECIDE',
  'BARCODE_APPROVE',
  'PROCUREMENT_ORDER_APPROVE',
  // Submitting or cancelling the quotations suppliers send in
  'PROCUREMENT_ORDER_UPDATE_STATUS',
  'REFUND_APPROVE',
  'COMPANY_PROFILE_APPROVE',
  'EXPENSE_APPROVE',
  'SUPPLIER_LOGIN_APPROVE',
  'SUPPLIER_QUOTATION_CHANGE_APPROVE',
  'SUPPLIER_PAYMENT_APPROVE',
  // Returns of failed pieces to the supplier (Super Admin only)
  'SUPPLIER_RETURN_APPROVE',
  // The Finance Manager's "Payments to make" and "Supplier repayments" queues: approved payment requests to pay,
  // payments not received, and money suppliers paid back to check
  'SUPPLIER_PAYMENT_RECORD',
  'CUSTOMER_ORDER_PRE_ORDER_APPROVE',
  'DEMO_APPROVE',
  'CAREER_DECISION_APPROVE',
];

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);
const DESIGNATION_SET: ReadonlySet<string> = new Set(DESIGNATIONS);

export const isPermission = (value: unknown): value is Permission => typeof value === 'string' && PERMISSION_SET.has(value);

export const isBuiltInDesignation = (value: unknown): value is BuiltInDesignation =>
  typeof value === 'string' && DESIGNATION_SET.has(value);

/** Server catalog (GET /v1/access/catalog). */
export interface DesignationEntry {
  code: Designation;
  label: string;
  /** The department every employee with this designation belongs to. */
  department: string;
  description: string;
  /** Groups held at Level 2; Level 1 holds these minus the approval-level ones. */
  groups: string[];
  /** A custom role created by an admin (Employee Management › Roles & permissions); built-ins are false. */
  custom?: boolean;
  /** The catalog lists active roles only; kept for completeness. */
  active?: boolean;
  /** The custom role's id; null for built-ins. */
  id?: number | null;
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
