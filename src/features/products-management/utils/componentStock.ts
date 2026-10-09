import { stockApi } from '../../stock-management/api/stockApi';
import type { StockResponse } from '../../stock-management/types/stock.types';
import type { ProductComponentResponse } from '../types/product.types';

/** Upper bound on rendered quantity options (keeps the select usable for huge stocks). */
export const MAX_QUANTITY_OPTIONS = 1000;

/**
 * Approximate available units per item from the stock list (active, approved entries with units
 * left). Used only to narrow the item picker; the exact figure comes from {@link fetchItemAvailableUnits}
 * (which also requires the purchase order to be delivered).
 */
export const availableUnitsByItem = (stocks: StockResponse[]): Map<number, number> => {
  const map = new Map<number, number>();
  for (const stock of stocks) {
    if (stock.isActive === false || stock.approvalStatus !== 'APPROVED' || !(Number(stock.availableUnits) > 0)) continue;
    map.set(stock.itemId, (map.get(stock.itemId) ?? 0) + Number(stock.availableUnits));
  }
  return map;
};

/** Exact consumable units for one item (GET /v1/stocks/items/{id}/availability). */
export const fetchItemAvailableUnits = async (itemId: number): Promise<number> => {
  const res = await stockApi.getItemAvailability(itemId);
  if (!res.success || !res.data) throw new Error(res.message || 'Failed to load item stock.');
  return Number(res.data.totalAvailableUnits) || 0;
};

/**
 * Largest whole quantity of an item one product unit may use.
 * `productStock` units will consume it (1 on create), and `alreadyUsedPerUnit` is what the saved
 * product already uses per unit — that stock is already allocated to the product, so it isn't
 * counted again.
 */
export const maxComponentQuantity = (availableUnits: number, productStock: number, alreadyUsedPerUnit = 0): number =>
  Math.max(0, Math.floor(alreadyUsedPerUnit + Math.max(0, availableUnits) / Math.max(1, productStock)));

/** 1…max (capped), always including the current value so a saved quantity still displays. */
export const quantityOptions = (max: number, current?: string): string[] => {
  const options = Array.from({ length: Math.min(max, MAX_QUANTITY_OPTIONS) }, (_, i) => String(i + 1));
  if (current && !options.includes(current)) options.push(current);
  return options;
};

export interface CapacityLine {
  itemId: number;
  itemName: string;
  perUnit: number;
  available: number;
  /** How many more products this item allows. */
  maxProducts: number;
}

export interface ComponentCapacity {
  /** How many product units can be added with the current item stock (null when the product has no components). */
  maxAddable: number | null;
  lines: CapacityLine[];
}

/** For "Add stock": each added product unit uses `perUnit` of every component item. */
export const loadComponentCapacity = async (components: ProductComponentResponse[]): Promise<ComponentCapacity> => {
  if (components.length === 0) return { maxAddable: null, lines: [] };
  const lines = await Promise.all(
    components.map(async (c) => {
      const available = await fetchItemAvailableUnits(c.itemId);
      const perUnit = Number(c.quantity);
      return { itemId: c.itemId, itemName: c.itemName, perUnit, available, maxProducts: perUnit > 0 ? Math.floor(available / perUnit) : 0 };
    })
  );
  return { maxAddable: Math.min(...lines.map((line) => line.maxProducts)), lines };
};

/** "Motherboard (4 available, 2 per product)" for the item that limits additions the most. */
export const describeLimitingComponent = (lines: CapacityLine[]): string | null => {
  if (lines.length === 0) return null;
  const limiting = lines.reduce((min, line) => (line.maxProducts < min.maxProducts ? line : min));
  return `${limiting.itemName} (${limiting.available} available, ${limiting.perUnit} per product)`;
};

/** Row limit used by both the quantity select and validation (null until the item's stock is known). */
export const componentMaxFor =
  (productStock: number, savedPerUnit: Map<number, number>) =>
  (row: { itemId: number | null; availableUnits: number | null }): number | null =>
    row.itemId === null || row.availableUnits === null
      ? null
      : maxComponentQuantity(row.availableUnits, productStock, savedPerUnit.get(row.itemId) ?? 0);
