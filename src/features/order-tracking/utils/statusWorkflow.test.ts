import { describe, it, expect } from 'vitest';
import {
  FINAL_STATUSES,
  MAIN_STAGES,
  NEXT_STATUSES,
  RETURN_TRACK,
  START_STATUSES,
  STATUS_INFO,
  getAllowedStatuses,
  getDeliveryOutcomes,
  getLockReason,
  getPaymentBlockReason,
  getRefundHint,
  getStage,
  isConfirmBlockedByPayment,
  isFullyPaid,
  needsConfirmation,
  SYSTEM_ONLY_STATUSES,
  DELIVERY_OUTCOMES,
  CUSTOMER_ONLY_STATUSES,
  getCheckpointLeg,
} from './statusWorkflow';

/** Paid by default: most tests are about the status table; payment rules have their own block. */
const ctx = (currentStatus: string | null, paymentStatus: string | null = 'PAID') => ({ currentStatus, paymentStatus });

/** Position along the journey, to prove every move goes forward. Re-attempts are the only loops. */
const JOURNEY = [
  'ORDER_RECEIVED', 'ORDER_PENDING', 'PRE_ORDER_RECEIVED', 'PRE_ORDER_PENDING', 'CONFIRMED', 'PRE_ORDER_CONFIRMED',
  'PROCESSING', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'CUSTOMER_UNAVAILABLE',
  'INVALID_ADDRESS', 'CUSTOMER_CANCELLED_DELIVERY', 'DELIVERY_REATTEMPT', 'DELIVERED',
  'RETURN_REQUESTED', 'RETURN_APPROVED', 'OUT_FOR_PICKUP', 'RETURN_PICKED_UP', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED',
  'RETURN_INSPECTION', 'RETURN_INSPECTION_FAILED', 'RETURN_BACK_IN_TRANSIT', 'RETURN_BACK_DELIVERED', 'REFUND_REQUESTED', 'REFUND_INITIATED', 'REFUND_FAILED',
];
const ALLOWED_LOOPS = new Set(['DELIVERY_FAILED→OUT_FOR_DELIVERY', 'DELIVERY_REATTEMPT→OUT_FOR_DELIVERY', 'REFUND_FAILED→REFUND_INITIATED']);

describe('customer order workflow table', () => {
  it('describes every status and only points at statuses it knows', () => {
    expect(Object.keys(NEXT_STATUSES).sort()).toEqual(Object.keys(STATUS_INFO).sort());
    expect(Object.keys(NEXT_STATUSES)).toHaveLength(35);
    for (const targets of Object.values(NEXT_STATUSES)) for (const target of targets) expect(NEXT_STATUSES).toHaveProperty(target);
  });

  it('never moves backwards (only re-attempting a delivery or a refund repeats a step)', () => {
    for (const [from, targets] of Object.entries(NEXT_STATUSES)) {
      for (const to of targets) {
        if (ALLOWED_LOOPS.has(`${from}→${to}`)) continue;
        const a = JOURNEY.indexOf(from);
        const b = JOURNEY.indexOf(to);
        if (a >= 0 && b >= 0) expect(b, `${from} → ${to}`).toBeGreaterThan(a);
      }
    }
  });

  it('never offers the current status as its own next step', () => {
    for (const [status, targets] of Object.entries(NEXT_STATUSES)) expect(targets).not.toContain(status);
  });

  it('ships through Shipped → (In transit) → Out for delivery → Delivered', () => {
    expect(getAllowedStatuses(ctx('PACKED'))).toEqual(['SHIPPED', 'CANCELLED']);
    expect(getAllowedStatuses(ctx('SHIPPED'))).toEqual(['IN_TRANSIT', 'OUT_FOR_DELIVERY']);
    expect(getAllowedStatuses(ctx('IN_TRANSIT'))).toEqual(['OUT_FOR_DELIVERY']);
    expect(getAllowedStatuses(ctx('OUT_FOR_DELIVERY'))).toEqual([
      'DELIVERED',
      'DELIVERY_FAILED',
      'CUSTOMER_UNAVAILABLE',
      'INVALID_ADDRESS',
      'CUSTOMER_CANCELLED_DELIVERY',
    ]);
    expect(getAllowedStatuses(ctx('DELIVERY_FAILED'))).toEqual(['OUT_FOR_DELIVERY', 'DELIVERY_REATTEMPT', 'RETURN_IN_TRANSIT']);
  });

  it('re-attempts a missed delivery, or sends the parcel back; a refused one can only go back', () => {
    expect(getAllowedStatuses(ctx('CUSTOMER_UNAVAILABLE'))).toEqual(['DELIVERY_REATTEMPT', 'RETURN_IN_TRANSIT']);
    expect(getAllowedStatuses(ctx('INVALID_ADDRESS'))).toEqual(['DELIVERY_REATTEMPT', 'RETURN_IN_TRANSIT']);
    expect(getAllowedStatuses(ctx('DELIVERY_REATTEMPT'))).toEqual(['OUT_FOR_DELIVERY', 'RETURN_IN_TRANSIT']);
    expect(getAllowedStatuses(ctx('CUSTOMER_CANCELLED_DELIVERY'))).toEqual(['RETURN_IN_TRANSIT']);
  });

  it('allows cancelling before shipment but never after', () => {
    for (const status of ['ORDER_RECEIVED', 'ORDER_PENDING', 'CONFIRMED', 'PRE_ORDER_CONFIRMED', 'PROCESSING', 'PACKED']) {
      expect(getAllowedStatuses(ctx(status))).toContain('CANCELLED');
    }
    for (const status of ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'DELIVERED', 'RETURN_REQUESTED']) {
      expect(getAllowedStatuses(ctx(status))).not.toContain('CANCELLED');
    }
  });

  it('runs a return through approval, pickup, warehouse, inspection and refund', () => {
    // Only the customer's start of an enabled return requests it (backend 409 RETURN_NOT_ENABLED otherwise).
    expect(NEXT_STATUSES.DELIVERED).toEqual(['RETURN_REQUESTED']);
    expect(getAllowedStatuses(ctx('DELIVERED'))).toEqual([]);
    expect(getLockReason(ctx('DELIVERED'))).toMatch(/enable a return in the Return section/);
    expect(getAllowedStatuses(ctx('RETURN_REQUESTED'))).toEqual(['RETURN_APPROVED', 'RETURN_REJECTED']);
    expect(getAllowedStatuses(ctx('RETURN_APPROVED'))).toEqual(['OUT_FOR_PICKUP', 'RETURN_CANCELLED']);
    expect(getAllowedStatuses(ctx('OUT_FOR_PICKUP'))).toEqual(['RETURN_PICKED_UP', 'RETURN_CANCELLED']);
    expect(getAllowedStatuses(ctx('RETURN_PICKED_UP'))).toEqual(['RETURN_IN_TRANSIT']);
    expect(getAllowedStatuses(ctx('RETURN_IN_TRANSIT'))).toEqual(['RETURN_RECEIVED']);
    expect(getAllowedStatuses(ctx('RETURN_RECEIVED'))).toEqual(['RETURN_INSPECTION']);
    // A paid return is refunded through the refund flow, not the status form.
    expect(getAllowedStatuses(ctx('RETURN_INSPECTION'))).toEqual(['RETURN_INSPECTION_FAILED']);
    expect(getRefundHint(ctx('RETURN_INSPECTION'))).toMatch(/Request refund/);
    expect(getAllowedStatuses(ctx('REFUND_INITIATED'))).toEqual([]);
    expect(getAllowedStatuses(ctx('REFUND_FAILED', 'REFUND_FAILED'))).toEqual([]);
  });

  it('closes unpaid returns without a refund, and refunds paid ones', () => {
    expect(getAllowedStatuses(ctx('RETURN_INSPECTION', 'PENDING'))).toEqual(['RETURN_COMPLETED', 'RETURN_INSPECTION_FAILED']);
    expect(getAllowedStatuses(ctx('RETURN_INSPECTION', 'PAID'))).not.toContain('RETURN_COMPLETED');
    // A requested refund must be approved or rejected first (backend: 409 REFUND_REQUIRED).
    expect(getAllowedStatuses(ctx('RETURN_INSPECTION', 'REFUND_REQUESTED'))).toEqual(['RETURN_INSPECTION_FAILED']);
    expect(getAllowedStatuses(ctx('RETURN_INSPECTION', 'refund_requested'))).not.toContain('RETURN_COMPLETED');
    expect(getRefundHint(ctx('RETURN_INSPECTION', 'REFUND_REQUESTED'))).toMatch(/refund has been requested/);
  });

  it('never offers a refund status in the status form — the refund flow sets them', () => {
    expect([...SYSTEM_ONLY_STATUSES].sort()).toEqual(['REFUND_COMPLETED', 'REFUND_FAILED', 'REFUND_INITIATED', 'REFUND_REQUESTED']);
    for (const current of [...Object.keys(NEXT_STATUSES), null]) {
      for (const payment of ['PAID', 'PENDING', 'REFUND_REQUESTED']) {
        for (const status of getAllowedStatuses(ctx(current, payment))) expect(SYSTEM_ONLY_STATUSES.has(status), `${current} → ${status}`).toBe(false);
      }
    }
  });

  it('a paid cancelled order is locked in the form and pointed to Request refund; an unpaid one is simply final', () => {
    expect(getAllowedStatuses(ctx('CANCELLED', 'PAID'))).toEqual([]);
    expect(getLockReason(ctx('CANCELLED', 'PAID'))).toBe(
      'This order is cancelled and was paid. To refund the customer, use Request refund in the Refunds section.'
    );
    expect(getAllowedStatuses(ctx('CANCELLED', 'PENDING'))).toEqual([]);
    expect(getLockReason(ctx('CANCELLED', 'PENDING'))).toBe('This order is cancelled. Its status is final and can no longer be changed.');
    expect(getRefundHint(ctx('CANCELLED', 'PENDING'))).toBeNull();
  });

  it('points orders in the middle of a refund to the Refunds section', () => {
    for (const payment of ['PAID', 'REFUND_REQUESTED']) {
      expect(getLockReason(ctx('REFUND_REQUESTED', payment))).toMatch(/An approver approves or rejects it in the Refunds section/);
    }
    expect(getLockReason(ctx('REFUND_INITIATED', 'REFUND_REQUESTED'))).toMatch(/with Razorpay.*Refresh status/);
    expect(getLockReason(ctx('REFUND_FAILED', 'REFUND_FAILED'))).toMatch(/It can be requested again/);
    expect(getLockReason(ctx('REFUND_COMPLETED', 'REFUNDED'))).toMatch(/refund for this order is completed/);
  });

  it.each([...FINAL_STATUSES])('locks %s for good', (status) => {
    expect(getAllowedStatuses(ctx(status))).toEqual([]);
    expect(getAllowedStatuses(ctx(status, 'PENDING'))).toEqual([]);
    expect(getLockReason(ctx(status))).toMatch(/final/);
  });

  it('keeps regular and pre-order flows separate until confirmation', () => {
    expect(getAllowedStatuses(ctx('ORDER_RECEIVED'))).not.toContain('PRE_ORDER_CONFIRMED');
    expect(getAllowedStatuses(ctx('PRE_ORDER_RECEIVED'))).not.toContain('CONFIRMED');
  });

  it('only lets an order with no or a legacy status be started, not shipped or returned', () => {
    for (const current of [null, 'PENDING', 'SOMETHING_OLD']) {
      const allowed = getAllowedStatuses(ctx(current));
      expect(allowed).toEqual([...START_STATUSES]);
      expect(allowed).not.toContain('OUT_FOR_DELIVERY');
      expect(allowed).not.toContain('DELIVERED');
    }
  });

  it('never offers PRE_ORDER_CONFIRMED in the generic form — it is reached only via the approval endpoint', () => {
    for (const status of [...Object.keys(NEXT_STATUSES), null, 'PENDING']) {
      expect(getAllowedStatuses(ctx(status))).not.toContain('PRE_ORDER_CONFIRMED');
    }
    expect(getAllowedStatuses(ctx('PRE_ORDER_PENDING'))).toEqual(['CANCELLED']);
    expect(getAllowedStatuses(ctx('PRE_ORDER_CONFIRMED'))).toEqual(['PROCESSING', 'CANCELLED']);
  });

  it('asks for confirmation on delivery, final, cancel and failure steps only', () => {
    for (const status of ['DELIVERED', 'CANCELLED', 'REFUND_COMPLETED', 'RETURN_REJECTED', 'DELIVERY_FAILED', 'REFUND_FAILED']) {
      expect(needsConfirmation(status)).toBe(true);
    }
    for (const status of ['PROCESSING', 'SHIPPED', 'RETURN_APPROVED', 'REFUND_INITIATED']) expect(needsConfirmation(status)).toBe(false);
  });

  it('maps statuses to the main track and the return track', () => {
    expect(MAIN_STAGES).toEqual(['PLACED', 'CONFIRMED', 'FULFILMENT', 'SHIPPING', 'DELIVERY', 'DELIVERED']);
    expect(getStage('IN_TRANSIT')).toBe('SHIPPING');
    expect(getStage('DELIVERY_FAILED')).toBe('DELIVERY');
    const returnStatuses = RETURN_TRACK.flatMap((step) => step.statuses);
    for (const status of ['RETURN_REQUESTED', 'OUT_FOR_PICKUP', 'RETURN_RECEIVED', 'RETURN_INSPECTION', 'REFUND_COMPLETED']) {
      expect(returnStatuses).toContain(status);
    }
  });
});

describe('confirmation requires a fully paid order', () => {
  it('treats only PAID as fully paid', () => {
    expect(isFullyPaid('PAID')).toBe(true);
    expect(isFullyPaid(' paid ')).toBe(true);
    for (const status of ['PENDING', 'FAILED', 'REFUND_REQUESTED', 'REFUNDED', 'CANCELLED', '', null, undefined]) {
      expect(isFullyPaid(status)).toBe(false);
    }
  });

  it.each(['PENDING', 'FAILED', null])('never offers Confirmed for an order whose payment is %s', (payment) => {
    expect(getAllowedStatuses(ctx('ORDER_RECEIVED', payment))).toEqual(['ORDER_PENDING', 'CANCELLED']);
    expect(getAllowedStatuses(ctx('ORDER_PENDING', payment))).not.toContain('CONFIRMED');
    expect(getAllowedStatuses(ctx(null, payment))).not.toContain('CONFIRMED');
    expect(isConfirmBlockedByPayment(ctx('ORDER_RECEIVED', payment))).toBe(true);
  });

  it('offers Confirmed once the order is paid', () => {
    expect(getAllowedStatuses(ctx('ORDER_RECEIVED'))).toContain('CONFIRMED');
    expect(isConfirmBlockedByPayment(ctx('ORDER_RECEIVED'))).toBe(false);
  });

  it('does not report a payment block where confirming is not a next step anyway', () => {
    expect(isConfirmBlockedByPayment(ctx('PACKED', 'PENDING'))).toBe(false);
  });

  it('explains the block with the current payment status', () => {
    expect(getPaymentBlockReason('PAID')).toBeNull();
    expect(getPaymentBlockReason('REFUND_REQUESTED')).toBe("This order can't be confirmed until it is fully paid (payment status: refund requested).");
    expect(getPaymentBlockReason(null)).toMatch(/not recorded/);
  });
});

describe('delivery riders', () => {
  it('may record exactly the six delivery outcomes', () => {
    expect([...DELIVERY_OUTCOMES].sort()).toEqual(
      ['CUSTOMER_CANCELLED_DELIVERY', 'CUSTOMER_UNAVAILABLE', 'DELIVERED', 'DELIVERY_REATTEMPT', 'INVALID_ADDRESS', 'OUT_FOR_DELIVERY'].sort()
    );
  });

  it('are offered only delivery outcomes that are valid next steps', () => {
    expect(getDeliveryOutcomes(ctx('SHIPPED'))).toEqual(['OUT_FOR_DELIVERY']);
    expect(getDeliveryOutcomes(ctx('OUT_FOR_DELIVERY'))).toEqual(['DELIVERED', 'CUSTOMER_UNAVAILABLE', 'INVALID_ADDRESS', 'CUSTOMER_CANCELLED_DELIVERY']);
    expect(getDeliveryOutcomes(ctx('CUSTOMER_UNAVAILABLE'))).toEqual(['DELIVERY_REATTEMPT']);
    expect(getDeliveryOutcomes(ctx('DELIVERY_FAILED'))).toEqual(['OUT_FOR_DELIVERY', 'DELIVERY_REATTEMPT']);
    expect(getDeliveryOutcomes(ctx('DELIVERY_REATTEMPT'))).toEqual(['OUT_FOR_DELIVERY']);
    // Return to origin, fulfilment and returns stay with the store team
    expect(getDeliveryOutcomes(ctx('CUSTOMER_CANCELLED_DELIVERY'))).toEqual([]);
    expect(getDeliveryOutcomes(ctx('PACKED'))).toEqual([]);
    expect(getDeliveryOutcomes(ctx('DELIVERED'))).toEqual([]);
  });

  it('confirm the outcomes that end or interrupt a delivery', () => {
    for (const status of ['DELIVERED', 'CUSTOMER_UNAVAILABLE', 'INVALID_ADDRESS', 'CUSTOMER_CANCELLED_DELIVERY']) {
      expect(needsConfirmation(status), status).toBe(true);
    }
    expect(needsConfirmation('DELIVERY_REATTEMPT')).toBe(false);
    expect(needsConfirmation('OUT_FOR_DELIVERY')).toBe(false);
  });
});

describe('returns enabled by staff', () => {
  it('never offers Return requested: only the customer starts a return', () => {
    expect([...CUSTOMER_ONLY_STATUSES]).toEqual(['RETURN_REQUESTED']);
    for (const current of [...Object.keys(NEXT_STATUSES), null]) {
      for (const hasReturn of [false, true]) {
        expect(getAllowedStatuses({ currentStatus: current, paymentStatus: 'PAID', hasReturn })).not.toContain('RETURN_REQUESTED');
      }
    }
  });

  it('records a failed inspection through the inspection when a return exists, by hand only for older returns', () => {
    expect(getAllowedStatuses({ currentStatus: 'RETURN_INSPECTION', paymentStatus: 'PAID', hasReturn: true })).toEqual([]);
    expect(getAllowedStatuses({ currentStatus: 'RETURN_INSPECTION', paymentStatus: 'PENDING', hasReturn: true })).toEqual(['RETURN_COMPLETED']);
    expect(getAllowedStatuses(ctx('RETURN_INSPECTION'))).toEqual(['RETURN_INSPECTION_FAILED']);
    expect(getRefundHint({ currentStatus: 'RETURN_INSPECTION', paymentStatus: 'PAID', hasReturn: true })).toMatch(/Record the inspection in the Return section/);
    // Once the refund was requested by the inspection, the Refunds section takes over
    expect(getRefundHint({ currentStatus: 'RETURN_INSPECTION', paymentStatus: 'REFUND_REQUESTED', hasReturn: true })).toMatch(/refund has been requested/);
  });

  it('sends a product that failed inspection back to the customer, then closes the order', () => {
    expect(getAllowedStatuses(ctx('RETURN_INSPECTION_FAILED'))).toEqual(['RETURN_BACK_IN_TRANSIT']);
    expect(getAllowedStatuses(ctx('RETURN_BACK_IN_TRANSIT'))).toEqual(['RETURN_BACK_DELIVERED']);
    expect(getAllowedStatuses(ctx('RETURN_BACK_DELIVERED'))).toEqual([]);
    expect(FINAL_STATUSES.has('RETURN_INSPECTION_FAILED')).toBe(false);
    expect(FINAL_STATUSES.has('RETURN_BACK_DELIVERED')).toBe(true);
    expect(getLockReason(ctx('RETURN_INSPECTION_FAILED'))).toBeNull();
    expect(getLockReason(ctx('RETURN_BACK_DELIVERED'))).toMatch(/delivered back to the customer.*final/);
    expect(getStage('RETURN_BACK_IN_TRANSIT')).toBe('RETURNS');
    expect(getStage('RETURN_BACK_DELIVERED')).toBe('CLOSED');
    expect(RETURN_TRACK.flatMap((step) => step.statuses)).toEqual(expect.arrayContaining(['RETURN_BACK_IN_TRANSIT', 'RETURN_BACK_DELIVERED']));
  });

  it("can't reject or cancel a return whose charge the customer paid", () => {
    expect(getAllowedStatuses({ currentStatus: 'RETURN_REQUESTED', paymentStatus: 'PAID', hasReturn: true, returnChargePaid: true })).toEqual(['RETURN_APPROVED']);
    expect(getAllowedStatuses({ currentStatus: 'RETURN_APPROVED', paymentStatus: 'PAID', hasReturn: true, returnChargePaid: true })).toEqual(['OUT_FOR_PICKUP']);
    expect(getAllowedStatuses({ currentStatus: 'OUT_FOR_PICKUP', paymentStatus: 'PAID', hasReturn: true, returnChargePaid: false })).toEqual([
      'RETURN_PICKED_UP',
      'RETURN_CANCELLED',
    ]);
  });

  it('allows hub checkpoints only while a delivery or a return is under way', () => {
    expect(getCheckpointLeg('SHIPPED')).toBe('DELIVERY');
    expect(getCheckpointLeg('IN_TRANSIT')).toBe('DELIVERY');
    for (const status of ['RETURN_PICKED_UP', 'RETURN_IN_TRANSIT', 'RETURN_BACK_IN_TRANSIT']) expect(getCheckpointLeg(status)).toBe('RETURN');
    for (const status of ['PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'OUT_FOR_PICKUP', 'RETURN_RECEIVED', 'RETURN_INSPECTION_FAILED', null]) {
      expect(getCheckpointLeg(status)).toBeNull();
    }
  });
});
