import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { stockDraftsApi } from '../api/stockDraftsApi';
import type { ProductResponse } from '../types/product.types';
import type { StockDraftComponent, StockDraftDetail } from '../types/stockDraft.types';
import { useNotify } from '../../../hooks/useNotify';
import { updateRememberedUnits } from '../../barcodes/utils/rememberedUnits';
import { getApiErrorCode, parseApiError } from '../../../utils/apiError';
import {
  cellProblems,
  filledRowCount,
  gridColumns,
  isRowComplete,
  placeServerErrors,
  resizeRows,
  rowsToUnits,
  unitsToRows,
  type GridRow,
  type ServerGridErrors,
} from '../utils/stockEntryGrid';

/** What the editor opens: a saved draft, or a new entry for a product. */
export type StockEntryTarget = { draftId: number; product?: ProductResponse } | { draftId?: undefined; product: ProductResponse };

const NO_SERVER_ERRORS: ServerGridErrors = { cells: new Map(), rows: new Map(), general: [] };

const componentsOf = (product: ProductResponse): StockDraftComponent[] =>
  product.components.map(({ itemId, itemName, quantity }) => ({ itemId, itemName, quantity }));

/**
 * One stock entry being worked on. A saved draft is loaded once when opened; a new one starts with one row and is
 * created on its first save. Rows are kept here until saved, so a refused save loses nothing: the cells the server
 * names are marked instead.
 */
export const useStockEntryEditor = (target: StockEntryTarget, onSubmitted: () => void, onDraftsChanged: () => void) => {
  const notify = useNotify();
  const [draft, setDraft] = useState<StockDraftDetail | null>(null);
  const [isLoading, setIsLoading] = useState(target.draftId !== undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [components, setComponents] = useState<StockDraftComponent[]>(() => (target.product ? componentsOf(target.product) : []));
  const columns = useMemo(() => gridColumns(components), [components]);
  const [rows, setRows] = useState<GridRow[]>(() => resizeRows([], 1, gridColumns(target.product ? componentsOf(target.product) : [])));
  const [note, setNote] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<'save' | 'submit' | 'delete' | null>(null);
  const [serverErrors, setServerErrors] = useState<ServerGridErrors>(NO_SERVER_ERRORS);
  const inFlight = useRef(false);

  const applyDraft = useCallback((loaded: StockDraftDetail) => {
    const loadedColumns = gridColumns(loaded.components);
    setDraft(loaded);
    setComponents(loaded.components);
    setRows(unitsToRows(loaded.units, loadedColumns, loaded.quantity));
    setNote(loaded.note ?? '');
    setDirty(false);
  }, []);

  const draftId = target.draftId;
  useEffect(() => {
    if (draftId === undefined) return;
    let active = true;
    stockDraftsApi
      .get(draftId)
      .then((res) => {
        if (!active) return;
        if (!res.success) throw res;
        applyDraft(res.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadFailed(true);
        notify.error(err, "Couldn't load the stock entry draft.");
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [draftId, applyDraft, notify]);

  const typed = useMemo(() => cellProblems(rows), [rows]);
  const completeRows = useMemo(() => rows.filter(isRowComplete).length, [rows]);

  // A cell's server error goes once that cell is changed; the others stay until the next save
  const edit = useCallback(
    (next: GridRow[]) => {
      setServerErrors((current) => {
        if (current.cells.size === 0 && current.rows.size === 0) return current;
        const cells = new Map([...current.cells].filter(([key]) => {
          const [r, c] = key.split(':').map(Number);
          return next[r]?.[c] === rows[r]?.[c];
        }));
        const rowErrors = new Map([...current.rows].filter(([r]) => next[r]?.join('\t') === rows[r]?.join('\t')));
        return { ...current, cells, rows: rowErrors };
      });
      setRows(next);
      setDirty(true);
    },
    [rows]
  );

  const setQuantity = useCallback(
    (count: number) => edit(resizeRows(rows, Math.max(filledRowCount(rows), Math.max(1, count)), columns)),
    [edit, rows, columns]
  );

  const changeNote = useCallback((value: string) => {
    setNote(value);
    setDirty(true);
  }, []);

  const fail = useCallback(
    (err: unknown, fallback: string) => {
      const parsed = parseApiError(err, fallback);
      const placed = placeServerErrors(parsed.errors, rows, columns, components);
      setServerErrors(parsed.errors.length ? placed : { ...NO_SERVER_ERRORS, general: [parsed.message] });
      notify.error(err, fallback);
    },
    [rows, columns, components, notify]
  );

  /** Saves the rows as they are; resolves to the saved draft (null if refused). */
  const persist = useCallback(async (): Promise<StockDraftDetail | null> => {
    const productId = draft?.productId ?? target.product?.id;
    if (productId === undefined) return null;
    const payload = { quantity: rows.length, note: note.trim() || null, units: rowsToUnits(rows, columns, components) };
    try {
      const res = draft ? await stockDraftsApi.update(draft.id, { ...payload, version: draft.version }) : await stockDraftsApi.create({ ...payload, productId });
      if (!res.success) throw res;
      applyDraft(res.data);
      setServerErrors(NO_SERVER_ERRORS);
      onDraftsChanged();
      if (!res.data.stockChecked && res.data.units.some((unit) => unit.barcode || unit.parts.some((part) => part.barcodes.length))) {
        notify.warning("Draft saved, but the barcodes couldn't be checked against stock right now. They are checked again on submit.");
      }
      return res.data;
    } catch (err: unknown) {
      if (getApiErrorCode(err) === 'STOCK_DRAFT_EXISTS') onDraftsChanged();
      fail(err, "Couldn't save the stock entry draft.");
      return null;
    }
  }, [draft, target.product, rows, note, columns, components, applyDraft, onDraftsChanged, notify, fail]);

  const run = useCallback(async <T,>(kind: 'save' | 'submit' | 'delete', action: () => Promise<T>): Promise<T | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(kind);
    try {
      return await action();
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }, []);

  const save = useCallback(
    () =>
      run('save', async () => {
        const saved = await persist();
        if (saved) notify.success(`Draft saved: ${saved.completeUnits} of ${saved.quantity} units complete.`);
        return saved !== null;
      }),
    [run, persist, notify]
  );

  const submit = useCallback(
    () =>
      run('submit', async () => {
        // Unsaved rows are saved first, so what is submitted is what was checked
        const saved = dirty || !draft ? await persist() : draft;
        if (!saved) return false;
        try {
          const res = await stockDraftsApi.submit(saved.id, saved.version);
          if (!res.success) throw res;
          updateRememberedUnits(saved.productId, saved.units);
          notify.success(res.message || `${saved.quantity} unit${saved.quantity === 1 ? '' : 's'} of ${saved.productTitle} added to stock.`);
          onDraftsChanged();
          onSubmitted();
          return true;
        } catch (err: unknown) {
          fail(err, "Couldn't add the stock. The draft is kept.");
          return false;
        }
      }),
    [run, dirty, draft, persist, notify, onDraftsChanged, onSubmitted, fail]
  );

  const remove = useCallback(
    () =>
      run('delete', async () => {
        if (!draft) return true;
        try {
          const res = await stockDraftsApi.remove(draft.id);
          if (!res.success) throw res;
          notify.success(res.message || 'Stock entry draft deleted.');
          onDraftsChanged();
          return true;
        } catch (err: unknown) {
          notify.error(err, "Couldn't delete the stock entry draft.");
          return false;
        }
      }),
    [run, draft, notify, onDraftsChanged]
  );

  return {
    draft,
    productTitle: draft?.productTitle ?? target.product?.title ?? '',
    isLoading,
    loadFailed,
    components,
    columns,
    rows,
    edit,
    setQuantity,
    note,
    setNote: changeNote,
    dirty,
    busy,
    typedProblems: typed,
    serverErrors,
    completeRows,
    save,
    submit,
    remove,
  };
};
