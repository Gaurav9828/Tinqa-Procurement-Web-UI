import { axiosClient } from '../../../api/axiosClient';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { Permission } from '../../../config/access';
import type { ApiResponse } from '../../../types/common.types';

/**
 * The Approvals Hub badges: how many requests wait in each queue, counted by one SQL function per backend
 * (approval_queue_counts) instead of downloading every queue's list. Each backend returns only the queues the caller
 * may decide; the permissions below mirror its ApprovalQueue enum, so the hub calls a backend only when at least one
 * of its queues is the user's.
 */
export const PROCUREMENT_QUEUES = {
  DOCUMENTS: ['DOCUMENT_APPROVE', 'DOCUMENT_VIEW'],
  PROFILE_CHANGES: ['EMPLOYEE_PROFILE_CHANGE_APPROVE'],
  STOCK: ['STOCK_APPROVE', 'STOCK_VIEW'],
  QUOTATIONS: ['PROCUREMENT_ORDER_UPDATE_STATUS', 'PROCUREMENT_ORDER_VIEW'],
  ORDERS: ['PROCUREMENT_ORDER_APPROVE', 'PROCUREMENT_ORDER_VIEW'],
  RETURNS: ['PROCUREMENT_ORDER_APPROVE', 'PROCUREMENT_ORDER_VIEW'],
  PRODUCTS: ['PRODUCT_APPROVAL_DECIDE'],
  EMPLOYEES: ['EMPLOYEE_APPROVE'],
  SUPPLIER_LOGINS: ['SUPPLIER_LOGIN_APPROVE'],
  QUOTATION_CHANGES: ['SUPPLIER_QUOTATION_CHANGE_APPROVE'],
  BARCODES: ['BARCODE_APPROVE'],
  CLIENT_DEMOS: ['DEMO_APPROVE'],
  // Payment requests to suppliers, and refunds and reversals, waiting for the Super Admin
  SUPPLIER_PAYMENTS: ['SUPPLIER_PAYMENT_APPROVE', 'PROCUREMENT_ORDER_VIEW'],
  // Approved payment requests to pay, and payments the supplier said they did not receive: the Finance Manager's
  SUPPLIER_PAYMENTS_TO_MAKE: ['SUPPLIER_PAYMENT_RECORD', 'PROCUREMENT_ORDER_VIEW'],
  // Returns of failed pieces raised by a Supplier Manager, waiting for the Super Admin (status PENDING_APPROVAL)
  SUPPLIER_RETURNS: ['SUPPLIER_RETURN_APPROVE', 'PROCUREMENT_ORDER_VIEW'],
  // Money suppliers say they paid back, for the Finance Manager to check (status REPAYMENT_SENT)
  SUPPLIER_REPAYMENTS: ['SUPPLIER_PAYMENT_RECORD', 'PROCUREMENT_ORDER_VIEW'],
} as const satisfies Record<string, readonly Permission[]>;

export const ECOMMERCE_QUEUES = {
  REFUNDS: ['REFUND_APPROVE', 'REFUND_VIEW'],
  EXPENSES: ['EXPENSE_APPROVE', 'EXPENSE_VIEW'],
  PRE_ORDERS: ['CUSTOMER_ORDER_PRE_ORDER_APPROVE', 'CUSTOMER_ORDER_VIEW'],
  COMPANY_PROFILE: ['COMPANY_PROFILE_APPROVE', 'COMPANY_PROFILE_VIEW'],
  // Shortlists and selections waiting for a Level 2 approver (SHORTLIST_PENDING + SELECTION_PENDING)
  CAREER_DECISIONS: ['CAREER_DECISION_APPROVE', 'CAREER_APPLICATION_VIEW'],
} as const satisfies Record<string, readonly Permission[]>;

export type ApprovalQueueName = keyof typeof PROCUREMENT_QUEUES | keyof typeof ECOMMERCE_QUEUES;
export type ApprovalCounts = Partial<Record<ApprovalQueueName, number>>;

const countsOf = (data: unknown): ApprovalCounts =>
  data && typeof data === 'object' && !Array.isArray(data) ? (data as ApprovalCounts) : {};

export const approvalSummaryApi = {
  /** GET /v1/approvals/summary (any signed-in account; each queue filtered by its permissions). */
  procurement: async (): Promise<ApprovalCounts> => {
    const response = await axiosClient.get<ApiResponse<ApprovalCounts>>('/v1/approvals/summary');
    return countsOf(response.data?.data);
  },

  /** GET /admin/approvals/summary (any admin; each queue filtered by its permissions). */
  ecommerce: async (): Promise<ApprovalCounts> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<ApprovalCounts>>('/admin/approvals/summary');
    return countsOf(response.data?.data);
  },
};
