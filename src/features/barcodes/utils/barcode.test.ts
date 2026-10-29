import { describe, expect, it } from 'vitest';
import { barcodeListError, isValidBarcode, normalizeBarcode, repeatedAcrossUnits, splitBarcodes } from './barcode';
import { resizeUnits, toUnitComponents, unitsProblem } from './productUnits';
import { fitToComponents, rememberedUnits, rememberUnits, updateRememberedUnits } from './rememberedUnits';

describe('barcode rules (same as the backends)', () => {
  it('accepts 8-32 letters, digits and inner hyphens, compared upper-case', () => {
    expect(normalizeBarcode('  ab-1234567 ')).toBe('AB-1234567');
    expect(isValidBarcode('8901234567890')).toBe(true); // EAN-13
    expect(isValidBarcode('12345678')).toBe(true); // shortest
    expect(isValidBarcode('a'.repeat(32))).toBe(true);
    expect(isValidBarcode('1234567')).toBe(false);
    expect(isValidBarcode('a'.repeat(33))).toBe(false);
    expect(isValidBarcode('-1234567890')).toBe(false);
    expect(isValidBarcode('ABC 12345')).toBe(false);
  });

  it('splits a scan or paste into codes', () => {
    expect(splitBarcodes('tq00000001\nTQ00000002, tq00000003;TQ00000004')).toEqual(['TQ00000001', 'TQ00000002', 'TQ00000003', 'TQ00000004']);
  });

  it('reports the first problem of a list that must hold an exact count', () => {
    expect(barcodeListError(['TQ00000001'], 2, 'passed unit')).toBe('Scan one barcode for each of the 2 passed units (1 entered).');
    expect(barcodeListError([], 1, 'unit')).toBe('Scan the barcode of the unit (0 entered).');
    expect(barcodeListError(['TQ00000001', 'TQ00000001'], 2)).toBe('TQ00000001 is entered more than once.');
    expect(barcodeListError(['SHORT'], 1)).toMatch(/^SHORT is not a valid barcode/);
    expect(barcodeListError(['TQ00000001', 'TQ00000002'], 2)).toBeNull();
  });
});

describe('product units', () => {
  const components = toUnitComponents([
    { itemId: 7, itemName: 'Board', quantity: '1' },
    { itemId: 8, itemName: 'Cable', quantity: 2 },
    { itemId: null, itemName: '', quantity: '1' }, // still being chosen
  ]);

  it('builds one parts list per component and keeps what was entered when resized', () => {
    expect(components).toEqual([
      { itemId: 7, itemName: 'Board', quantity: 1 },
      { itemId: 8, itemName: 'Cable', quantity: 2 },
    ]);
    const one = resizeUnits([], 1, components);
    expect(one).toEqual([{ barcode: '', parts: [{ itemId: 7, barcodes: [] }, { itemId: 8, barcodes: [] }] }]);
    const two = resizeUnits([{ ...one[0], barcode: 'UNIT00001' }], 2, components);
    expect(two[0].barcode).toBe('UNIT00001');
    expect(two[1].barcode).toBe('');
  });

  it('needs every unit barcode and one barcode per piece, each unique', () => {
    const unit = (barcode: string, board: string[], cables: string[]) => ({
      barcode,
      parts: [{ itemId: 7, barcodes: board }, { itemId: 8, barcodes: cables }],
    });
    expect(unitsProblem([unit('', [], [])], 1, components)).toBe('The unit needs its own barcode.');
    expect(unitsProblem([unit('UNIT00001', ['BRD00001'], ['CBL00001'])], 1, components)).toBe(
      'The unit: Scan one barcode for each of the 2 Cable pieces (1 entered).'
    );
    const complete = unit('UNIT00001', ['BRD00001'], ['CBL00001', 'CBL00002']);
    expect(unitsProblem([complete], 1, components)).toBeNull();
    const reused = unit('UNIT00002', ['BRD00001'], ['CBL00003', 'CBL00004']);
    expect(repeatedAcrossUnits([complete, reused])).toBe('BRD00001');
    expect(unitsProblem([complete, reused], 2, components)).toBe('BRD00001 is used more than once: every unit and piece has its own barcode.');
    expect(unitsProblem([complete], 2, components)).toBe('Enter the barcodes of 2 units.');
  });
});

describe('unit barcodes kept for a resubmission', () => {
  it('keeps them per product and follows stock changes', () => {
    rememberUnits(5, [{ barcode: 'UNIT0001', parts: [] }]);
    updateRememberedUnits(5, [{ barcode: 'UNIT0002', parts: [] }], ['UNIT0001']);
    expect(rememberedUnits(5).map((unit) => unit.barcode)).toEqual(['UNIT0002']);
    expect(rememberedUnits(6)).toEqual([]);
    rememberUnits(5, []);
    expect(rememberedUnits(5)).toEqual([]);
  });

  it('fits them to the components after an edit: dropped components go, quantities cut', () => {
    const kept = [{ barcode: 'UNIT0001', parts: [{ itemId: 1, barcodes: ['PCE00001', 'PCE00002'] }, { itemId: 2, barcodes: ['PCE00003'] }] }];
    expect(fitToComponents(kept, [{ itemId: 1, itemName: 'Board', quantity: 1 }, { itemId: 3, itemName: 'Fan', quantity: 1 }])).toEqual([
      { barcode: 'UNIT0001', parts: [{ itemId: 1, barcodes: ['PCE00001'] }, { itemId: 3, barcodes: [] }] },
    ]);
  });
});
