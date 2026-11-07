import { describe, it, expect } from 'vitest';
import { nextMilestone, payableMilestones, paymentAmountDue } from './paymentDue';
import { paymentEntry, paymentSummary } from '../test/paymentFixtures';

describe('the amount of a payment is set by the plan', () => {
  it('is what the server says is left of the part, for a new payment', () => {
    const summary = paymentSummary();
    expect(paymentAmountDue(summary, 'ADVANCE')).toBe(354);
    // Not due yet: nothing
    expect(paymentAmountDue(summary, 'FINAL')).toBe(0);
  });

  it('starts on the earliest part with something left', () => {
    const advancePaid = paymentSummary({
      paid: 354,
      payableNow: 354,
      milestones: [
        { milestone: 'ADVANCE', percent: 30, planned: 354, paid: 354, pending: 0, due: true, left: 0 },
        { milestone: 'MIDTERM', percent: 30, planned: 354, paid: 0, pending: 0, due: true, left: 354 },
        { milestone: 'FINAL', percent: 40, planned: 472, paid: 0, pending: 0, due: false, left: 0 },
      ],
    });
    expect(nextMilestone(paymentSummary())).toBe('ADVANCE');
    expect(nextMilestone(advancePaid)).toBe('MIDTERM');
    expect(payableMilestones(advancePaid)).toEqual(['MIDTERM']);
  });

  it('gives a waiting entry its own amount back when it is corrected', () => {
    // The advance (354) waits for confirmation: the part has nothing left for others, but the entry keeps its amount
    const summary = paymentSummary({
      pendingPayments: 354,
      payableNow: 354,
      milestones: [
        { milestone: 'ADVANCE', percent: 30, planned: 354, paid: 0, pending: 354, due: true, left: 0 },
        { milestone: 'MIDTERM', percent: 30, planned: 354, paid: 0, pending: 0, due: true, left: 354 },
        { milestone: 'FINAL', percent: 40, planned: 472, paid: 0, pending: 0, due: false, left: 0 },
      ],
    });
    const own = paymentEntry({ status: 'PENDING_APPROVAL', amount: 354 });
    expect(paymentAmountDue(summary, 'ADVANCE')).toBe(0);
    expect(paymentAmountDue(summary, 'ADVANCE', own)).toBe(354);
    // Moved to the midterm part, it pays the midterm's 354
    expect(paymentAmountDue(summary, 'MIDTERM', own)).toBe(354);
    expect(payableMilestones(summary, own)).toEqual(['ADVANCE', 'MIDTERM']);
  });
});
