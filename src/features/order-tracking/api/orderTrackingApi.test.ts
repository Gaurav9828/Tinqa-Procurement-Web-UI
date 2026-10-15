import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import { orderTrackingApi } from './orderTrackingApi';

// Mock only the HTTP client so the exact request shapes are asserted.
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() },
}));

const client = vi.mocked(ecommerceAxiosClient);
const ok = { data: { success: true, message: 'ok', data: null } };

beforeEach(() => {
  client.get.mockResolvedValue(ok);
  client.patch.mockResolvedValue(ok);
});

describe('orderTrackingApi request shapes', () => {
  it('lists admin orders with only the filters that are set', async () => {
    await orderTrackingApi.listOrders({
      page: 2,
      size: 20,
      sort: 'totalAmount,asc',
      search: '  asha ',
      status: '',
      fromDate: '2026-10-01',
      toDate: '',
    });
    expect(client.get).toHaveBeenCalledWith('/admin/orders', {
      params: { page: 2, size: 20, sort: 'totalAmount,asc', search: 'asha', fromDate: '2026-10-01' },
    });
  });

  it('sends the payment status filter when it is set', async () => {
    await orderTrackingApi.listOrders({ page: 0, size: 20, sort: 'createdAt,desc', status: 'CANCELLED', paymentStatus: 'REFUND_REQUESTED' });
    expect(client.get).toHaveBeenCalledWith('/admin/orders', {
      params: { page: 0, size: 20, sort: 'createdAt,desc', status: 'CANCELLED', paymentStatus: 'REFUND_REQUESTED' },
    });
  });

  it('URL-encodes the order number in admin read paths', async () => {
    await orderTrackingApi.getOrder('ORD/1 #2');
    expect(client.get).toHaveBeenCalledWith('/admin/orders/ORD%2F1%20%232');
    await orderTrackingApi.getTrackingStatuses();
    expect(client.get).toHaveBeenCalledWith('/admin/orders/tracking-statuses');
  });

  it('Option A sends a JSON body { status, notes } to PATCH /orders/{n}/tracking', async () => {
    await orderTrackingApi.updateTracking('ORD-1', { status: 'PACKED', notes: 'Packed at warehouse' });
    expect(client.patch).toHaveBeenCalledTimes(1);
    expect(client.patch).toHaveBeenCalledWith('/orders/ORD-1/tracking', { status: 'PACKED', notes: 'Packed at warehouse' });
  });

  it('never sends client-side audit fields', async () => {
    await orderTrackingApi.updateTracking('ORD-1', { status: 'PACKED', notes: null });
    const serialized = JSON.stringify(client.patch.mock.calls.map(([, body, cfg]) => [body, String((cfg as { params?: URLSearchParams } | undefined)?.params ?? '')]));
    for (const field of ['updatedBy', 'updatedAt', 'createdAt', 'current', 'stage']) {
      expect(serialized).not.toContain(field);
    }
  });

  it('approves a pre-order with PATCH /admin/orders/{n}/pre-order/approve and no body', async () => {
    await orderTrackingApi.approvePreOrder('ORD/1');
    expect(client.patch).toHaveBeenCalledTimes(1);
    expect(client.patch.mock.calls[0]).toEqual(['/admin/orders/ORD%2F1/pre-order/approve']);
  });
});
