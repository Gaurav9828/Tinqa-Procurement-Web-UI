import type { Permission } from './access';

/**
 * Which permission each backend endpoint requires, copied from the backends' @RequiresPermission annotations
 * (Procurement: com.tinqa.procurement.*.controller, Ecommerce: com.tinqa.ecommerce.controller). The API clients use it
 * to never send a request the signed-in user is not allowed to make (see createApiClient): screens should not try in
 * the first place, and this catches any that still do.
 *
 * Paths are relative to each client's base URL (both already end in `/api`); `{x}` matches one path segment and the
 * query string is ignored. Endpoints missing here only need a signed-in admin, or apply an owner rule on the server
 * (your own documents and profile), so the client lets them through. Change this together with the backends.
 */
export interface EndpointRule {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  requires: Permission;
}

const rule = (method: EndpointRule['method'], path: string, requires: Permission): EndpointRule => ({ method, path, requires });

export const PROCUREMENT_ENDPOINTS: readonly EndpointRule[] = [
  // Employees
  rule('GET', '/v1/admin/employees', 'EMPLOYEE_VIEW'),
  rule('GET', '/v1/admin/employees/pending-approvals', 'EMPLOYEE_APPROVE'),
  rule('GET', '/v1/admin/employees/{id}', 'EMPLOYEE_VIEW'),
  rule('POST', '/v1/admin/employees', 'EMPLOYEE_CREATE'),
  rule('POST', '/v1/admin/employees/email-verification', 'EMPLOYEE_CREATE'),
  rule('POST', '/v1/admin/employees/email-verification/confirm', 'EMPLOYEE_CREATE'),
  rule('PUT', '/v1/admin/employees/{id}', 'EMPLOYEE_UPDATE'),
  rule('PATCH', '/v1/admin/employees/{id}/request-deletion', 'EMPLOYEE_REQUEST_DELETION'),
  rule('PATCH', '/v1/admin/employees/{id}/approval', 'EMPLOYEE_APPROVE'),
  rule('DELETE', '/v1/admin/employees/{id}', 'EMPLOYEE_DELETE'),
  rule('GET', '/admin/profile-approvals', 'EMPLOYEE_PROFILE_CHANGE_APPROVE'),
  rule('GET', '/admin/profile-approvals/{id}', 'EMPLOYEE_PROFILE_CHANGE_APPROVE'),
  rule('PUT', '/admin/profile-approvals/{id}', 'EMPLOYEE_PROFILE_CHANGE_APPROVE'),
  // Dealers
  rule('GET', '/v1/admin/dealers', 'DEALER_VIEW'),
  rule('GET', '/v1/admin/dealers/categories', 'DEALER_VIEW'),
  rule('GET', '/v1/admin/dealers/cities', 'DEALER_VIEW'),
  rule('GET', '/v1/admin/dealers/{id}', 'DEALER_VIEW'),
  rule('POST', '/v1/admin/dealers', 'DEALER_CREATE'),
  rule('PUT', '/v1/admin/dealers/{id}', 'DEALER_UPDATE'),
  rule('PATCH', '/v1/admin/dealers/{id}/toggle-status', 'DEALER_TOGGLE_STATUS'),
  rule('POST', '/v1/admin/dealers/{id}/categories', 'DEALER_CATEGORY_MANAGE'),
  rule('PUT', '/v1/admin/dealers/{id}/categories', 'DEALER_CATEGORY_MANAGE'),
  rule('DELETE', '/v1/admin/dealers/{id}/categories/{categoryId}', 'DEALER_CATEGORY_MANAGE'),
  rule('DELETE', '/v1/admin/dealers/{id}', 'DEALER_DELETE'),
  // Dealer logins
  rule('GET', '/v1/admin/dealers/{id}/login', 'DEALER_VIEW'),
  rule('POST', '/v1/admin/dealers/{id}/login', 'DEALER_LOGIN_MANAGE'),
  rule('PATCH', '/v1/admin/dealers/{id}/login/approval', 'DEALER_LOGIN_APPROVE'),
  rule('PATCH', '/v1/admin/dealers/{id}/login/status', 'DEALER_LOGIN_MANAGE'),
  rule('POST', '/v1/admin/dealers/{id}/login/reset-password', 'DEALER_LOGIN_MANAGE'),
  rule('GET', '/v1/admin/dealer-logins', 'DEALER_LOGIN_APPROVE'),
  // Procurement orders
  rule('GET', '/v1/orders', 'PROCUREMENT_ORDER_VIEW'),
  rule('GET', '/v1/orders/{id}', 'PROCUREMENT_ORDER_VIEW'),
  rule('GET', '/v1/orders/dealer/{dealerId}', 'PROCUREMENT_ORDER_VIEW'),
  rule('GET', '/v1/orders/status/{status}', 'PROCUREMENT_ORDER_VIEW'),
  rule('POST', '/v1/orders', 'PROCUREMENT_ORDER_CREATE'),
  rule('PUT', '/v1/orders/{id}', 'PROCUREMENT_ORDER_UPDATE'),
  rule('PATCH', '/v1/orders/{id}/status', 'PROCUREMENT_ORDER_UPDATE_STATUS'),
  rule('PATCH', '/v1/orders/{id}/approval', 'PROCUREMENT_ORDER_APPROVE'),
  // The dealer's invoice, checked against the quotation before delivery (OrderInvoiceController)
  rule('GET', '/v1/orders/{id}/invoice', 'PROCUREMENT_ORDER_VIEW'),
  rule('GET', '/v1/orders/{id}/invoice/file', 'PROCUREMENT_ORDER_VIEW'),
  rule('POST', '/v1/orders/{id}/invoice', 'PROCUREMENT_ORDER_UPDATE_STATUS'),
  // Dealers' quotation changes
  rule('GET', '/v1/orders/change-requests', 'DEALER_QUOTATION_CHANGE_APPROVE'),
  rule('GET', '/v1/orders/{id}/change-requests', 'PROCUREMENT_ORDER_VIEW'),
  rule('PATCH', '/v1/orders/change-requests/{id}/decision', 'DEALER_QUOTATION_CHANGE_APPROVE'),
  // Dealer portal (dealer logins only)
  rule('GET', '/v1/dealer-portal/me', 'DEALER_PORTAL_VIEW'),
  rule('GET', '/v1/dealer-portal/items', 'DEALER_QUOTATION_SUBMIT'),
  rule('GET', '/v1/dealer-portal/orders', 'DEALER_PORTAL_VIEW'),
  rule('GET', '/v1/dealer-portal/orders/{id}', 'DEALER_PORTAL_VIEW'),
  rule('POST', '/v1/dealer-portal/orders/{id}/response', 'DEALER_ORDER_RESPOND'),
  rule('POST', '/v1/dealer-portal/orders/{id}/ship', 'DEALER_ORDER_SHIP'),
  rule('POST', '/v1/dealer-portal/quotations', 'DEALER_QUOTATION_SUBMIT'),
  rule('POST', '/v1/dealer-portal/quotations/{id}/change-requests', 'DEALER_QUOTATION_CHANGE_REQUEST'),
  // Customer care asking a Super Admin to correct a storefront customer's details (a notification, nothing stored)
  rule('POST', '/v1/admin/customer-change-requests', 'CUSTOMER_CHANGE_REQUEST'),
  rule('PATCH', '/v1/dealer-portal/change-requests/{id}/withdraw', 'DEALER_QUOTATION_CHANGE_REQUEST'),
  // Items
  rule('GET', '/v1/admin/items', 'ITEM_VIEW'),
  rule('GET', '/v1/admin/items/categories', 'ITEM_VIEW'),
  rule('GET', '/v1/admin/items/{id}', 'ITEM_VIEW'),
  rule('GET', '/v1/admin/items/{id}/warranties', 'ITEM_VIEW'),
  rule('POST', '/v1/admin/items', 'ITEM_CREATE'),
  rule('POST', '/v1/admin/items/categories', 'ITEM_CATEGORY_MANAGE'),
  rule('PUT', '/v1/admin/items/{id}', 'ITEM_UPDATE'),
  rule('DELETE', '/v1/admin/items/{id}', 'ITEM_DELETE'),
  // Procurement products and product approvals
  rule('GET', '/v1/admin/products', 'PRODUCT_VIEW'),
  rule('GET', '/v1/admin/products/{id}', 'PRODUCT_VIEW'),
  rule('GET', '/v1/admin/products/product-id/{productId}', 'PRODUCT_VIEW'),
  rule('GET', '/v1/admin/products/item/{itemId}', 'PRODUCT_VIEW'),
  rule('POST', '/v1/admin/products', 'PRODUCT_CREATE'),
  rule('PUT', '/v1/admin/products/{id}', 'PRODUCT_UPDATE'),
  rule('DELETE', '/v1/admin/products/{id}', 'PRODUCT_DELETE'),
  rule('GET', '/v1/product-approvals', 'PRODUCT_APPROVAL_DECIDE'),
  rule('GET', '/v1/product-approvals/latest', 'PRODUCT_VIEW'),
  rule('GET', '/v1/product-approvals/product/{id}', 'PRODUCT_VIEW'),
  rule('POST', '/v1/product-approvals', 'PRODUCT_APPROVAL_SUBMIT'),
  rule('PATCH', '/v1/product-approvals/{id}/decision', 'PRODUCT_APPROVAL_DECIDE'),
  rule('PATCH', '/v1/product-approvals/{id}/applied', 'PRODUCT_PUBLISH'),
  // Stock
  rule('GET', '/v1/stocks', 'STOCK_VIEW'),
  rule('GET', '/v1/stocks/{id}', 'STOCK_VIEW'),
  rule('GET', '/v1/stocks/items/availability', 'STOCK_VIEW'),
  rule('GET', '/v1/stocks/items/{itemId}/availability', 'STOCK_VIEW'),
  rule('GET', '/v1/stocks/items/{itemId}/cost', 'PRODUCT_COST_VIEW'),
  rule('POST', '/v1/stocks', 'STOCK_CREATE'),
  // Delivered purchase orders not yet received into stock (warehouse staff hold no PROCUREMENT_ORDER_VIEW)
  rule('GET', '/v1/stocks/receivable-orders', 'STOCK_CREATE'),
  rule('POST', '/v1/stocks/{id}/add-quantity', 'STOCK_ADJUST'),
  rule('POST', '/v1/stocks/{id}/reduce-quantity', 'STOCK_ADJUST'),
  rule('POST', '/v1/stocks/{id}/approval', 'STOCK_APPROVE'),
  rule('PUT', '/v1/stocks/{id}', 'STOCK_UPDATE'),
  // Salaries (PayrollController): recorded by PAYMENT_RECORD, confirmed by PAYMENT_APPROVE; own payslips for everyone
  rule('GET', '/v1/admin/payroll/years/{year}', 'PAYMENT_VIEW'),
  rule('GET', '/v1/admin/payroll/years/{year}/months/{month}', 'PAYMENT_VIEW'),
  rule('POST', '/v1/admin/payroll/years/{year}/months/{month}/payments', 'PAYMENT_RECORD'),
  rule('POST', '/v1/admin/payroll/payments/decision', 'PAYMENT_APPROVE'),
  rule('POST', '/v1/admin/payroll/payments/{id}/withdraw', 'PAYMENT_RECORD'),
  rule('POST', '/v1/admin/payroll/payments/{id}/payslip/resend', 'PAYMENT_RECORD'),
  rule('GET', '/v1/admin/payroll/payments/{id}/payslip', 'PAYMENT_VIEW'),
  rule('GET', '/v1/payroll/my-payslips', 'PAYSLIP_VIEW_OWN'),
  rule('GET', '/v1/payroll/my-payslips/{id}/pdf', 'PAYSLIP_VIEW_OWN'),
  // Documents: listing everyone's needs DOCUMENT_VIEW; your own documents (by id or user) follow an owner rule
  rule('GET', '/v1/documents', 'DOCUMENT_VIEW'),
  rule('PATCH', '/v1/documents/{id}/approval', 'DOCUMENT_APPROVE'),
];

export const ECOMMERCE_ENDPOINTS: readonly EndpointRule[] = [
  // Storefront products (GET /products/{id} and /products/active are public)
  rule('GET', '/products', 'PRODUCT_VIEW'),
  rule('POST', '/products', 'PRODUCT_CREATE'),
  rule('PUT', '/products/{id}', 'PRODUCT_UPDATE'),
  rule('PATCH', '/products/{id}/status', 'PRODUCT_PUBLISH'),
  rule('PUT', '/products/display-order', 'PRODUCT_PUBLISH'),
  rule('PATCH', '/products/{id}/stock', 'STOREFRONT_STOCK_UPDATE'),
  // Product categories (new ones are created with POST/PUT /products via categoryName)
  rule('GET', '/admin/product-categories', 'PRODUCT_VIEW'),
  // Product costing: cost sheets, product / order profit (costs themselves are sent with POST/PUT /products)
  rule('GET', '/admin/costing/settings', 'PRODUCT_COST_VIEW'),
  rule('GET', '/admin/costing/products', 'PRODUCT_COST_VIEW'),
  rule('GET', '/admin/costing/products/{id}', 'PRODUCT_COST_VIEW'),
  rule('GET', '/admin/costing/orders/{orderNumber}', 'PRODUCT_COST_VIEW'),
  // Customer orders and delivery
  rule('GET', '/admin/orders', 'CUSTOMER_ORDER_VIEW'),
  rule('GET', '/admin/orders/tracking-statuses', 'CUSTOMER_ORDER_VIEW'),
  rule('GET', '/admin/orders/{orderNumber}', 'CUSTOMER_ORDER_VIEW'),
  rule('GET', '/admin/orders/{orderNumber}/tracking', 'CUSTOMER_ORDER_VIEW'),
  rule('PATCH', '/admin/orders/{orderNumber}/pre-order/approve', 'CUSTOMER_ORDER_PRE_ORDER_APPROVE'),
  // Store sales (the seller is always the signed-in agent, taken from the token)
  rule('GET', '/admin/store-sales/customers', 'STORE_ORDER_CREATE'),
  rule('POST', '/admin/store-sales/customers', 'STORE_CUSTOMER_REGISTER'),
  rule('POST', '/admin/store-sales/customers/email-verification', 'STORE_CUSTOMER_REGISTER'),
  rule('POST', '/admin/store-sales/customers/email-verification/confirm', 'STORE_CUSTOMER_REGISTER'),
  rule('POST', '/admin/store-sales/customers/{id}/addresses', 'STORE_CUSTOMER_REGISTER'),
  rule('GET', '/admin/store-sales/products', 'STORE_ORDER_CREATE'),
  rule('POST', '/admin/store-sales/quote', 'STORE_ORDER_CREATE'),
  rule('POST', '/admin/store-sales/orders', 'STORE_ORDER_CREATE'),
  rule('GET', '/admin/store-sales/orders/mine', 'STORE_ORDER_VIEW'),
  rule('GET', '/admin/store-sales/orders', 'STORE_SALES_VIEW_ALL'),
  // Email delivery settings (mail server and sender of customer emails)
  rule('GET', '/admin/settings/email', 'SYSTEM_SETTINGS_MANAGE'),
  rule('PUT', '/admin/settings/email', 'SYSTEM_SETTINGS_MANAGE'),
  rule('POST', '/admin/settings/email/test', 'SYSTEM_SETTINGS_MANAGE'),
  rule('PATCH', '/orders/{orderNumber}/status', 'CUSTOMER_ORDER_UPDATE_STATUS'),
  rule('PATCH', '/orders/{orderNumber}/tracking', 'CUSTOMER_ORDER_TRACKING_UPDATE'),
  rule('PATCH', '/orders/{orderNumber}/delivery-status', 'DELIVERY_STATUS_UPDATE'),
  // Refunds
  rule('GET', '/admin/orders/{orderNumber}/refunds', 'REFUND_VIEW'),
  rule('POST', '/admin/orders/{orderNumber}/refunds', 'REFUND_REQUEST'),
  rule('GET', '/admin/refunds', 'REFUND_VIEW'),
  rule('GET', '/admin/refunds/{id}', 'REFUND_VIEW'),
  rule('POST', '/admin/refunds/{id}/approve', 'REFUND_APPROVE'),
  rule('POST', '/admin/refunds/{id}/reject', 'REFUND_APPROVE'),
  rule('POST', '/admin/refunds/{id}/sync', 'REFUND_SYNC'),
  // Customer care
  rule('GET', '/admin/support/queries', 'SUPPORT_TICKET_VIEW'),
  rule('GET', '/admin/support/queries/{referenceNumber}', 'SUPPORT_TICKET_VIEW'),
  rule('POST', '/admin/support/queries/{referenceNumber}/messages', 'SUPPORT_TICKET_REPLY'),
  rule('PATCH', '/admin/support/queries/{referenceNumber}/status', 'SUPPORT_TICKET_UPDATE_STATUS'),
  rule('GET', '/admin/reviews', 'REVIEW_VIEW'),
  rule('GET', '/admin/reviews/{id}', 'REVIEW_VIEW'),
  rule('PATCH', '/admin/reviews/{id}/status', 'REVIEW_MODERATE'),
  // Customers (AdminCustomerController)
  rule('GET', '/admin/customers', 'CUSTOMER_VIEW'),
  rule('GET', '/admin/customers/{id}', 'CUSTOMER_VIEW'),
  rule('GET', '/admin/customers/{id}/orders', 'CUSTOMER_VIEW'),
  rule('GET', '/admin/customers/{id}/cart', 'CUSTOMER_VIEW'),
  rule('GET', '/admin/customers/{id}/tickets', 'CUSTOMER_VIEW'),
  rule('PATCH', '/admin/customers/{id}', 'CUSTOMER_UPDATE'),
  // Company profile
  rule('GET', '/admin/company/profile', 'COMPANY_PROFILE_VIEW'),
  rule('GET', '/admin/company/profile/versions', 'COMPANY_PROFILE_VIEW'),
  rule('GET', '/admin/company/profile/versions/{id}', 'COMPANY_PROFILE_VIEW'),
  rule('POST', '/admin/company/profile/drafts', 'COMPANY_PROFILE_EDIT'),
  rule('PUT', '/admin/company/profile/drafts/{id}', 'COMPANY_PROFILE_EDIT'),
  rule('DELETE', '/admin/company/profile/drafts/{id}', 'COMPANY_PROFILE_EDIT'),
  rule('POST', '/admin/company/profile/drafts/{id}/submit', 'COMPANY_PROFILE_EDIT'),
  rule('POST', '/admin/company/profile/versions/{id}/withdraw', 'COMPANY_PROFILE_EDIT'),
  rule('POST', '/admin/company/profile/versions/{id}/approve', 'COMPANY_PROFILE_APPROVE'),
  rule('POST', '/admin/company/profile/versions/{id}/reject', 'COMPANY_PROFILE_APPROVE'),
  rule('POST', '/admin/company/assets', 'COMPANY_PROFILE_EDIT'),
  // Company account (GET /admin/finance/categories only needs a signed-in admin)
  rule('GET', '/admin/finance/overview', 'FINANCE_REPORT_VIEW'),
  rule('GET', '/admin/finance/ledger', 'FINANCE_REPORT_VIEW'),
  rule('GET', '/admin/finance/ledger/export', 'FINANCE_REPORT_EXPORT'),
  rule('GET', '/admin/finance/integrity', 'FINANCE_REPORT_VIEW'),
  rule('POST', '/admin/finance/sync/procurement', 'FINANCE_REPORT_VIEW'),
  rule('GET', '/admin/finance/gst/summary', 'FINANCE_REPORT_VIEW'),
  rule('GET', '/admin/finance/gst/register', 'FINANCE_REPORT_VIEW'),
  rule('GET', '/admin/finance/gst/register/export', 'FINANCE_REPORT_EXPORT'),
  rule('GET', '/admin/finance/vouchers', 'EXPENSE_VIEW'),
  rule('GET', '/admin/finance/vouchers/{id}', 'EXPENSE_VIEW'),
  rule('POST', '/admin/finance/vouchers', 'EXPENSE_SUBMIT'),
  rule('PUT', '/admin/finance/vouchers/{id}', 'EXPENSE_SUBMIT'),
  rule('POST', '/admin/finance/vouchers/{id}/cancel', 'EXPENSE_SUBMIT'),
  rule('POST', '/admin/finance/vouchers/{id}/documents', 'EXPENSE_SUBMIT'),
  rule('POST', '/admin/finance/invoices/analyze', 'EXPENSE_SUBMIT'),
  rule('DELETE', '/admin/finance/vouchers/{id}/documents/{documentId}', 'EXPENSE_SUBMIT'),
  rule('GET', '/admin/finance/vouchers/{id}/documents/{documentId}', 'EXPENSE_VIEW'),
  rule('POST', '/admin/finance/vouchers/{id}/approve', 'EXPENSE_APPROVE'),
  rule('POST', '/admin/finance/vouchers/{id}/reject', 'EXPENSE_APPROVE'),
  rule('POST', '/admin/finance/vouchers/{id}/reverse', 'EXPENSE_APPROVE'),
];

const toPattern = (path: string) => new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}/?$`);

/** Looks up a request (method + URL relative to the client's base URL) in a rule table. */
export const createEndpointMatcher = (rules: readonly EndpointRule[]) => {
  // Literal segments win over placeholders: /admin/orders/tracking-statuses before /admin/orders/{orderNumber}
  const compiled = [...rules]
    .sort((a, b) => (a.path.match(/\{/g)?.length ?? 0) - (b.path.match(/\{/g)?.length ?? 0))
    .map((entry) => ({ ...entry, pattern: toPattern(entry.path) }));

  return (method: string | undefined, url: string | undefined): Permission | null => {
    if (!url) return null;
    const path = url.split(/[?#]/)[0];
    const verb = (method ?? 'get').toUpperCase();
    return compiled.find((entry) => entry.method === verb && entry.pattern.test(path))?.requires ?? null;
  };
};
