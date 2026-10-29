import { describe, expect, it } from 'vitest';
import { billFormOf, validateBill } from './billForm';
import { EMPTY_PLAN, moveBill, newBill, newClient, nextClient, orderedBills, previousJourney, validatePlanStep, withBill, type PlanForm } from './planForm';
import { clashOf, planBlocks, takenFor, takenOn } from './timeBlocks';

const DAY = '2030-05-10';
const NEXT = '2030-05-11';

const plan = (patch: Partial<PlanForm>): PlanForm => ({ ...EMPTY_PLAN, startDate: DAY, numberOfDays: '2', ...patch });
const visit = { ...newClient(1), clientName: 'Hotel Sunrise', startTime: '10:00', endTime: '13:00' };
const journey = (key: number, startTime: string, endDate: string, endTime: string) => ({
  ...newBill(key, 'TRAVEL', 1, DAY), travelMode: 'BUS' as const, fromPlace: 'Delhi', toPlace: 'Jaipur', amount: '0', startTime, endDate, endTime,
});
const night = (key: number, startTime: string, endTime: string) => ({ ...newBill(key, 'STAY', 1, DAY), vendorName: 'Hotel Pearl', amount: '0', startTime, endTime });

describe('time already taken', () => {
  it('shades what a visit and an overnight journey take on each date', () => {
    const blocks = planBlocks(plan({ clients: [visit], bills: [journey(2, '18:00', NEXT, '06:00')] }));
    expect(takenOn(blocks, DAY)).toEqual([
      { from: 600, to: 780, label: 'Visit to Hotel Sunrise' },
      { from: 1080, to: 1440, label: 'Travel Delhi → Jaipur' },
    ]);
    expect(takenOn(blocks, NEXT)).toEqual([{ from: 0, to: 360, label: 'Travel Delhi → Jaipur' }]);
  });

  it('lets a span end exactly when the next starts, but not run into it', () => {
    const taken = takenFor(planBlocks(plan({ clients: [visit] })), 'bill-9', 'busy');
    expect(clashOf(taken, `${DAY}T08:00`, `${DAY}T10:00`)).toBeUndefined();
    expect(clashOf(taken, `${DAY}T08:00`, `${DAY}T10:01`)?.label).toBe('Visit to Hotel Sunrise');
  });

  it('won’t plan a journey over a visit, nor two nights at once; a night may overlap a journey', () => {
    const errors = validatePlanStep(2, plan({
      clients: [visit],
      bills: [journey(2, '12:00', DAY, '14:00'), night(3, '21:00', '08:00'), night(4, '23:00', '09:00'), journey(5, '22:00', NEXT, '05:00')],
    }), null);
    expect(errors['bill-2']).toMatch(/^Clashes with Visit to Hotel Sunrise \(10 May 2030, 10:00 am – 10 May 2030, 1:00 pm\)/);
    expect(errors['bill-3']).toMatch(/^Clashes with Night stay at Hotel Pearl/);
    expect(errors['bill-5']).toBeUndefined();
  });

  it('won’t record a journey over a visit on the demo either', () => {
    const form = { ...billFormOf(null, 'TRAVEL', 1, { startDate: DAY, numberOfDays: 2 }), travelMode: 'BUS' as const, fromPlace: 'Delhi',
      toPlace: 'Jaipur', amount: '100', startTime: '09:00', endTime: '11:00' };
    const taken = takenFor(planBlocks(plan({ clients: [visit] })), '', 'busy');
    expect(validateBill(form, { startDate: DAY, numberOfDays: 2 }, false, null, taken).endTime).toMatch(/^Clashes with Visit to Hotel Sunrise/);
    expect(validateBill({ ...form, endTime: '10:00' }, { startDate: DAY, numberOfDays: 2 }, false, null, taken).endTime).toBeUndefined();
  });
});

describe('adding a client', () => {
  it('starts when the day\'s last visit ends', () => {
    const next = nextClient(2, plan({ clients: [visit] }));
    expect([next.dayNumber, next.startTime, next.endTime]).toEqual(['1', '13:00', '16:00']);
  });

  it('ends at 11:59 pm at most, and moves to the next day once the day is full', () => {
    expect(nextClient(2, plan({ clients: [{ ...visit, startTime: '18:00', endTime: '22:00' }] })).endTime).toBe('23:59');
    const next = nextClient(2, plan({ clients: [{ ...visit, startTime: '20:00', endTime: '23:59' }] }));
    expect([next.dayNumber, next.startTime, next.endTime]).toEqual(['2', '10:00', '13:00']);
  });
});

describe('a day\'s order', () => {
  const bus = journey(1, '06:00', DAY, '08:00');
  const cab = journey(2, '09:00', DAY, '10:00');
  const stay = night(3, '21:00', '08:00');

  it('puts a new bill at its slot\'s place, and moves a day\'s bill to another place', () => {
    const bills = withBill([bus, stay], cab);
    expect(orderedBills(bills).map((bill) => bill.key)).toEqual([1, 2, 3]);
    expect(orderedBills(moveBill(bills, 1, 1, 0)).map((bill) => bill.key)).toEqual([2, 1, 3]);
    expect(orderedBills(moveBill(bills, 1, 2, 0)).map((bill) => bill.key)).toEqual([3, 1, 2]);
  });

  it('runs the journeys in the order shown', () => {
    const moved = moveBill([bus, cab], 1, 1, 0);
    expect(previousJourney(moved, 1, bus)?.key).toBe(2);
  });
});
