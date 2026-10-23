/** Storefront order of products, as set by dragging rows in Products Management (mirrors the Ecommerce backend). */

/** The list with the item at `from` moved to `to` (the others shift by one). */
export const moveItem = <T,>(list: readonly T[], from: number, to: number): T[] => {
  const result = [...list];
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return result;
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
};

/**
 * Puts the products in `orderedIds` in that order, in the positions they already hold in `all`; every other product
 * keeps its place. Reordering one category (or a filtered list) therefore never moves the rest of the catalog.
 */
export const reorderInPlace = <T extends { id: number },>(all: readonly T[], orderedIds: readonly number[]): T[] => {
  const byId = new Map(all.map((item) => [item.id, item]));
  const ordered = orderedIds.map((id) => byId.get(id)).filter((item): item is T => item !== undefined);
  const moving = new Set(ordered.map((item) => item.id));
  let next = 0;
  return all.map((item) => (moving.has(item.id) ? ordered[next++] : item));
};
