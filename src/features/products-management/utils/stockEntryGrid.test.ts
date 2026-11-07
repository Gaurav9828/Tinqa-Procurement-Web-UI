import { describe, expect, it } from 'vitest';
import {
  cellProblems,
  describeProblems,
  filledRowCount,
  gridColumns,
  isRowComplete,
  nextCell,
  pasteIntoGrid,
  pieceOptions,
  placeServerErrors,
  unitLimit,
  resizeRows,
  rowsToUnits,
  unitsToRows,
} from './stockEntryGrid';

const COMPONENTS = [
  { itemId: 5, itemName: 'ESP32 board', quantity: 2 },
  { itemId: 9, itemName: 'Lamp shade', quantity: 1 },
];
const COLUMNS = gridColumns(COMPONENTS);

describe('stock entry grid', () => {
  it('has a unit barcode column, then one column per piece fitted into the unit', () => {
    expect(COLUMNS.map((column) => column.label)).toEqual(['Unit barcode', 'ESP32 board #1', 'ESP32 board #2', 'Lamp shade']);
    expect(gridColumns([]).map((column) => column.label)).toEqual(['Unit barcode']);
  });

  it('turns rows into units that name the exact pieces of each unit, and back', () => {
    const rows = [
      ['UNIT0001', 'ESP00001', 'ESP00002', 'SHADE001'],
      ['UNIT0002', '', 'ESP00003', ''],
    ];
    const units = rowsToUnits(rows, COLUMNS, COMPONENTS);
    expect(units).toEqual([
      { barcode: 'UNIT0001', parts: [{ itemId: 5, barcodes: ['ESP00001', 'ESP00002'] }, { itemId: 9, barcodes: ['SHADE001'] }] },
      { barcode: 'UNIT0002', parts: [{ itemId: 5, barcodes: ['ESP00003'] }, { itemId: 9, barcodes: [] }] },
    ]);
    // Saved part-filled: a component's pieces fill its columns from the left; missing rows come back empty
    expect(unitsToRows(units, COLUMNS, 3)).toEqual([
      ['UNIT0001', 'ESP00001', 'ESP00002', 'SHADE001'],
      ['UNIT0002', 'ESP00003', '', ''],
      ['', '', '', ''],
    ]);
  });

  it('counts a row complete only when every cell holds a valid barcode', () => {
    expect(isRowComplete(['UNIT0001', 'ESP00001', 'ESP00002', 'SHADE001'])).toBe(true);
    expect(isRowComplete(['UNIT0001', 'ESP00001', '', 'SHADE001'])).toBe(false);
    expect(isRowComplete(['UNIT0001', 'ESP00001', 'ESP00002', 'BAD'])).toBe(false);
  });

  it('marks invalid codes and every cell of a code used twice', () => {
    const problems = cellProblems([
      ['UNIT0001', 'ESP00001', 'BAD', ''],
      ['UNIT0002', 'ESP00001', '', ''],
    ]);
    expect([...problems.keys()].sort()).toEqual(['0:1', '0:2', '1:1']);
    expect(problems.get('1:1')).toMatch(/ESP00001 is entered more than once/);
    expect(problems.get('0:2')).toMatch(/not a valid barcode/);
  });

  it('keeps rows that hold barcodes when resized, and knows how few rows can stay', () => {
    const rows = [['UNIT0001', '', '', ''], ['', '', '', ''], ['', 'ESP00009', '', ''], ['', '', '', '']];
    expect(filledRowCount(rows)).toBe(3);
    expect(resizeRows(rows, 2, COLUMNS)).toHaveLength(2);
    expect(resizeRows(rows, 6, COLUMNS)[5]).toEqual(['', '', '', '']);
  });

  it('moves to the next cell left to right, then down', () => {
    expect(nextCell(0, 0, 2, 4)).toEqual([0, 1]);
    expect(nextCell(0, 3, 2, 4)).toEqual([1, 0]);
    expect(nextCell(1, 3, 2, 4)).toBeNull();
  });

  it('fills a pasted spreadsheet block from the cell, a pasted list down the column, and counts what does not fit', () => {
    const empty = resizeRows([], 2, COLUMNS);
    const block = pasteIntoGrid(empty, 0, 0, 'unit0001\tesp00001\tesp00002\tshade001\r\nUNIT0002\tESP00003\tESP00004\tSHADE002\r\n');
    expect(block.rows).toEqual([
      ['UNIT0001', 'ESP00001', 'ESP00002', 'SHADE001'],
      ['UNIT0002', 'ESP00003', 'ESP00004', 'SHADE002'],
    ]);
    expect(block.dropped).toBe(0);

    const column = pasteIntoGrid(empty, 0, 3, 'SHADE001\nSHADE002\nSHADE003');
    expect(column.rows.map((row) => row[3])).toEqual(['SHADE001', 'SHADE002']);
    expect(column.dropped).toBe(1);
  });

  it('places server errors on the cells they name or the cells holding the barcode they quote', () => {
    const rows = [
      ['UNIT0001', 'ESP00001', 'ESP00002', 'SHADE001'],
      ['UNIT0002', 'ESP00003', 'ESP00004', 'SHADE002'],
    ];
    const placed = placeServerErrors(
      [
        // A draft save naming a cell: unit 2, component 0 (ESP32), its second piece
        { field: 'units[1].parts[0].barcodes[1]', message: 'Not usable' },
        // A Procurement message quoting a code
        { field: 'productUnits.added[0].parts', message: 'Barcode SHADE001 (Lamp shade) is not in stock: it is fitted in a product' },
        // A unit named without a cell
        { field: 'productUnits.added[1].parts', message: '2 pieces are missing' },
        { field: 'delta', message: 'Cannot add stock' },
      ],
      rows,
      COLUMNS,
      COMPONENTS
    );
    expect(placed.cells.get('1:2')).toBe('Not usable');
    expect(placed.cells.get('0:3')).toMatch(/SHADE001/);
    expect(placed.rows.get(1)).toBe('2 pieces are missing');
    expect(placed.general).toEqual(['Cannot add stock']);
    expect(describeProblems(placed, new Map(), COLUMNS)).toEqual([
      'Cannot add stock',
      'Unit 2: 2 pieces are missing',
      'Unit 2, ESP32 board #2: Not usable',
      'Unit 1, Lamp shade: Barcode SHADE001 (Lamp shade) is not in stock: it is fitted in a product',
    ]);
  });

  it('builds only as many units as there are complete sets of components in stock', () => {
    // One motherboard and two touch panels per unit
    const components = [
      { itemId: 1, itemName: 'Motherboard', quantity: 1 },
      { itemId: 2, itemName: 'Touch panel', quantity: 2 },
    ];
    const pieces = (n: number) => Array.from({ length: n }, (_, i) => `PIECE${String(i).padStart(4, '0')}`);
    // 5 motherboards and 10 panels: 5 sets
    expect(unitLimit(components, { 1: 5, 2: 10 }, { 1: pieces(5), 2: pieces(10) }).max).toBe(5);
    // 9 panels: 4 sets, limited by the panels
    const short = unitLimit(components, { 1: 5, 2: 9 }, { 1: pieces(5), 2: pieces(9) });
    expect(short.max).toBe(4);
    expect(short.limiting?.itemName).toBe('Touch panel');
    // Stock without a barcode can't be scanned into a unit, nor barcodes beyond the approved stock
    expect(unitLimit(components, { 1: 50, 2: 50 }, { 1: pieces(3), 2: pieces(50) }).max).toBe(3);
    expect(unitLimit(components, { 1: 2, 2: 50 }, { 1: pieces(30), 2: pieces(50) }).max).toBe(2);
    expect(unitLimit(components, { 1: 0, 2: 10 }, { 1: [], 2: pieces(10) }).max).toBe(0);
  });

  it('offers the pieces in stock not entered elsewhere, narrowed by what is typed', () => {
    const inStock = ['TP000001', 'TP000002', 'TP000010'];
    expect(pieceOptions(inStock, new Set(['TP000002']), '')).toEqual(['TP000001', 'TP000010']);
    expect(pieceOptions(inStock, new Set(), 'tp00001')).toEqual(['TP000010']);
  });
});
