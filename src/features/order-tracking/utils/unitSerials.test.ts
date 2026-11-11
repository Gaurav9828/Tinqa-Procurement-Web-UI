import { describe, expect, it } from 'vitest';
import { collectSerials, linesNeedingSerials, serialSlots } from './unitSerials';
import type { OrderItemUnits } from '../types/orderTracking.types';

const LINES: OrderItemUnits[] = [
  { orderItemId: 1, productId: 11, title: 'SummitX', quantity: 2, units: [] },
  { orderItemId: 2, productId: 12, title: 'Stand', quantity: 1, units: [] },
  {
    orderItemId: 3,
    productId: 13,
    title: 'Lens',
    quantity: 1,
    units: [{ serial: 'TQ-LENS-0001', warrantyTitle: null, coverageStartsOn: null, coverageEndsOn: null, released: false }],
  },
];

describe('unit serials', () => {
  it('asks for one serial per unit of every line that has none yet', () => {
    const slots = serialSlots(linesNeedingSerials(LINES));
    expect(slots.map((s) => s.key)).toEqual(['1:0', '1:1', '2:0']);
    expect(slots[1]).toMatchObject({ title: 'SummitX', position: 2, quantity: 2 });
  });

  it('upper-cases and trims what was scanned, and builds the request', () => {
    const slots = serialSlots(linesNeedingSerials(LINES));
    const { serials, errors } = collectSerials(slots, { '1:0': ' tq-sx-0001 ', '1:1': 'TQ-SX-0002', '2:0': 'TQ-ST-0001' });
    expect(errors).toEqual({});
    expect(serials).toEqual([
      { orderItemId: 1, serial: 'TQ-SX-0001' },
      { orderItemId: 1, serial: 'TQ-SX-0002' },
      { orderItemId: 2, serial: 'TQ-ST-0001' },
    ]);
  });

  it('flags a missing, malformed or repeated serial on its own box', () => {
    const slots = serialSlots(linesNeedingSerials(LINES));
    const { errors } = collectSerials(slots, { '1:0': 'TQ-SX-0001', '1:1': 'tq-sx-0001', '2:0': 'bad!' });
    expect(Object.keys(errors)).toEqual(['1:1', '2:0']);
    expect(errors['1:1']).toMatch(/already entered/);
    expect(collectSerials(slots, {}).errors['1:0']).toMatch(/Scan or type/);
  });
});
