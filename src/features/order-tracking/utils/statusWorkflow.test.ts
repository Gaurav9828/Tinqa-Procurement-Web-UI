import { describe, it, expect } from 'vitest';
import {
  NEXT_STATUSES,
  START_STATUSES,
  STATUS_STAGE,
  getAllowedStatuses,
  getLockReason,
  isCorrection,
} from './statusWorkflow';

const ctx = (currentStatus: string | null, previousStatus: string | null = null) => ({ currentStatus, previousStatus });
const both = ['tracking', 'manual'] as const;

describe('status workflow rules', () => {
  it('covers exactly the 14 backend statuses, each mapped to a stage', () => {
    expect(Object.keys(NEXT_STATUSES).sort()).toEqual(Object.keys(STATUS_STAGE).sort());
    expect(Object.keys(NEXT_STATUSES)).toHaveLength(14);
    for (const targets of Object.values(NEXT_STATUSES)) {
      for (const target of targets) expect(NEXT_STATUSES).toHaveProperty(target);
    }
  });

  it('never offers the current status as its own next step', () => {
    for (const [status, targets] of Object.entries(NEXT_STATUSES)) expect(targets).not.toContain(status);
  });

  it.each(both)('locks CANCELLED orders completely (%s)', (mode) => {
    expect(getAllowedStatuses(mode, ctx('CANCELLED', 'CONFIRMED'))).toEqual([]);
    expect(getLockReason('CANCELLED')).toMatch(/cancelled/i);
  });

  it.each(both)('locks RETURN_COMPLETED orders completely (%s)', (mode) => {
    expect(getAllowedStatuses(mode, ctx('RETURN_COMPLETED', 'RETURN_IN_TRANSIT'))).toEqual([]);
  });

  it('allows cancelling before shipment but not after', () => {
    for (const status of ['ORDER_RECEIVED', 'ORDER_PENDING', 'CONFIRMED', 'PRE_ORDER_CONFIRMED', 'PROCESSING', 'PACKED']) {
      expect(getAllowedStatuses('tracking', ctx(status))).toContain('CANCELLED');
    }
    for (const status of ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT']) {
      for (const mode of both) expect(getAllowedStatuses(mode, ctx(status, 'PACKED'))).not.toContain('CANCELLED');
    }
  });

  it('cannot move a shipped order back into an earlier stage, even manually', () => {
    expect(getAllowedStatuses('manual', ctx('OUT_FOR_DELIVERY', 'PACKED'))).toEqual(['DELIVERED', 'RETURN_IN_TRANSIT']);
    expect(getAllowedStatuses('manual', ctx('DELIVERED', 'OUT_FOR_DELIVERY'))).toEqual(['RETURN_REQUESTED']);
  });

  it('follows the delivery and return path forwards only', () => {
    expect(getAllowedStatuses('tracking', ctx('PACKED'))).toEqual(['OUT_FOR_DELIVERY', 'CANCELLED']);
    expect(getAllowedStatuses('tracking', ctx('DELIVERED'))).toEqual(['RETURN_REQUESTED']);
    expect(getAllowedStatuses('tracking', ctx('RETURN_REQUESTED'))).toEqual(['RETURN_IN_TRANSIT', 'DELIVERED']);
    expect(getAllowedStatuses('tracking', ctx('RETURN_IN_TRANSIT'))).toEqual(['RETURN_COMPLETED']);
  });

  it('keeps regular and pre-order flows separate until confirmation', () => {
    expect(getAllowedStatuses('tracking', ctx('ORDER_RECEIVED'))).not.toContain('PRE_ORDER_CONFIRMED');
    expect(getAllowedStatuses('tracking', ctx('PRE_ORDER_RECEIVED'))).not.toContain('CONFIRMED');
  });

  it('only lets an order with no or a legacy status be started, not shipped or returned', () => {
    for (const current of [null, 'PENDING', 'SHIPPED']) {
      const allowed = getAllowedStatuses('tracking', ctx(current));
      expect(allowed).toEqual([...START_STATUSES]);
      expect(allowed).not.toContain('OUT_FOR_DELIVERY');
      expect(allowed).not.toContain('DELIVERED');
    }
  });

  it('manual mode may undo the last step before shipment; tracking mode may not', () => {
    expect(getAllowedStatuses('manual', ctx('PACKED', 'PROCESSING'))).toContain('PROCESSING');
    expect(getAllowedStatuses('tracking', ctx('PACKED', 'PROCESSING'))).not.toContain('PROCESSING');
    expect(isCorrection('PROCESSING', ctx('PACKED', 'PROCESSING'))).toBe(true);
    expect(isCorrection('OUT_FOR_DELIVERY', ctx('PACKED', 'PROCESSING'))).toBe(false);
  });

  it('never offers a locked status as an "undo" target', () => {
    // Inconsistent legacy history must never let "undo" reopen a closed state.
    expect(getAllowedStatuses('manual', ctx('CONFIRMED', 'RETURN_COMPLETED'))).not.toContain('RETURN_COMPLETED');
  });
});
