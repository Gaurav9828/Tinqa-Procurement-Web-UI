import React, { useEffect, useId, useMemo, useRef } from 'react';
import { Boxes, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useItemOptions, useStockOptions } from '../../../hooks/useLookupOptions';
import { itemApi } from '../../item-management/api/itemApi';
import { getApiErrorMessage } from '../../../utils/apiError';
import {
  componentErrorKey,
  emptyComponentRow,
  errorsForComponent,
  snapshotItemWarranties,
  type ComponentFormRow,
} from '../utils/componentForm';
import { availableUnitsByItem, componentMaxFor, fetchItemAvailableUnits, quantityOptions } from '../utils/componentStock';

interface Props {
  rows: ComponentFormRow[];
  /** State setter (functional updates are used so async warranty loads apply to the latest rows). */
  setRows: React.Dispatch<React.SetStateAction<ComponentFormRow[]>>;
  /** Keyed like the backend: `components[i].<field>`. */
  errors: Record<string, string>;
  /** Clear the given error keys, or all component errors when rows were added/removed. */
  onClearErrors: (keys: string[] | 'all') => void;
  /** Product units that will use each component: 1 on create, the current stock on edit. */
  productStock: number;
  /** Per-unit quantity the saved product already uses, by item id (edit only; already allocated stock). */
  savedPerUnit?: Map<number, number>;
  disabled?: boolean;
}

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white ${
    hasError ? 'border-rose-500' : 'border-black/10 dark:border-white/10'
  }`;

/**
 * Items (from Procurement) the product is built from. Picking an item copies its active warranties
 * onto the row as component-level warranties, grouped under that item; removing or changing the
 * item drops them. Separate from the product's overall warranties.
 */
const NO_SAVED = new Map<number, number>();

export const ProductComponentsSection: React.FC<Props> = ({ rows, setRows, errors, onClearErrors, productStock, savedPerUnit = NO_SAVED, disabled }) => {
  const baseId = useId();
  const { options: items, isLoading: itemsLoading } = useItemOptions();
  const { options: stocks, isLoading: stocksLoading } = useStockOptions();
  const stockByItem = useMemo(() => availableUnitsByItem(stocks), [stocks]);
  const maxFor = componentMaxFor(productStock, savedPerUnit);
  const pickerLoading = (itemsLoading && items.length === 0) || (stocksLoading && stocks.length === 0);

  const patchRow = (uid: string, patch: Partial<ComponentFormRow> | ((row: ComponentFormRow) => Partial<ComponentFormRow>)) =>
    setRows((prev) => prev.map((row) => (row.uid === uid ? { ...row, ...(typeof patch === 'function' ? patch(row) : patch) } : row)));

  /**
   * Fetches the item's warranties (GET /items/{id}/warranties) and its exact stock
   * (GET /stocks/items/{id}/availability) together; the row is usable once both are in.
   */
  const loadItemDetails = (uid: string, itemId: number, requestId: number) => {
    Promise.all([itemApi.getItemWarranties(itemId), fetchItemAvailableUnits(itemId)])
      .then(([res, availableUnits]) => {
        if (!res.success) throw new Error(res.message || 'Failed to load item warranties.');
        patchRow(uid, (row) =>
          row.requestId === requestId ? { status: 'ready', error: undefined, warranties: snapshotItemWarranties(res.data), availableUnits } : {}
        );
      })
      .catch((err: unknown) => {
        patchRow(uid, (row) =>
          row.requestId === requestId ? { status: 'error', warranties: [], error: getApiErrorMessage(err, 'Failed to load item details.') } : {}
        );
      });
  };

  // Saved rows (edit) keep their warranty snapshot but still need the item's current stock for the quantity limit.
  const availabilityRequested = useRef(new Set<string>());
  useEffect(() => {
    for (const row of rows) {
      if (row.itemId === null || row.status !== 'ready' || row.availableUnits !== null || availabilityRequested.current.has(row.uid)) continue;
      availabilityRequested.current.add(row.uid);
      const { uid, itemId, requestId } = row;
      fetchItemAvailableUnits(itemId)
        .then((availableUnits) => patchRow(uid, (r) => (r.requestId === requestId ? { availableUnits } : {})))
        .catch((err: unknown) =>
          patchRow(uid, (r) => (r.requestId === requestId ? { status: 'error', error: getApiErrorMessage(err, 'Failed to load item stock.') } : {}))
        );
    }
    // patchRow only wraps the stable setRows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const selectItem = (index: number, row: ComponentFormRow, value: string) => {
    onClearErrors([componentErrorKey(index), componentErrorKey(index, 'itemId')]);
    if (!value) {
      patchRow(row.uid, { itemId: null, itemName: '', itemSku: '', warranties: [], status: 'empty', requestId: row.requestId + 1 });
      return;
    }
    const item = items.find((option) => option.id === Number(value));
    if (!item) return;
    const requestId = row.requestId + 1;
    // The previous item's warranties are dropped immediately; the new item's replace them once loaded.
    patchRow(row.uid, {
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku ?? '',
      quantity: '1',
      warranties: [],
      availableUnits: null,
      status: 'loading',
      error: undefined,
      requestId,
      copiesToProduct: true,
    });
    onClearErrors([componentErrorKey(index, 'quantity')]);
    loadItemDetails(row.uid, item.id, requestId);
  };

  const refresh = (index: number, row: ComponentFormRow) => {
    if (row.itemId === null) return;
    onClearErrors([componentErrorKey(index)]);
    const requestId = row.requestId + 1;
    patchRow(row.uid, { status: 'loading', error: undefined, availableUnits: null, requestId });
    loadItemDetails(row.uid, row.itemId, requestId);
  };

  const add = () => {
    setRows((prev) => [...prev, emptyComponentRow()]);
    onClearErrors('all');
  };
  const remove = (uid: string) => {
    setRows((prev) => prev.filter((row) => row.uid !== uid));
    onClearErrors('all');
  };

  const usedItemIds = new Set(rows.map((row) => row.itemId).filter((id): id is number => id !== null));
  const totalWarranties = rows.reduce((sum, row) => sum + row.warranties.length, 0);

  return (
    <div className="space-y-3 pt-2 border-t border-black/10 dark:border-white/10" role="group" aria-label="Components">
      <div>
        <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
          <Boxes className="w-3.5 h-3.5 text-[#0071e3]" /> Components & item warranties
        </span>
        <p className="text-gray-400 mt-0.5">
          Items this product is built from. Each item's active warranties are added automatically: kept with the component, and copied into
          the product warranties below (marked with the item's name).
        </p>
      </div>

      {rows.length === 0 && <p className="text-gray-400 italic">No components added.</p>}

      {rows.map((row, index) => {
        const rowErrors = errorsForComponent(errors, index);
        const nestedErrors = Object.entries(rowErrors).filter(([field]) => !['', 'itemId', 'quantity'].includes(field));
        const id = (field: string) => `${baseId}-${index}-${field}`;
        const selected = row.itemId !== null ? items.find((option) => option.id === row.itemId) : undefined;
        // Only active items with stock are offered; a row's current item stays listed so it still displays.
        const choices = items.filter((option) => option.id === row.itemId || (option.isActive && (stockByItem.get(option.id) ?? 0) > 0));
        const max = maxFor(row);
        return (
          <div
            key={row.uid}
            role="group"
            aria-label={`Component ${index + 1}`}
            className={`p-3 rounded-xl border space-y-3 ${rowErrors[''] || nestedErrors.length ? 'border-rose-500/40' : 'border-black/10 dark:border-white/10'}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <div className="flex-1 min-w-0">
                <label htmlFor={id('item')} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item *
                </label>
                <select
                  id={id('item')}
                  value={row.itemId ?? ''}
                  disabled={disabled || pickerLoading}
                  aria-invalid={!!rowErrors.itemId}
                  onChange={(e) => selectItem(index, row, e.target.value)}
                  className={inputClass(!!rowErrors.itemId)}
                >
                  <option value="">{pickerLoading ? 'Loading items…' : choices.length === 0 ? 'No items in stock' : 'Select an item…'}</option>
                  {row.itemId !== null && !choices.some((option) => option.id === row.itemId) && (
                    <option value={row.itemId}>{row.itemName}{row.itemSku ? ` (${row.itemSku})` : ''}</option>
                  )}
                  {choices.map((option) => (
                    <option key={option.id} value={option.id} disabled={option.id !== row.itemId && usedItemIds.has(option.id)}>
                      {option.name}
                      {option.sku ? ` (${option.sku})` : ''}
                      {stockByItem.has(option.id) ? ` — ${stockByItem.get(option.id)} in stock` : ''}
                    </option>
                  ))}
                </select>
                {rowErrors.itemId && <p role="alert" className="mt-1 text-rose-500">{rowErrors.itemId}</p>}
              </div>
              <div className="sm:w-40">
                <label htmlFor={id('quantity')} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Qty per product *{selected?.unitOfMeasure ? <span className="text-gray-400 font-normal"> ({selected.unitOfMeasure})</span> : null}
                </label>
                <select
                  id={id('quantity')}
                  value={row.quantity}
                  // Bounded by the item's stock: no value above what is available can be chosen.
                  disabled={disabled || row.itemId === null || row.status !== 'ready' || max === null || max < 1}
                  aria-invalid={!!rowErrors.quantity}
                  onChange={(e) => {
                    patchRow(row.uid, { quantity: e.target.value });
                    onClearErrors([componentErrorKey(index, 'quantity')]);
                  }}
                  className={inputClass(!!rowErrors.quantity)}
                >
                  {(max === null ? [row.quantity] : quantityOptions(max, row.quantity)).map((value) => (
                    <option key={value} value={value} disabled={max !== null && Number(value) > max}>
                      {value}
                    </option>
                  ))}
                </select>
                {row.itemId !== null && row.status === 'ready' && (
                  <p className="mt-1 text-[11px] text-gray-500" data-testid="component-stock">
                    {row.availableUnits === null ? 'Checking stock…' : max !== null && max < 1 ? 'Out of stock' : `Max ${max} (${row.availableUnits} in stock)`}
                  </p>
                )}
                {rowErrors.quantity && <p role="alert" className="mt-1 text-rose-500">{rowErrors.quantity}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(row.uid)}
                disabled={disabled}
                aria-label={`Remove component ${index + 1}`}
                title="Remove component and its warranties"
                className="self-end sm:mt-6 p-2 text-gray-400 hover:text-rose-500 rounded-xl cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Item warranties are listed in the product Warranties section; this row only shows load status. */}
            {row.itemId !== null && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]" data-testid="component-status">
                {row.status === 'loading' ? (
                  <span className="flex items-center gap-1.5 text-gray-500" role="status">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading item details…
                  </span>
                ) : row.status === 'error' ? (
                  <span className="text-rose-500">{row.error}</span>
                ) : (
                  <span className="text-gray-500">
                    {row.warranties.length === 0
                      ? 'This item has no active warranties.'
                      : `${row.warranties.length} item ${row.warranties.length === 1 ? 'warranty' : 'warranties'}${
                          row.copiesToProduct ? ' added to the product warranties below' : ' saved with this component'
                        }`}
                  </span>
                )}
                {row.status !== 'loading' && (
                  <button
                    type="button"
                    onClick={() => refresh(index, row)}
                    disabled={disabled}
                    className="flex items-center gap-1 text-[#0071e3] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> {row.status === 'error' ? 'Retry' : 'Refresh from item'}
                  </button>
                )}
              </div>
            )}

            {rowErrors[''] && row.status !== 'error' && <p role="alert" className="text-rose-500">{rowErrors['']}</p>}
            {nestedErrors.map(([field, message]) => (
              <p key={field} role="alert" className="text-rose-500">
                {message}
              </p>
            ))}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="flex items-center gap-1.5 text-[#0071e3] hover:underline font-medium cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Add Component
        </button>
        {rows.length > 0 && (
          <span className="text-gray-400" data-testid="component-warranty-total">
            {rows.length} {rows.length === 1 ? 'item' : 'items'} · {totalWarranties} component {totalWarranties === 1 ? 'warranty' : 'warranties'}
          </span>
        )}
      </div>
    </div>
  );
};
