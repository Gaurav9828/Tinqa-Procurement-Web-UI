import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import { orderTrackingApi } from './orderTrackingApi';

// Mock only the HTTP client so the exact request shapes are asserted.
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const client = vi.mocked(ecommerceAxiosClient);
const ok = { data: { success: true, message: 'ok', data: null } };

beforeEach(() => {
  client.get.mockResolvedValue(ok);
  client.patch.mockResolvedValue(ok);
  client.post.mockResolvedValue(ok);
  client.put.mockResolvedValue(ok);
  client.delete.mockResolvedValue(ok);
});

describe('orderTrackingApi request shapes', () => {
  it('emails a new delivery code through the staff or the rider route', async () => {
    await orderTrackingApi.resendDeliveryCode('ORD-1', false);
    expect(client.post).toHaveBeenLastCalledWith('/orders/ORD-1/tracking/delivery-code');
    await orderTrackingApi.resendDeliveryCode('ORD-1', true);
    expect(client.post).toHaveBeenLastCalledWith('/orders/ORD-1/delivery-status/delivery-code');
  });

  it('sends the delivery code with a delivered update', async () => {
    await orderTrackingApi.updateDeliveryStatus('ORD-1', { status: 'DELIVERED', notes: null, deliveryCode: 'aB3kP9x' });
    expect(client.patch).toHaveBeenCalledWith('/orders/ORD-1/delivery-status', { status: 'DELIVERED', notes: null, deliveryCode: 'aB3kP9x' });
  });

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

  it('sends return and checkpoint calls to the admin order routes', async () => {
    // A return is requested from the customer's ticket: their message id, never a typed reason
    const request = { ticketReference: 'TQ-Q-000007', customerMessageId: 41, chargeAmount: 100, chargeReason: 'Pickup', staffNote: 'Box intact' };
    await orderTrackingApi.enableReturn('ORD-1', request);
    expect(client.post).toHaveBeenCalledWith('/admin/orders/ORD-1/return/enable', request);
    await orderTrackingApi.withdrawReturn('ORD-1');
    expect(client.post).toHaveBeenCalledWith('/admin/orders/ORD-1/return/withdraw');
    await orderTrackingApi.recordInspection('ORD-1', { outcome: 'FAIL', note: 'Broken seal' });
    expect(client.post).toHaveBeenCalledWith('/admin/orders/ORD-1/return/inspection', { outcome: 'FAIL', note: 'Broken seal' });
    await orderTrackingApi.addCheckpoint('ORD-1', { event: 'ARRIVED', place: 'Lucknow hub' });
    expect(client.post).toHaveBeenCalledWith('/admin/orders/ORD-1/checkpoints', { event: 'ARRIVED', place: 'Lucknow hub' });
    await orderTrackingApi.addRiderCheckpoint('ORD-1', { event: 'DEPARTED', place: 'Lucknow hub' });
    expect(client.post).toHaveBeenCalledWith('/admin/orders/ORD-1/rider-checkpoints', { event: 'DEPARTED', place: 'Lucknow hub' });
    await orderTrackingApi.deleteCheckpoint('ORD-1', 7);
    expect(client.delete).toHaveBeenCalledWith('/admin/orders/ORD-1/checkpoints/7');
  });

  it('sends the Store Manager return decisions and lists the requests page by page', async () => {
    await orderTrackingApi.approveReturn('ORD/1', { chargeAmount: 150, chargeReason: 'Pickup' });
    expect(client.post).toHaveBeenCalledWith('/admin/orders/ORD%2F1/return/approve', { chargeAmount: 150, chargeReason: 'Pickup' });
    await orderTrackingApi.rejectReturn('ORD-1', { reason: 'Used item' });
    expect(client.post).toHaveBeenCalledWith('/admin/orders/ORD-1/return/reject', { reason: 'Used item' });
    await orderTrackingApi.changeReturnCharge('ORD-1', { chargeAmount: 0, chargeReason: null });
    expect(client.put).toHaveBeenCalledWith('/admin/orders/ORD-1/return/charge', { chargeAmount: 0, chargeReason: null });
    await orderTrackingApi.listReturnRequests(1, 20);
    expect(client.get).toHaveBeenCalledWith('/admin/returns/requests', { params: { page: 1, size: 20 } });
  });
});
