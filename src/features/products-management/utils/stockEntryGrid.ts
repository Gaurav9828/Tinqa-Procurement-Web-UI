import type { NewProductUnit } from '../../barcodes/types/barcode.types';
import { BARCODE_RULE, isValidBarcode, normalizeBarcode } from '../../barcodes/utils/barcode';
import type { ApiFieldError } from '../../../utils/apiError';
import type { StockDraftComponent } from '../types/stockDraft.types';

/**
 * The stock entry grid: one row per product unit being built, one column for the unit's own barcode and one column per
 * component piece fitted into it (a component used twice per unit has two columns). Each row says exactly which pieces
 * went into which unit.
 */

/** Most units one stock entry adds (Ecommerce ProductStockAdjustmentRequestDTO). */
export const MAX_STOCK_ENTRY_UNITS = 1000;

export interface GridColumn {
  /** Unique per column, e.g. "unit" or "12-0" (item 12, first piece). */
  key: string;
  label: string;
  /** Null for the unit's own barcode. */
  itemId: number | null;
  /** Which piece of the component (0-based). */
  slot: number;
}

/** A row's cells, in column order: the unit barcode first, then the pieces. */
export type GridRow = string[];

/** "row:column", e.g. "3:0" is the 4th unit's barcode. */
export const cellKey = (row: number, column: number) => `${row}:${column}`;

export const gridColumns = (components: StockDraftComponent[]): GridColumn[] => [
  { key: 'unit', label: 'Unit barcode', itemId: null, slot: 0 },
  ...components.flatMap((component) =>
    Array.from({ length: component.quantity }, (_, slot) => ({
      key: `${component.itemId}-${slot}`,
      label: component.quantity > 1 ? `${component.itemName} #${slot + 1}` : component.itemName,
      itemId: component.itemId,
      slot,
    }))
  ),
];

const emptyRow = (columns: GridColumn[]): GridRow => columns.map(() => '');

/** `count` rows, keeping the first ones as they are. */
export const resizeRows = (rows: GridRow[], count: number, columns: GridColumn[]): GridRow[] =>
  Array.from({ length: Math.max(0, count) }, (_, i) => rows[i] ?? emptyRow(columns));

/** The saved units laid out as rows (the pieces entered so far fill a component's columns from the left). */
export const unitsToRows = (units: NewProductUnit[], columns: GridColumn[], quantity: number): GridRow[] =>
  Array.from({ length: quantity }, (_, i) => {
    const unit = units[i];
    if (!unit) return emptyRow(columns);
    return columns.map((column) => {
      if (column.itemId === null) return unit.barcode ?? '';
      const codes = (unit.parts.find((part) => part.itemId === column.itemId)?.barcodes ?? []).filter(Boolean);
      return codes[column.slot] ?? '';
    });
  });

/** The rows as Ecommerce takes them: one part per component (in the components' order), blanks left out. */
export const rowsToUnits = (rows: GridRow[], columns: GridColumn[], components: StockDraftComponent[]): NewProductUnit[] =>
  rows.map((row) => ({
    barcode: row[0] ?? '',
    parts: components.map((component) => ({
      itemId: component.itemId,
      barcodes: columns.flatMap((column, c) => (column.itemId === component.itemId && row[c] ? [row[c]] : [])),
    })),
  }));

export const isRowEmpty = (row: GridRow) => row.every((cell) => !cell);

/** Every cell filled with a valid code (duplicates are reported separately). */
export const isRowComplete = (row: GridRow) => row.every((cell) => cell !== '' && isValidBarcode(cell));

/** The fewest rows that keep everything entered (rows after the last filled one can go). */
export const filledRowCount = (rows: GridRow[]) => {
  for (let i = rows.length - 1; i >= 0; i--) if (!isRowEmpty(rows[i])) return i + 1;
  return 0;
};

/** What is wrong with each cell as typed: not a valid barcode, or the same code in another cell. */
export const cellProblems = (rows: GridRow[]): Map<string, string> => {
  const problems = new Map<string, string>();
  const firstSeen = new Map<string, string>();
  rows.forEach((row, r) =>
    row.forEach((code, c) => {
      if (!code) return;
      const key = cellKey(r, c);
      if (!isValidBarcode(code)) {
        problems.set(key, `${code} is not a valid barcode: use ${BARCODE_RULE}.`);
        return;
      }
      const first = firstSeen.get(code);
      if (first === undefined) {
        firstSeen.set(code, key);
        return;
      }
      const message = `${code} is entered more than once: every unit and piece has its own barcode.`;
      problems.set(first, message);
      problems.set(key, message);
    })
  );
  return problems;
};

/** The cell after this one, left to right then down (null after the last). */
export const nextCell = (row: number, column: number, rowCount: number, columnCount: number): [number, number] | null => {
  if (column + 1 < columnCount) return [row, column + 1];
  if (row + 1 < rowCount) return [row + 1, 0];
  return null;
};

/**
 * Text pasted into a cell: a block copied from a spreadsheet (rows on lines, cells split by tabs) fills the grid from
 * that cell; a list of codes on separate lines fills the column downwards. Codes are upper-cased. Values beyond the
 * grid's edge are counted in `dropped`, never written.
 */
export const pasteIntoGrid = (
  rows: GridRow[],
  startRow: number,
  startColumn: number,
  text: string
): { rows: GridRow[]; written: number; dropped: number } => {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  const next = rows.map((row) => [...row]);
  let written = 0;
  let dropped = 0;
  lines.forEach((line, dr) => {
    line.split('\t').forEach((raw, dc) => {
      const code = normalizeBarcode(raw);
      const r = startRow + dr;
      const c = startColumn + dc;
      if (!code) return;
      if (r >= next.length || c >= (next[r]?.length ?? 0)) {
        dropped += 1;
        return;
      }
      next[r][c] = code;
      written += 1;
    });
  });
  return { rows: next, written, dropped };
};

/** True when pasted text spans more than one cell (one code is left to the input's own paste). */
export const isMultiCellPaste = (text: string) => /[\t\n\r]/.test(text.trim());

// `units[3]`, `productUnits.added[3]` or `newUnits[3]`, then what of the unit: `.barcode`, `.parts`, `.parts[1].barcodes[0]`
const UNIT_IN_PATH = /(?:^|\.)(?:units|added|newUnits)\[(\d+)\](.*)$/;
const PIECE_IN_PATH = /^\.parts\[(\d+)\]\.barcodes\[(\d+)\]$/;
const BARCODE_IN_MESSAGE = /Barcode ([A-Z0-9][A-Z0-9-]{6,30}[A-Z0-9])\b/g;

export interface ServerGridErrors {
  /** Errors that name a cell. */
  cells: Map<string, string>;
  /** Errors that name a unit but no cell. */
  rows: Map<number, string>;
  /** Everything else (shown above the grid). */
  general: string[];
}

// Every cell holding each code
const cellsByCode = (rows: GridRow[]) => {
  const byCode = new Map<string, string[]>();
  rows.forEach((row, r) =>
    row.forEach((code, c) => {
      if (code) byCode.set(code, [...(byCode.get(code) ?? []), cellKey(r, c)]);
    })
  );
  return byCode;
};

/** The unit and, when named, the column an error's field points at (null when it names no unit). */
const locateField = (
  field: string,
  rows: GridRow[],
  columns: GridColumn[],
  components: StockDraftComponent[]
): { row: number; column: number | null } | null => {
  const unit = UNIT_IN_PATH.exec(field);
  if (!unit) return null;
  const row = Number(unit[1]);
  const rest = unit[2];
  if (rest === '.barcode') return { row, column: 0 };
  const piece = PIECE_IN_PATH.exec(rest);
  if (!piece) return { row, column: null };
  return { row, column: pieceColumn(rows[row], columns, components, Number(piece[1]), Number(piece[2])) };
};

/**
 * The server's errors placed on the grid. Draft saves name cells (`units[3].parts[1].barcodes[0]`); stock changes
 * name units (`productUnits.added[3].parts`). An error that quotes a barcode ("Barcode X is not in stock") marks every
 * cell holding X instead.
 */
export const placeServerErrors = (errors: ApiFieldError[], rows: GridRow[], columns: GridColumn[], components: StockDraftComponent[]): ServerGridErrors => {
  const result: ServerGridErrors = { cells: new Map(), rows: new Map(), general: [] };
  const codeCells = cellsByCode(rows);

  for (const error of errors) {
    const quoted = [...error.message.matchAll(BARCODE_IN_MESSAGE)].flatMap((match) => codeCells.get(match[1]) ?? []);
    if (quoted.length > 0) {
      quoted.forEach((key) => result.cells.set(key, error.message));
      continue;
    }
    const place = locateField(error.field ?? '', rows, columns, components);
    if (!place || place.row >= rows.length) result.general.push(error.message);
    else if (place.column === null) result.rows.set(place.row, error.message);
    else result.cells.set(cellKey(place.row, place.column), error.message);
  }
  return result;
};

/** Every problem as one line ("Unit 3, ESP32 #1: …"), the server's first, without repeats. */
export const describeProblems = (server: ServerGridErrors, typed: Map<string, string>, columns: GridColumn[]): string[] => {
  const cellMessages = [...server.cells, ...typed].map(([key, message]) => {
    const [r, c] = key.split(':').map(Number);
    return `Unit ${r + 1}, ${columns[c]?.label ?? 'barcode'}: ${message}`;
  });
  const rowMessages = [...server.rows].map(([r, message]) => `Unit ${r + 1}: ${message}`);
  return [...new Set([...server.general, ...rowMessages, ...cellMessages])];
};

// The column of the k-th piece entered for component j in the row (null when only the component is named)
const pieceColumn = (
  row: GridRow | undefined,
  columns: GridColumn[],
  components: StockDraftComponent[],
  componentIndex: number,
  pieceIndex: number
): number | null => {
  const itemId = components[componentIndex]?.itemId;
  if (itemId === undefined || !row) return null;
  const filled = columns.map((_, c) => c).filter((c) => columns[c].itemId === itemId && row[c]);
  return filled[pieceIndex] ?? null;
};

/** One component's share of the limit: the units its stock allows. */
export interface ComponentLimit {
  itemId: number;
  itemName: string;
  perUnit: number;
  /** Approved, delivered item stock (Procurement availability). */
  available: number;
  /** Pieces in stock that carry a barcode (only those can be fitted: every piece is scanned). */
  withBarcode: number;
  /** Units this component allows: the smaller of the two, divided by what one unit uses. */
  maxUnits: number;
}

/**
 * How many units can be built from the components in stock: each unit takes `quantity` pieces of every component, so
 * the component with the fewest sets limits the rest (5 motherboards and 10 touch panels used twice per unit: 5 units).
 */
export const unitLimit = (
  components: StockDraftComponent[],
  available: Record<number, number>,
  pieces: Record<number, string[]>
): { max: number; lines: ComponentLimit[]; limiting: ComponentLimit | null } => {
  const lines = components.map((component) => {
    const inStock = Math.max(0, available[component.itemId] ?? 0);
    const withBarcode = pieces[component.itemId]?.length ?? 0;
    const perUnit = Math.max(1, component.quantity);
    return {
      itemId: component.itemId,
      itemName: component.itemName,
      perUnit,
      available: inStock,
      withBarcode,
      maxUnits: Math.floor(Math.min(inStock, withBarcode) / perUnit),
    };
  });
  const limiting = lines.reduce<ComponentLimit | null>((min, line) => (min === null || line.maxUnits < min.maxUnits ? line : min), null);
  return { max: Math.min(MAX_STOCK_ENTRY_UNITS, limiting?.maxUnits ?? MAX_STOCK_ENTRY_UNITS), lines, limiting };
};

/** The pieces a cell may offer: in stock, of its item, not entered in another cell, matching what is typed. */
export const pieceOptions = (inStock: string[], used: Set<string>, typed: string): string[] => {
  const text = normalizeBarcode(typed);
  return inStock.filter((code) => !used.has(code) && (text === '' || code.includes(text)));
};
