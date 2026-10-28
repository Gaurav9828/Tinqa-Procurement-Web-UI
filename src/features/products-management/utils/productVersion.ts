import type { ProductResponse } from '../types/product.types';

/**
 * Drafts and versions (Ecommerce BE):
 *  - A draft is saved but not finished: only title and category are needed, it holds no stock and isn't sent for
 *    approval. Submitting it checks every field, builds its first unit (barcodes scanned) and sends it to approval.
 *  - Once a product has been sold (it is on an order), its components never change: past orders, warranties and costs
 *    depend on them. A new version is made instead — a draft copy, Version N+1, whose components can change. Turning
 *    the new version on turns the old one off.
 */

type VersionFields = Pick<ProductResponse, 'id' | 'title' | 'draft' | 'versionNumber' | 'previousVersionId' | 'sold'>;

/** "v1", "v2"… */
export const versionLabel = (product: Pick<ProductResponse, 'versionNumber'>): string => `v${product.versionNumber}`;

/** The version made from this product, if any (only one is allowed). */
export const nextVersionOf = <T extends VersionFields>(product: VersionFields, all: readonly T[]): T | null =>
  all.find((other) => other.previousVersionId === product.id) ?? null;

/**
 * The number the server gives the next version: one more than the newest version reachable from this product (each
 * product has at most one newer version, so the chain only goes forward).
 */
export const nextVersionNumber = (product: VersionFields, all: readonly VersionFields[]): number => {
  let newest = product;
  const seen = new Set<number>([product.id]);
  for (let next = nextVersionOf(newest, all); next && !seen.has(next.id); next = nextVersionOf(newest, all)) {
    seen.add(next.id);
    newest = next;
  }
  return Math.max(product.versionNumber, newest.versionNumber) + 1;
};

/** Why a new version can't be made from this product, or null when it can. */
export const newVersionBlockedReason = (product: VersionFields, all: readonly VersionFields[]): string | null => {
  if (product.draft) return 'This is a draft: edit it directly instead of making a new version.';
  const next = nextVersionOf(product, all);
  if (next) return `${versionLabel(next)} of this product already exists (#${next.id}${next.draft ? ', draft' : ''}). Edit that one instead.`;
  return null;
};

/** Shown when the components of a sold product are changed (the backend refuses it with PRODUCT_SOLD_COMPONENTS_LOCKED). */
export const soldComponentsLockedMessage = (product: VersionFields, all: readonly VersionFields[]): string =>
  `${product.title} has already been sold, so its components can't change — past orders, warranties and costs depend on them. ` +
  `Create Version ${nextVersionNumber(product, all)} of the product and change the components there.`;

/**
 * What changing the components of a saved product means (same rules as the backend):
 *  - free:     nothing is built from them yet — no stock, or a rejected product whose pieces were already returned
 *              (its units are scanned again with the new components when it is resubmitted);
 *  - rebuild:  an unsold, switched-off product with 1 unit: that unit is taken apart (its pieces go back to item stock)
 *              and built again with the new components, so its new barcodes are scanned in the same save;
 *  - sold:     on an order — locked for good, a new version is made instead;
 *  - onSale:   switched on with units in stock — switch it off first;
 *  - tooMany:  more than 1 unit in stock — reduce the stock to 1 (or 0) first.
 */
export type ComponentChange = 'none' | 'free' | 'rebuild' | 'sold' | 'onSale' | 'tooMany';

export const componentChange = (
  product: Pick<ProductResponse, 'sold' | 'stockQuantity' | 'enabled'>,
  billChanged: boolean,
  /** The product's units were withdrawn and their pieces returned (a rejected product). */
  unitsReleased: boolean
): ComponentChange => {
  if (!billChanged) return 'none';
  if (product.sold) return 'sold';
  if (product.stockQuantity <= 0) return 'free';
  if (product.enabled) return 'onSale';
  if (unitsReleased) return 'free';
  return product.stockQuantity === 1 ? 'rebuild' : 'tooMany';
};

/** The change can't be saved. */
export const componentChangeBlocked = (change: ComponentChange) => change === 'sold' || change === 'onSale' || change === 'tooMany';
