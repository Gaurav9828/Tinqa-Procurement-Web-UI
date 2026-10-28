import type { ItemWarrantyResponse } from '../../item-management/types/item.types';
import type { ComponentWarrantySnapshot, ProductComponentRequest, ProductComponentResponse } from '../types/product.types';
import { costAmountError, parseCostAmount } from './productCosting';

/**
 * One component row in the product form. `status` tracks the item-warranty fetch:
 * 'ready' rows can be saved; 'loading' / 'error' rows block saving (the snapshot would be wrong).
 */
export interface ComponentFormRow {
  uid: string;
  itemId: number | null;
  itemName: string;
  itemSku: string;
  quantity: string;
  warranties: ComponentWarrantySnapshot[];
  status: 'empty' | 'loading' | 'ready' | 'error';
  error?: string;
  /** Exact consumable units of the item (null until loaded). Bounds the quantity select. */
  availableUnits: number | null;
  /** Increments per fetch so a slow response for a previously selected item is ignored. */
  requestId: number;
  /**
   * The item's warranties are also copied into the product's own warranties (new rows and rows whose
   * item was changed). Saved rows don't: their copies were already saved as product warranties.
   */
  copiesToProduct: boolean;
  /** Cost of one unit of the item excluding GST, as typed ('' = not entered). Only shown to PRODUCT_COST_VIEW holders. */
  unitCost: string;
  /** Where the suggested cost came from (Procurement purchase prices); '' when none was looked up. */
  costHint: string;
}

/** Item id → unit cost saved on the product (from its cost sheet). */
export type SavedUnitCosts = Map<number, number | null>;

let uidCounter = 0;
const nextUid = () => `component-${++uidCounter}`;

export const emptyComponentRow = (): ComponentFormRow => ({
  uid: nextUid(),
  itemId: null,
  itemName: '',
  itemSku: '',
  quantity: '1',
  warranties: [],
  status: 'empty',
  availableUnits: null,
  requestId: 0,
  copiesToProduct: true,
  unitCost: '',
  costHint: '',
});

const stripId = ({ sourceWarrantyId, warrantyType, title, durationValue, durationUnit, provider, coverage, exclusions, termsAndConditions }: ComponentWarrantySnapshot): ComponentWarrantySnapshot => ({
  sourceWarrantyId: sourceWarrantyId ?? null,
  warrantyType,
  title,
  durationValue,
  durationUnit,
  provider: provider ?? null,
  coverage: coverage ?? null,
  exclusions: exclusions ?? null,
  termsAndConditions: termsAndConditions ?? null,
});

const formatCost = (cost: number | null | undefined) => (cost === null || cost === undefined ? '' : Number(cost).toFixed(2));

/**
 * Saved components → rows (their stored snapshot is kept as-is unless the admin refreshes it). `costs` fills in the
 * unit costs saved on the product, when the user may see them.
 */
export const toComponentRows = (components: ProductComponentResponse[] | null | undefined, costs?: SavedUnitCosts): ComponentFormRow[] =>
  (components ?? []).map((c) => ({
    uid: nextUid(),
    itemId: c.itemId,
    itemName: c.itemName,
    itemSku: c.itemSku ?? '',
    quantity: String(c.quantity),
    warranties: (c.warranties ?? []).map(stripId),
    status: 'ready',
    availableUnits: null,
    requestId: 0,
    copiesToProduct: false,
    unitCost: formatCost(costs?.get(c.itemId)),
    costHint: '',
  }));

/** An item's current warranties → the copy stored with the product. Inactive item warranties are not carried over. */
export const snapshotItemWarranties = (warranties: ItemWarrantyResponse[] | null | undefined): ComponentWarrantySnapshot[] =>
  (warranties ?? [])
    .filter((w) => w.isActive !== false)
    .map((w) =>
      stripId({
        sourceWarrantyId: w.id,
        warrantyType: w.warrantyType,
        title: w.title,
        durationValue: w.durationValue,
        durationUnit: w.durationUnit,
        provider: w.provider,
        coverage: w.coverage,
        exclusions: w.exclusions,
        termsAndConditions: w.termsAndConditions,
      })
    );

const QUANTITY_PATTERN = /^\d{1,11}(\.\d{1,3})?$/;

export const parseComponentQuantity = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!QUANTITY_PATTERN.test(trimmed)) return null;
  const value = Number(trimmed);
  return value > 0 ? value : null;
};

/** `components[i].unitCost` errors for costs typed in a wrong format (a blank cost is allowed). */
const unitCostErrors = (rows: ComponentFormRow[]): Record<string, string> =>
  Object.fromEntries(
    rows.flatMap((row, i) => {
      const error = costAmountError(row.unitCost);
      return error ? [[componentErrorKey(i, 'unitCost'), error]] : [];
    })
  );

export const componentErrorKey = (index: number, field?: string) => (field ? `components[${index}].${field}` : `components[${index}]`);

/**
 * Same key format as the backend's field errors, e.g. `components[0].quantity`.
 * `maxFor` returns the stock limit for a row's quantity (null when not known yet).
 */
export const validateComponentRows = (
  rows: ComponentFormRow[],
  maxFor: (row: ComponentFormRow) => number | null = () => null
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const seen = new Set<number>();
  rows.forEach((row, i) => {
    if (row.itemId === null) errors[componentErrorKey(i, 'itemId')] = 'Select an item.';
    else if (seen.has(row.itemId)) errors[componentErrorKey(i, 'itemId')] = 'This item is already listed.';
    else seen.add(row.itemId);

    if (!row.quantity.trim()) errors[componentErrorKey(i, 'quantity')] = 'Quantity is required.';
    else if (parseComponentQuantity(row.quantity) === null) {
      errors[componentErrorKey(i, 'quantity')] = 'Quantity must be greater than 0 with at most 3 decimal places.';
    } else if (row.itemId !== null && row.status === 'ready') {
      const max = maxFor(row);
      if (max !== null && max < 1) errors[componentErrorKey(i, 'quantity')] = 'This item is out of stock.';
      else if (max !== null && Number(row.quantity) > max) errors[componentErrorKey(i, 'quantity')] = `Only ${max} available for this item.`;
    }

    if (row.itemId !== null && row.status === 'loading') errors[componentErrorKey(i)] = 'Still loading this item’s details.';
    if (row.status === 'error') errors[componentErrorKey(i)] = 'Couldn’t load this item’s details. Retry or remove the item.';
  });
  return { ...errors, ...unitCostErrors(rows) };
};

/**
 * Rows → request. `withCosts` (PRODUCT_COST_EDIT) adds each entered unit cost; a row without one keeps the cost its
 * item already has on the product.
 */
export const toComponentRequests = (rows: ComponentFormRow[], withCosts = false): ProductComponentRequest[] =>
  rows.map((row) => {
    const unitCost = withCosts ? parseCostAmount(row.unitCost) : null;
    return {
      itemId: row.itemId as number,
      itemName: row.itemName.trim(),
      ...(row.itemSku.trim() ? { itemSku: row.itemSku.trim() } : {}),
      quantity: parseComponentQuantity(row.quantity) as number,
      warranties: row.warranties.map(stripId),
      ...(unitCost !== null ? { unitCost } : {}),
    };
  });

const normalise = (c: { itemId: number | null; quantity: number | string; warranties: ComponentWarrantySnapshot[] }) =>
  JSON.stringify([c.itemId, Number(c.quantity), c.warranties.map(stripId)]);

/** A row's cost differs from the one saved for its item (only checked when the saved costs are known). */
const costChanged = (row: ComponentFormRow, costs: SavedUnitCosts | undefined): boolean => {
  if (!costs || row.itemId === null) return false;
  const saved = costs.get(row.itemId);
  const typed = parseCostAmount(row.unitCost);
  return (saved ?? null) === null ? typed !== null : typed !== null && typed !== Number(saved);
};

export const componentsChanged = (original: ProductComponentResponse[], rows: ComponentFormRow[], costs?: SavedUnitCosts): boolean =>
  original.length !== rows.length ||
  original.some((c, i) => normalise(c) !== normalise(rows[i])) ||
  rows.some((row) => costChanged(row, costs));

/**
 * Whether the bill of materials (which items, how many of each per unit) differs. Costs and warranty snapshots don't
 * count: they can change while units are in stock, the pieces inside them can't.
 */
export const billOfMaterialsChanged = (original: ProductComponentResponse[], rows: ComponentFormRow[]): boolean => {
  const before = new Map(original.map((c) => [c.itemId, Number(c.quantity)]));
  return (
    original.length !== rows.length ||
    rows.some((row) => row.itemId === null || before.get(row.itemId) !== Number(row.quantity))
  );
};

/** What saving will do to the components — shown on the edit review. */
export const describeComponentChanges = (original: ProductComponentResponse[], rows: ComponentFormRow[], costs?: SavedUnitCosts): string[] => {
  const before = new Map(original.map((c) => [c.itemId, c]));
  const kept = new Set(rows.map((r) => r.itemId));
  const lines: string[] = [];
  rows.forEach((row) => {
    const name = row.itemName || 'Item';
    const prev = row.itemId !== null ? before.get(row.itemId) : undefined;
    const count = `${row.warranties.length} ${row.warranties.length === 1 ? 'warranty' : 'warranties'}`;
    if (!prev) {
      lines.push(`Add ${name} × ${row.quantity} (${count})`);
      return;
    }
    const parts: string[] = [];
    if (Number(prev.quantity) !== Number(row.quantity)) parts.push(`quantity ${prev.quantity} → ${row.quantity}`);
    if (JSON.stringify(prev.warranties.map(stripId)) !== JSON.stringify(row.warranties.map(stripId))) parts.push(`warranties refreshed (${count})`);
    if (costChanged(row, costs)) parts.push(`unit cost ${formatCost(costs?.get(row.itemId as number)) || 'not set'} → ${row.unitCost.trim()}`);
    if (parts.length) lines.push(`Update ${name}: ${parts.join(', ')}`);
  });
  original.filter((c) => !kept.has(c.itemId)).forEach((c) => lines.push(`Remove ${c.itemName} and its warranties`));
  return lines;
};

export const summarizeComponents = (list: { itemName: string; quantity: number | string; warranties: unknown[] }[]): string =>
  list.length ? list.map((c) => `${c.itemName} × ${c.quantity} (${c.warranties.length} ${c.warranties.length === 1 ? 'warranty' : 'warranties'})`).join('; ') : 'None';

/** Clears the given keys, or every component error when rows were added/removed (indexes shift). */
export const dropComponentErrors = (errors: Record<string, string>, edited: string[] | 'all'): Record<string, string> =>
  Object.fromEntries(
    Object.entries(errors).filter(([key]) => (edited === 'all' ? !key.startsWith('components') : !edited.some((k) => key === k)))
  );

/** Errors for row `index` (field → message; row-level under ''). */
export const errorsForComponent = (errors: Record<string, string>, index: number): Record<string, string> => {
  const prefix = componentErrorKey(index);
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([key]) => key === prefix || key.startsWith(`${prefix}.`))
      .map(([key, message]) => [key === prefix ? '' : key.slice(prefix.length + 1), message])
  );
};
