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
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    iconName: 'BarChart3',
    requires: ['ANALYTICS_VIEW'],
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
    id: 'order-tracking',
    label: 'Customer Order Tracking',
    path: '/order-tracking',
    iconName: 'Truck',
    requires: ['CUSTOMER_ORDER_VIEW'],
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
    id: 'payments',
    label: 'Payments & Chalans',
    path: '/payments',
    iconName: 'CreditCard',
    requires: ['PAYMENT_VIEW'],
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
];