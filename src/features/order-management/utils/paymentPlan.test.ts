import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PAYMENT_PLAN,
  describePlan,
  finalPercentOf,
  planChanges,
  planFormFrom,
  planPayload,
  quotedTotal,
  validatePlanForm,
} from './paymentPlan';
import { emptyTaxForm } from './quotationTax';

describe('payment plan', () => {
  it('works out the final part as what is left of 100%, to the hundredth', () => {
    expect(finalPercentOf(DEFAULT_PAYMENT_PLAN)).toBe(40);
    expect(finalPercentOf({ advancePercent: '33.33', midtermPercent: '33.33' })).toBe(33.34);
    expect(finalPercentOf({ advancePercent: '60', midtermPercent: '50' })).toBe(-10);
    expect(finalPercentOf({ advancePercent: 'x', midtermPercent: '10' })).toBeNull();
  });

  it('needs both parts, at most 100% together, and the expected method', () => {
    expect(validatePlanForm({ ...DEFAULT_PAYMENT_PLAN, expectedPaymentMethod: 'CASH' })).toEqual({});
    expect(validatePlanForm({ advancePercent: '', midtermEnabled: true, midtermPercent: '101', expectedPaymentMethod: '' })).toEqual({
      advancePercent: 'Advance percentage is required (0 for none).',
      midtermPercent: 'Midterm must be a percentage from 0 to 100, with at most 2 decimals.',
      expectedPaymentMethod: 'Choose how the dealer expects to be paid.',
    });
    expect(validatePlanForm({ advancePercent: '70', midtermEnabled: true, midtermPercent: '40', expectedPaymentMethod: 'CHEQUE' }).midtermPercent).toBe(
      'Advance and midterm together cannot be more than 100% (they are 110%).'
    );
    expect(validatePlanForm({ advancePercent: '10.123', midtermEnabled: false, midtermPercent: '', expectedPaymentMethod: 'CHEQUE' }).advancePercent).toMatch(/2 decimals/);
  });

  it('makes the midterm part optional: advance and final only, sent as 0% midterm', () => {
    const noMidterm = { advancePercent: '30', midtermEnabled: false, midtermPercent: '', expectedPaymentMethod: 'ONLINE' as const };
    expect(validatePlanForm(noMidterm)).toEqual({});
    expect(finalPercentOf(noMidterm)).toBe(70);
    expect(planPayload(noMidterm)).toEqual({ advancePercent: 30, midtermPercent: 0, expectedPaymentMethod: 'ONLINE' });
    // A saved 0 % midterm reopens as a plan without one; a ticked midterm needs a percentage above 0
    expect(planFormFrom({ advancePercent: 30, midtermPercent: 0, expectedPaymentMethod: 'ONLINE' })).toEqual(noMidterm);
    expect(validatePlanForm({ ...noMidterm, midtermEnabled: true }).midtermPercent).toBe('Midterm percentage is required, or untick the midterm payment.');
    expect(validatePlanForm({ ...noMidterm, midtermEnabled: true, midtermPercent: '0' }).midtermPercent).toMatch(/Untick the midterm/);
    expect(describePlan({ advancePercent: 30, midtermPercent: 0, expectedPaymentMethod: 'ONLINE' })).toBe('30% advance · 70% after testing · Online payment');
  });

  it('sends only what changed, and gives an order made before plans existed its first plan', () => {
    const saved = { advancePercent: 30, midtermPercent: 30, expectedPaymentMethod: 'CHEQUE' as const };
    const form = planFormFrom(saved);
    expect(planChanges(form, saved)).toEqual({});
    expect(planChanges({ ...form, advancePercent: '50' }, saved)).toEqual({ advancePercent: 50 });
    expect(planChanges({ ...DEFAULT_PAYMENT_PLAN, expectedPaymentMethod: 'ONLINE' }, null)).toEqual({
      advancePercent: 30, midtermPercent: 30, expectedPaymentMethod: 'ONLINE',
    });
    expect(planPayload({ advancePercent: '12.5', midtermEnabled: true, midtermPercent: '10', expectedPaymentMethod: 'CASH' })).toEqual({
      advancePercent: 12.5, midtermPercent: 10, expectedPaymentMethod: 'CASH',
    });
  });

  it('describes a plan in words, and works the parts out on the total with GST', () => {
    expect(describePlan({ advancePercent: 30, midtermPercent: 30, expectedPaymentMethod: 'BANK_TRANSFER' })).toBe(
      '30% advance · 30% midterm · 40% after testing · Bank to bank transfer'
    );
    expect(describePlan({ advancePercent: null, midtermPercent: null })).toBeNull();
    expect(quotedTotal(1000, emptyTaxForm())).toBe(1000);
    expect(quotedTotal(1000, { ...emptyTaxForm(), enabled: true, supplyType: 'INTER_STATE', gstRate: '18' })).toBe(1180);
    expect(quotedTotal(null, emptyTaxForm())).toBeNull();
  });
});
