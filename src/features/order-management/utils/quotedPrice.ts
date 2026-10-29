/**
 * A new price other than the item's existing price (MRP) needs a reason. Without an existing price there is nothing
 * to justify; an empty new price means quoting the existing one. The server enforces the same rule.
 */
export const isPriceChanged = (existingPrice: number, newPrice: string): boolean =>
  newPrice.trim() !== '' && existingPrice > 0 && Number(newPrice) !== existingPrice;
