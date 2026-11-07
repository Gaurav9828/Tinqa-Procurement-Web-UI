import { describe, it, expect } from 'vitest';
import { ORDER_STATUS, type OrderStatus } from '../../../types/common.types';
import {
  FINAL_ORDER_STATUSES,
  MAIN_ORDER_TRACK,
  ORDER_NEXT_STATUSES,
  ORDER_STATUS_INFO,
  canEditOrder,
  getNextOrderStatuses,
  getOrderBlockReason,
  validateMove,
  NO_ORDER_ACCESS,
  type OrderAccess, isFrozenBySupplierChange } from './orderWorkflow';

// A Level 1 maker and a Level 2 approver, as the permissions they hold
const L1: OrderAccess = { canEdit: true, canProgress: true, canApprove: false };
const L2: OrderAccess = { canEdit: true, canProgress: true, canApprove: true };

/** Position of a status on the main or return path, to prove moves only go forward. */
const ORDER = [...MAIN_ORDER_TRACK.map((s) => s.status), 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_PICKED_UP', 'RETURN_RECEIVED', 'REFUND_INITIATED'];

describe('procurement order workflow', () => {
  it('describes every status and lists a transition entry for each', () => {
    expect(Object.keys(ORDER_NEXT_STATUSES).sort()).toEqual([...ORDER_STATUS].sort());
    expect(Object.keys(ORDER_STATUS_INFO).sort()).toEqual([...ORDER_STATUS].sort());
    for (const targets of Object.values(ORDER_NEXT_STATUSES)) for (const t of targets) expect(ORDER_STATUS).toContain(t);
  });

  it('never moves backwards along the main or return path (only a failed refund is retried)', () => {
    for (const [from, targets] of Object.entries(ORDER_NEXT_STATUSES) as [OrderStatus, readonly OrderStatus[]][]) {
      for (const to of targets) {
        if (from === 'REFUND_FAILED' && to === 'REFUND_INITIATED') continue;
        const a = ORDER.indexOf(from);
        const b = ORDER.indexOf(to);
        if (a >= 0 && b >= 0) expect(b, `${from} → ${to}`).toBeGreaterThan(a);
      }
    }
  });

  it('follows quotation → approval → supplier → confirmed → shipped → delivered', () => {
    expect(getNextOrderStatuses('QUOTATION', L1)).toEqual(['PENDING', 'CANCELLED']);
    expect(getNextOrderStatuses('PENDING', L2)).toEqual([]); // decided in the Approvals Hub only
    expect(getNextOrderStatuses('SUPPLIER_LEVEL_PENDING', L2)).toEqual(['CONFIRMED', 'CANCELLED']);
    expect(getNextOrderStatuses('CONFIRMED', L1)).toEqual(['SHIPPED', 'CANCELLED']);
    expect(getNextOrderStatuses('SHIPPED', L1)).toEqual(['DELIVERED']);
    expect(getNextOrderStatuses('DELIVERED', L1)).toEqual(['RETURN_REQUESTED']);
  });

  it('cannot cancel once shipped', () => {
    for (const status of ['SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'REFUND_INITIATED'] as const) {
      expect(getNextOrderStatuses(status, L2)).not.toContain('CANCELLED');
    }
  });

  it('runs the return through pickup, supplier receipt and refund, with retries only after a failed refund', () => {
    expect(getNextOrderStatuses('RETURN_REQUESTED', L2)).toEqual(['RETURN_APPROVED', 'RETURN_REJECTED']);
    expect(getNextOrderStatuses('RETURN_APPROVED', L1)).toEqual(['RETURN_PICKED_UP']);
    expect(getNextOrderStatuses('RETURN_PICKED_UP', L1)).toEqual(['RETURN_RECEIVED']);
    expect(getNextOrderStatuses('RETURN_RECEIVED', L1)).toEqual(['REFUND_INITIATED']);
    expect(getNextOrderStatuses('REFUND_INITIATED', L1)).toEqual(['REFUND_COMPLETED', 'REFUND_FAILED']);
    expect(getNextOrderStatuses('REFUND_FAILED', L1)).toEqual(['REFUND_INITIATED']);
  });

  it('closes cancelled, rejected-return and refunded orders for good', () => {
    for (const status of FINAL_ORDER_STATUSES) {
      expect(getNextOrderStatuses(status, L2)).toEqual([]);
      expect(getOrderBlockReason(status, L2)).toMatch(/final/);
    }
  });

  it('leaves approval decisions to Level 2', () => {
    expect(getNextOrderStatuses('SUPPLIER_LEVEL_PENDING', L1)).toEqual([]);
    expect(getNextOrderStatuses('RETURN_REQUESTED', L1)).toEqual([]);
    expect(getOrderBlockReason('PENDING', L1)).toMatch(/Approvals Hub/);
    expect(getOrderBlockReason('SUPPLIER_LEVEL_PENDING', L1)).toMatch(/order approver/);
  });

  it('offers nothing for an unrecognised status', () => {
    expect(getNextOrderStatuses('SOMETHING_ELSE', L2)).toEqual([]);
    expect(getOrderBlockReason('SOMETHING_ELSE', L2)).toMatch(/unrecognised/);
  });

  it('only lets quotations (and, for Level 2, pending orders) be edited', () => {
    expect(canEditOrder('QUOTATION', L1)).toBe(true);
    expect(canEditOrder('PENDING', L1)).toBe(false);
    expect(canEditOrder('PENDING', L2)).toBe(true);
    for (const status of ['SUPPLIER_LEVEL_PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const) {
      expect(canEditOrder(status, L2)).toBe(false);
    }
  });
});

describe('validateMove', () => {
  const ctx = { orderDate: '2026-10-01', today: '2026-10-10' };
  const input = (patch: Partial<{ reason: string; actualDelivery: string }> = {}) => ({ reason: '', actualDelivery: '', ...patch });

  it('requires a reason to cancel, request or reject a return, or report a failed refund', () => {
    for (const status of ['CANCELLED', 'RETURN_REQUESTED', 'RETURN_REJECTED', 'REFUND_FAILED'] as const) {
      expect(validateMove(status, input(), ctx).reason).toMatch(/required/);
      expect(validateMove(status, input({ reason: 'Damaged in transit' }), ctx)).toEqual({});
    }
    expect(validateMove('SHIPPED', input(), ctx)).toEqual({});
  });

  it('requires a delivery date between the order date and today', () => {
    expect(validateMove('DELIVERED', input(), ctx).actualDelivery).toMatch(/required/);
    expect(validateMove('DELIVERED', input({ actualDelivery: '2026-10-11' }), ctx).actualDelivery).toMatch(/future/);
    expect(validateMove('DELIVERED', input({ actualDelivery: '2026-09-30' }), ctx).actualDelivery).toMatch(/before the order date \(2026-10-01\)/);
    expect(validateMove('DELIVERED', input({ actualDelivery: '2026-10-10' }), ctx)).toEqual({});
  });
});

describe('orders without the progress permission', () => {
  it('offers no moves and says why', () => {
    const viewer = { ...NO_ORDER_ACCESS };
    expect(getNextOrderStatuses('CONFIRMED', viewer)).toEqual([]);
    expect(getOrderBlockReason('CONFIRMED', viewer)).toMatch(/designation/);
    expect(canEditOrder('QUOTATION', viewer)).toBe(false);
  });
});

describe('supplier changes', () => {
  it('freezes a quotation only while a supplier change waits for approval', () => {
    expect(isFrozenBySupplierChange({ orderStatus: 'QUOTATION', supplierChangePending: true })).toBe(true);
    expect(isFrozenBySupplierChange({ orderStatus: 'QUOTATION', supplierChangePending: false })).toBe(false);
    expect(isFrozenBySupplierChange({ orderStatus: 'QUOTATION' })).toBe(false);
    expect(isFrozenBySupplierChange({ orderStatus: 'PENDING', supplierChangePending: true })).toBe(false);
  });
});
