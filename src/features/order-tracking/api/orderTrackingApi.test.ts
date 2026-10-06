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

  it('Option B sends status and notes as encoded query params with no body to PATCH /orders/{n}/status', async () => {
    await orderTrackingApi.setOrderStatus('ORD-1', 'PACKED', 'Manual status change & fix');
    expect(client.patch).toHaveBeenCalledTimes(1);
    const [url, body, config] = client.patch.mock.calls[0];
    expect(url).toBe('/orders/ORD-1/status');
    expect(body).toBeUndefined();
    const params = (config as { params: URLSearchParams }).params;
    expect(params).toBeInstanceOf(URLSearchParams);
    expect(params.toString()).toBe('status=PACKED&notes=Manual+status+change+%26+fix');
  });

  it('Option B omits notes when there are none', async () => {
    await orderTrackingApi.setOrderStatus('ORD-1', 'DELIVERED', null);
    const params = (client.patch.mock.calls[0][2] as { params: URLSearchParams }).params;
    expect(params.toString()).toBe('status=DELIVERED');
  });

  it('never sends client-side audit fields', async () => {
    await orderTrackingApi.updateTracking('ORD-1', { status: 'PACKED', notes: null });
    await orderTrackingApi.setOrderStatus('ORD-1', 'PACKED', null);
    const serialized = JSON.stringify(client.patch.mock.calls.map(([, body, cfg]) => [body, String((cfg as { params?: URLSearchParams } | undefined)?.params ?? '')]));
    for (const field of ['updatedBy', 'updatedAt', 'createdAt', 'current', 'stage']) {
      expect(serialized).not.toContain(field);
    }
  });
});
