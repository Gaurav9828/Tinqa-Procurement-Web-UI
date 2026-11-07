/**
 * A new price other than the item's existing price (MRP) needs a reason. Without an existing price there is nothing
 * to justify; an empty new price means quoting the existing one. The server enforces the same rule.
 */
export const isPriceChanged = (existingPrice: number, newPrice: string): boolean =>
  newPrice.trim() !== '' && existingPrice > 0 && Number(newPrice) !== existingPrice;

export interface PriceDifference {
  /** quoted − base, in rupees (negative when cheaper) */
  amount: number;
  /** the difference as a percentage of the base, rounded to 2 places */
  percent: number;
}

/** How far a quoted unit price is from a base price (the item's MRP or the last quoted price). */
export const priceDifference = (base: number, quoted: number): PriceDifference | null => {
  if (!Number.isFinite(base) || !Number.isFinite(quoted) || base <= 0 || base === quoted) return null;
  const amount = Math.round((quoted - base) * 100) / 100;
  return { amount, percent: Math.round((amount / base) * 10_000) / 100 };
};

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * What approvers compare a quotation's unit price with, as the server keeps it in additionalInfo: the item's MRP
 * (`mrp`, kept only when the price differs from it), the price quoted before the latest change (`previousUnitPrice`)
 * and the reason (`priceChangeReason`). Null when the quotation is at the item's price and was never re-priced.
 */
export interface PriceNote {
  itemPrice: number | null;
  previousPrice: number | null;
  reason: string | null;
}

export const readPriceNote = (info: Record<string, unknown> | null | undefined, unitPrice: number | null | undefined): PriceNote | null => {
  if (!info || unitPrice === null || unitPrice === undefined) return null;
  const itemPrice = asNumber(info.mrp);
  const previousPrice = asNumber(info.previousUnitPrice);
  const reason = typeof info.priceChangeReason === 'string' && info.priceChangeReason.trim() ? info.priceChangeReason.trim() : null;
  const offItemPrice = itemPrice !== null && itemPrice !== Number(unitPrice);
  const repriced = previousPrice !== null && previousPrice !== Number(unitPrice);
  if (!offItemPrice && !repriced && !reason) return null;
  return { itemPrice: offItemPrice ? itemPrice : null, previousPrice: repriced ? previousPrice : null, reason };
};
