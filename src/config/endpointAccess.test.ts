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
    expect(procurement('get', '/v1/admin/dealers?page=0&size=1000')).toBe('DEALER_VIEW');
    expect(procurement('post', '/v1/admin/dealers')).toBe('DEALER_CREATE');
    expect(procurement('get', '/v1/admin/items?page=0')).toBe('ITEM_VIEW');
    expect(procurement('get', '/v1/stocks/items/12/availability')).toBe('STOCK_VIEW');
    expect(procurement('get', '/v1/documents?status=WAITING_FOR_APPROVAL')).toBe('DOCUMENT_VIEW');
    expect(ecommerce('get', '/admin/orders/ORD-1/refunds')).toBe('REFUND_VIEW');
    expect(ecommerce('post', '/admin/orders/ORD-1/refunds')).toBe('REFUND_REQUEST');
    expect(ecommerce('patch', '/orders/ORD-1/delivery-status')).toBe('DELIVERY_STATUS_UPDATE');
  });

  it('prefers literal segments over placeholders', () => {
    expect(procurement('get', '/v1/orders/change-requests?status=PENDING')).toBe('DEALER_QUOTATION_CHANGE_APPROVE');
    expect(procurement('get', '/v1/orders/12/change-requests')).toBe('PROCUREMENT_ORDER_VIEW');
    expect(procurement('get', '/v1/orders/12')).toBe('PROCUREMENT_ORDER_VIEW');
    expect(procurement('get', '/v1/admin/employees/pending-approvals')).toBe('EMPLOYEE_APPROVE');
    expect(procurement('get', '/v1/admin/employees/7')).toBe('EMPLOYEE_VIEW');
    expect(ecommerce('get', '/admin/orders/tracking-statuses')).toBe('CUSTOMER_ORDER_VIEW');
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
