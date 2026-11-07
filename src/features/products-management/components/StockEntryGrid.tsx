import React, { useCallback, useMemo, useRef } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { normalizeBarcode } from '../../barcodes/utils/barcode';
import {
  cellKey,
  isMultiCellPaste,
  isRowComplete,
  isRowEmpty,
  nextCell,
  pasteIntoGrid,
  type GridColumn,
  type GridRow,
} from '../utils/stockEntryGrid';
import { StockEntryPieceInput } from './StockEntryPieceInput';

interface Props {
  columns: GridColumn[];
  rows: GridRow[];
  onChange: (rows: GridRow[]) => void;
  /** Problems found while typing (format, repeats), by cell key. */
  typedProblems: Map<string, string>;
  /** Problems the server named, by cell key and by row. */
  serverCells: Map<string, string>;
  serverRows: Map<number, string>;
  /** Barcodes of each item's pieces in stock, offered in its cells (null: not known, e.g. still loading). */
  pieces: Record<number, string[]> | null;
  /** Told how many pasted values didn't fit. */
  onPasteOverflow: (dropped: number) => void;
  disabled?: boolean;
}

/**
 * The scanning grid: a row per unit, a column for its barcode and one per piece fitted into it (a component used twice
 * per unit has two columns). A piece cell drops down the pieces in stock to pick from, or takes a typed or scanned
 * code. A scanner's Enter moves to the next cell (left to right, then the next unit), and a block pasted from a spreadsheet fills the cells
 * from the one it is pasted into.
 */
const cellClass = (problem: string | undefined) =>
  `w-40 px-2 py-1 font-mono rounded-md border bg-transparent text-black dark:text-white outline-none focus:ring-2 focus:ring-[#0071e3]/40 disabled:opacity-50 ${
    problem ? 'border-rose-500 bg-rose-500/5' : 'border-black/10 dark:border-white/15'
  }`;

export const StockEntryGrid: React.FC<Props> = ({ columns, rows, onChange, typedProblems, serverCells, serverRows, pieces, onPasteOverflow, disabled }) => {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  // Every code entered anywhere in the grid: a piece picked once is not offered again
  const used = useMemo(() => new Set(rows.flat().filter(Boolean)), [rows]);

  const focusCell = useCallback((row: number, column: number) => {
    const input = inputs.current.get(cellKey(row, column));
    input?.focus();
    input?.select();
  }, []);

  const setCell = (r: number, c: number, value: string) =>
    onChange(rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? normalizeBarcode(value) : cell)) : row)));

  const moveOn = (r: number, c: number) => {
    const next = nextCell(r, c, rows.length, columns.length);
    if (next) focusCell(next[0], next[1]);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    moveOn(r, c);
  };

  const register = (key: string) => (element: HTMLInputElement | null) => {
    if (element) inputs.current.set(key, element);
    else inputs.current.delete(key);
  };

  // A component's name without the piece number ("Touch panel #2" → "Touch panel"), for its suggestions
  const itemNames = useMemo(
    () => new Map(columns.filter((column) => column.itemId !== null).map((column) => [column.itemId as number, column.label.replace(/ #\d+$/, '')])),
    [columns]
  );

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>, r: number, c: number) => {
    const text = event.clipboardData.getData('text');
    if (!isMultiCellPaste(text)) return;
    event.preventDefault();
    const pasted = pasteIntoGrid(rows, r, c, text);
    onChange(pasted.rows);
    if (pasted.dropped > 0) onPasteOverflow(pasted.dropped);
  };

  return (
    <div className="overflow-auto max-h-[60vh] rounded-xl border border-black/10 dark:border-white/10">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-white dark:bg-neutral-900">
          <tr>
            <th scope="col" className="px-2 py-2 text-left font-semibold text-gray-500 border-b border-black/10 dark:border-white/10 w-12">
              Unit
            </th>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-black/10 dark:border-white/10 whitespace-nowrap">
                {column.label}
              </th>
            ))}
            <th scope="col" className="px-2 py-2 border-b border-black/10 dark:border-white/10 w-8">
              <span className="sr-only">Complete</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => {
            const complete = isRowComplete(row);
            const rowError = serverRows.get(r);
            return (
              <React.Fragment key={r}>
                <tr className={complete ? 'bg-emerald-500/[0.04]' : undefined}>
                  <th scope="row" className="px-2 py-1 text-left font-medium text-gray-500 border-b border-black/5 dark:border-white/5">
                    {r + 1}
                  </th>
                  {columns.map((column, c) => {
                    const key = cellKey(r, c);
                    const problem = serverCells.get(key) ?? typedProblems.get(key);
                    return (
                      <td key={column.key} className="px-1 py-1 border-b border-black/5 dark:border-white/5 align-top">
                        {column.itemId === null ? (
                          <input
                            ref={register(key)}
                            type="text"
                            value={row[c]}
                            disabled={disabled}
                            spellCheck={false}
                            autoComplete="off"
                            aria-label={`Unit ${r + 1} ${column.label}`}
                            aria-invalid={problem ? true : undefined}
                            title={problem}
                            onChange={(event) => setCell(r, c, event.target.value)}
                            onKeyDown={(event) => onKeyDown(event, r, c)}
                            onPaste={(event) => onPaste(event, r, c)}
                            className={cellClass(problem)}
                          />
                        ) : (
                          <StockEntryPieceInput
                            inputRef={register(key)}
                            value={row[c]}
                            disabled={disabled}
                            ariaLabel={`Unit ${r + 1} ${column.label}`}
                            problem={problem}
                            inStock={pieces ? pieces[column.itemId] ?? [] : null}
                            used={used}
                            itemName={itemNames.get(column.itemId) ?? column.label}
                            onChange={(code) => setCell(r, c, code)}
                            onCommit={() => moveOn(r, c)}
                            onPaste={(event) => onPaste(event, r, c)}
                            className={cellClass(problem)}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 border-b border-black/5 dark:border-white/5">
                    {complete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label={`Unit ${r + 1} complete`} />
                    ) : (
                      <Circle className={`w-4 h-4 ${isRowEmpty(row) ? 'text-gray-300' : 'text-amber-500'}`} aria-label={`Unit ${r + 1} not complete`} />
                    )}
                  </td>
                </tr>
                {rowError && (
                  <tr>
                    <td colSpan={columns.length + 2} role="alert" className="px-2 py-1 text-[11px] text-rose-600 dark:text-rose-400">
                      Unit {r + 1}: {rowError}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
