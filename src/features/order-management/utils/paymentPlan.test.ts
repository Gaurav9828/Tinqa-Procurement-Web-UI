import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PAYMENT_PLAN,
  describePlan,
  finalPercentOf,
  planChanges,
  planBreakup,
  planFormFrom,
  planPayload,
  quotedTotal,
  referenceRequired,
  validatePlanForm,
} from './paymentPlan';
import { emptyTaxForm } from './quotationTax';

describe('payment plan', () => {
  it('works out the final part as what is left of 100%, to the hundredth', () => {
    expect(finalPercentOf(DEFAULT_PAYMENT_PLAN)).toBe(50);
    expect(finalPercentOf({ advancePercent: '33.33', midtermPercent: '33.33' })).toBe(33.34);
    expect(finalPercentOf({ advancePercent: '60', midtermPercent: '50' })).toBe(-10);
    expect(finalPercentOf({ advancePercent: 'x', midtermPercent: '10' })).toBeNull();
  });

  it('needs both parts, at most 50% together, and the expected method', () => {
    expect(validatePlanForm({ ...DEFAULT_PAYMENT_PLAN, expectedPaymentMethod: 'CASH' })).toEqual({});
    expect(validatePlanForm({ advancePercent: '', midtermEnabled: true, midtermPercent: '101', expectedPaymentMethod: '' })).toEqual({
      advancePercent: 'Advance percentage is required (0 for none).',
      midtermPercent: 'Midterm must be a percentage from 0 to 100, with at most 2 decimals.',
      expectedPaymentMethod: 'Choose how the supplier expects to be paid.',
    });
    expect(validatePlanForm({ advancePercent: '30', midtermEnabled: true, midtermPercent: '30', expectedPaymentMethod: 'CHEQUE' }).midtermPercent).toBe(
      'At least 50% is paid after delivery and testing, so advance and midterm together can be at most 50% (they are 60%).'
    );
    expect(validatePlanForm({ advancePercent: '10.123', midtermEnabled: false, midtermPercent: '', expectedPaymentMethod: 'CHEQUE' }).advancePercent).toMatch(/2 decimals/);
  });

  it('always leaves at least half for after delivery and testing', () => {
    // 80 % in advance and 20 % at the end is refused, on the advance when there is no midterm
    const upFront = { advancePercent: '80', midtermEnabled: false, midtermPercent: '', expectedPaymentMethod: 'CHEQUE' as const };
    expect(validatePlanForm(upFront)).toEqual({
      advancePercent: 'At least 50% is paid after delivery and testing, so advance and midterm together can be at most 50% (they are 80%).',
    });
    expect(validatePlanForm({ ...upFront, advancePercent: '50' })).toEqual({});
    expect(validatePlanForm({ ...upFront, advancePercent: '25', midtermEnabled: true, midtermPercent: '25.01' }).midtermPercent).toMatch(/they are 50.01%/);
    expect(validatePlanForm({ ...upFront, advancePercent: '0' })).toEqual({});
  });

  it('leaves a plan saved before the 50% rule as it is, until its split is changed', () => {
    const saved = { advancePercent: 30, midtermPercent: 30, expectedPaymentMethod: 'CHEQUE' as const };
    expect(validatePlanForm(planFormFrom(saved), saved)).toEqual({});
    expect(validatePlanForm({ ...planFormFrom(saved), expectedPaymentMethod: 'ONLINE' }, saved)).toEqual({});
    expect(validatePlanForm({ ...planFormFrom(saved), advancePercent: '35' }, saved).midtermPercent).toMatch(/they are 65%/);
    // Without the saved plan (a new quotation) the same split is refused
    expect(validatePlanForm(planFormFrom(saved)).midtermPercent).toMatch(/they are 60%/);
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
      advancePercent: 30, midtermPercent: 20, expectedPaymentMethod: 'ONLINE',
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

describe('a payment\'s reference', () => {
  it('is required for every method but cash', () => {
    expect(referenceRequired('ONLINE')).toBe(true);
    expect(referenceRequired('BANK_TRANSFER')).toBe(true);
    expect(referenceRequired('CHEQUE')).toBe(true);
    expect(referenceRequired('CASH')).toBe(false);
    // No method chosen yet: the method itself is what is missing
    expect(referenceRequired('')).toBe(false);
  });
});

describe('plan breakup in rupees', () => {
  it('splits the total with GST like the server, the final part taking the rest', () => {
    expect(planBreakup({ advancePercent: 30, midtermPercent: 30, expectedPaymentMethod: 'CASH' }, 1180)).toEqual([
      { key: 'ADVANCE', label: 'Advance (once the supplier accepts the order)', percent: 30, amount: 354 },
      { key: 'MIDTERM', label: 'Midterm (once shipped)', percent: 30, amount: 354 },
      { key: 'FINAL', label: 'Final (after the units are tested)', percent: 40, amount: 472 },
    ]);
    // Rounded to the paisa, half up; the final part absorbs the rounding
    const parts = planBreakup({ advancePercent: 33.33, midtermPercent: 33.33 }, 100.01);
    expect(parts.map((p) => p.amount)).toEqual([33.33, 33.33, 33.35]);
  });

  it('leaves out a 0 % midterm, and has nothing without a plan', () => {
    expect(planBreakup({ advancePercent: 50, midtermPercent: 0 }, 200).map((p) => [p.key, p.amount])).toEqual([['ADVANCE', 100], ['FINAL', 100]]);
    expect(planBreakup({ advancePercent: null, midtermPercent: null }, 200)).toEqual([]);
    expect(planBreakup(null, 200)).toEqual([]);
  });
});
