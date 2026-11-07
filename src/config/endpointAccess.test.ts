import { describe, expect, it } from 'vitest';
import { ECOMMERCE_ENDPOINTS, PROCUREMENT_ENDPOINTS, createEndpointMatcher } from './endpointAccess';
import { PERMISSIONS } from './access';

const procurement = createEndpointMatcher(PROCUREMENT_ENDPOINTS);
const ecommerce = createEndpointMatcher(ECOMMERCE_ENDPOINTS);

describe('endpoint access table', () => {
  it('names only permissions the UI knows', () => {
    for (const entry of [...PROCUREMENT_ENDPOINTS, ...ECOMMERCE_ENDPOINTS]) expect(PERMISSIONS).toContain(entry.requires);
  });

  it('finds the permission by method and path, ignoring the query string', () => {
    expect(procurement('get', '/v1/admin/suppliers?page=0&size=1000')).toBe('SUPPLIER_VIEW');
    expect(procurement('post', '/v1/admin/suppliers')).toBe('SUPPLIER_CREATE');
    expect(procurement('get', '/v1/admin/items?page=0')).toBe('ITEM_VIEW');
    expect(procurement('get', '/v1/stocks/items/12/availability')).toBe('STOCK_VIEW');
    expect(procurement('get', '/v1/documents?status=WAITING_FOR_APPROVAL')).toBe('DOCUMENT_VIEW');
    expect(ecommerce('get', '/admin/orders/ORD-1/refunds')).toBe('REFUND_VIEW');
    expect(ecommerce('post', '/admin/orders/ORD-1/refunds')).toBe('REFUND_REQUEST');
    expect(ecommerce('patch', '/orders/ORD-1/delivery-status')).toBe('DELIVERY_STATUS_UPDATE');
  });

  it('prefers literal segments over placeholders', () => {
    expect(procurement('get', '/v1/orders/change-requests?status=PENDING')).toBe('SUPPLIER_QUOTATION_CHANGE_APPROVE');
    expect(procurement('get', '/v1/orders/12/change-requests')).toBe('PROCUREMENT_ORDER_VIEW');
    expect(procurement('get', '/v1/orders/12')).toBe('PROCUREMENT_ORDER_VIEW');
    // Returns of failed pieces and repayments (supplier-returns-and-repayments.md)
    expect(procurement('get', '/v1/orders/returns/waiting')).toBe('SUPPLIER_RETURN_APPROVE');
    expect(procurement('get', '/v1/orders/12/returns')).toBe('PROCUREMENT_ORDER_VIEW');
    expect(procurement('post', '/v1/orders/12/returns')).toBe('SUPPLIER_RETURN_REQUEST');
    expect(procurement('patch', '/v1/orders/returns/3/dispatch')).toBe('SUPPLIER_RETURN_REQUEST');
    expect(procurement('get', '/v1/orders/payments/repayments-to-check')).toBe('SUPPLIER_PAYMENT_RECORD');
    expect(procurement('patch', '/v1/orders/payments/7/repayment-check')).toBe('SUPPLIER_PAYMENT_RECORD');
    expect(procurement('post', '/v1/supplier-portal/payments/7/repayment')).toBe('SUPPLIER_REPAYMENT_SUBMIT');
    expect(procurement('post', '/v1/supplier-portal/orders/1/repayments')).toBe('SUPPLIER_REPAYMENT_SUBMIT');
    expect(procurement('get', '/v1/supplier-portal/orders/1/returns')).toBe('SUPPLIER_PORTAL_VIEW');
    expect(procurement('patch', '/v1/supplier-portal/returns/3/received')).toBe('SUPPLIER_RETURN_RESPOND');
    expect(procurement('get', '/v1/admin/employees/pending-approvals')).toBe('EMPLOYEE_APPROVE');
    expect(procurement('get', '/v1/admin/employees/7')).toBe('EMPLOYEE_VIEW');
    expect(ecommerce('get', '/admin/orders/tracking-statuses')).toBe('CUSTOMER_ORDER_VIEW');
    expect(ecommerce('get', '/admin/promo-codes/code-suggestion')).toBe('PROMO_CODE_MANAGE');
    expect(ecommerce('get', '/admin/promo-codes/12')).toBe('PROMO_CODE_VIEW');
    expect(ecommerce('get', '/admin/promo-codes/12/redemptions?page=0')).toBe('PROMO_CODE_VIEW');
    expect(ecommerce('patch', '/admin/promo-codes/12/status')).toBe('PROMO_CODE_MANAGE');
    expect(ecommerce('delete', '/admin/promo-codes/12')).toBe('PROMO_CODE_MANAGE');
    expect(ecommerce('post', '/admin/promo-codes/12/restore')).toBe('PROMO_CODE_MANAGE');
    expect(ecommerce('get', '/product-stock-drafts')).toBe('STOREFRONT_STOCK_UPDATE');
    expect(ecommerce('put', '/product-stock-drafts/7')).toBe('STOREFRONT_STOCK_UPDATE');
    expect(ecommerce('delete', '/product-stock-drafts/7')).toBe('STOREFRONT_STOCK_UPDATE');
    expect(ecommerce('post', '/product-stock-drafts/7/submit')).toBe('STOREFRONT_STOCK_UPDATE');
    expect(ecommerce('post', '/admin/promo-codes/12/share')).toBe('PROMO_CODE_SHARE');
    expect(ecommerce('patch', '/admin/promo-codes/12/storefront')).toBe('PROMO_CODE_SHARE');
  });

  it('leaves endpoints without a fixed permission to the backend', () => {
    // Your own profile, documents and notifications; public storefront reads
    expect(procurement('get', '/v1/admin/profile')).toBeNull();
    expect(procurement('get', '/v1/documents/user/5')).toBeNull();
    expect(procurement('get', '/v1/notifications/unread-count')).toBeNull();
    expect(ecommerce('get', '/products/12')).toBeNull();
    // A placeholder never spans segments
    expect(ecommerce('get', '/admin/orders/ORD-1/refunds/extra')).toBeNull();
  });
});
