import { APPROVAL_PERMISSIONS, type AdminLevel, type Permission } from './access';

/** Admin level carried by the account. Display and maker-checker identity only; gate features with permissions. */
export type UserRole = AdminLevel;

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  /** Opens for a user holding any of these. The sidebar and the router both use it, so they never disagree. */
  requires: readonly Permission[];
}

export const APP_NAVIGATION: NavigationItem[] = [
  // Dealer logins: their own quotations, and their orders once a quotation is approved. Nothing else opens for them.
  {
    id: 'dealer-quotations',
    label: 'My Quotations',
    path: '/dealer/quotations',
    iconName: 'FileText',
    requires: ['DEALER_PORTAL_VIEW'],
  },
  {
    id: 'dealer-orders',
    label: 'My Orders',
    path: '/dealer/orders',
    iconName: 'ShoppingBag',
    requires: ['DEALER_PORTAL_VIEW'],
  },
  // {
  //   id: 'analytics',
  //   label: 'Analytics',
  //   path: '/analytics',
  //   iconName: 'BarChart3',
  //   requires: ['ANALYTICS_VIEW'],
  // },
  {
    // Company account: Overview and Ledger need FINANCE_REPORT_VIEW, Expenses EXPENSE_VIEW / EXPENSE_SUBMIT,
    // Product profit PRODUCT_COST_VIEW
    id: 'finance',
    label: 'Accounts & Finance',
    path: '/finance',
    iconName: 'Wallet',
    requires: ['FINANCE_REPORT_VIEW', 'EXPENSE_VIEW', 'EXPENSE_SUBMIT', 'PRODUCT_COST_VIEW'],
  },
  {
    id: 'approvals',
    label: 'Approvals Hub',
    path: '/approvals',
    iconName: 'CheckCircle2',
    requires: APPROVAL_PERMISSIONS,
  },
  {
    id: 'orders',
    label: 'Orders Management',
    path: '/orders',
    iconName: 'ShoppingCart',
    requires: ['PROCUREMENT_ORDER_VIEW'],
  },
  {
    // Agents book sales (STORE_ORDER_CREATE) and follow their own (STORE_ORDER_VIEW); store and finance staff see all
    id: 'store-sales',
    label: 'Store Sales',
    path: '/store-sales',
    iconName: 'Store',
    requires: ['STORE_ORDER_CREATE', 'STORE_ORDER_VIEW', 'STORE_SALES_VIEW_ALL'],
  },
  {
    id: 'order-tracking',
    label: 'Customer Order Tracking',
    path: '/order-tracking',
    iconName: 'Truck',
    requires: ['CUSTOMER_ORDER_VIEW'],
  },
  {
    // Storefront customers: profile, purchase history, cart and tickets, so customer care can follow up
    id: 'customers',
    label: 'Customer Management',
    path: '/customers',
    iconName: 'Contact',
    requires: ['CUSTOMER_VIEW'],
  },
  {
    id: 'support-tickets',
    label: 'Support Tickets',
    path: '/support-tickets',
    iconName: 'LifeBuoy',
    requires: ['SUPPORT_TICKET_VIEW'],
  },
  {
    id: 'reviews',
    label: 'Reviews',
    path: '/reviews',
    iconName: 'Star',
    requires: ['REVIEW_VIEW'],
  },
  {
    id: 'employees',
    label: 'Employee Management',
    path: '/employees',
    iconName: 'UserCheck',
    requires: ['EMPLOYEE_VIEW'],
  },
  {
    // Stock Management lives inside Item Management (/item/stocks), not in the sidebar; either view opens the module.
    id: 'items',
    label: 'Item Management',
    path: '/item',
    iconName: 'Tag',
    requires: ['ITEM_VIEW', 'STOCK_VIEW'],
  },
  {
    // Trace any piece or product unit by its barcode: batch, purchase order, dealer, the product it is in, its parts
    id: 'barcodes',
    label: 'Barcode Tracking',
    path: '/barcodes',
    iconName: 'ScanBarcode',
    requires: ['BARCODE_VIEW'],
  },
  {
    id: 'products',
    label: 'Products Management',
    path: '/products',
    iconName: 'Package',
    requires: ['PRODUCT_VIEW'],
  },
  {
    id: 'dealers',
    label: 'Dealer Management',
    path: '/dealers',
    iconName: 'Users',
    requires: ['DEALER_VIEW'],
  },
  // {
  //   id: 'auctions',
  //   label: 'Auctions Control',
  //   path: '/auctions',
  //   iconName: 'Gavel',
  //   requires: [],
  // },
  {
    // Monthly salaries: PAYMENT_RECORD records transfers, PAYMENT_APPROVE (Level 2) confirms them
    id: 'payments',
    label: 'Payments & Chalans',
    path: '/payments',
    iconName: 'CreditCard',
    requires: ['PAYMENT_VIEW'],
  },
  {
    // Visits to clients for demos and promotions: DEMO_MANAGE plans them step by step and records their bills,
    // DEMO_APPROVE (Level 2) approves quotations and completions; completions are booked as travel & conveyance
    id: 'client-demos',
    label: 'Client Demos & Meetings',
    path: '/client-demos',
    iconName: 'Presentation',
    requires: ['DEMO_VIEW'],
  },
  {
    // Every employee: the client demos they are tagged on, and their own hotel, food and travel bills on them
    id: 'my-demos',
    label: 'My Demos',
    path: '/my-demos',
    iconName: 'MapPin',
    requires: ['DEMO_VIEW_OWN'],
  },
  {
    // Every employee: their own payslips of confirmed months
    id: 'my-payslips',
    label: 'My Payslips',
    path: '/my-payslips',
    iconName: 'FileText',
    requires: ['PAYSLIP_VIEW_OWN'],
  },
  // {
  //   id: 'complaints',
  //   label: 'Complaints & Claims',
  //   path: '/complaints',
  //   iconName: 'AlertCircle',
  //   requires: [],
  // },
  // {
  //   id: 'documents',
  //   label: 'Document Library',
  //   path: '/documents',
  //   iconName: 'Folder',
  //   requires: ['DOCUMENT_VIEW'],
  // },
  {
    // Settings → Company profile. COMPANY_PROFILE_EDIT drafts changes, COMPANY_PROFILE_APPROVE approves them.
    id: 'company-profile',
    label: 'Company Profile',
    path: '/settings/company-profile',
    iconName: 'Building2',
    requires: ['COMPANY_PROFILE_VIEW'],
  },
  // {
  //   id: 'system-settings',
  //   label: 'System Configuration',
  //   path: '/settings',
  //   iconName: 'Settings',
  //   requires: ['SYSTEM_SETTINGS_MANAGE'],
  // },
  {
    // Always last: the sidebar pins it to the bottom, below a divider
    id: 'user-guide',
    label: 'User Guide',
    path: '/user-guide',
    iconName: 'BookOpen',
    requires: ['USER_GUIDE_VIEW'],
  },
];