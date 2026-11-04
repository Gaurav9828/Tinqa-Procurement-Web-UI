import type { ProductResponse } from '../types/product.types';

/**
 * Model names, versions and drafts (Ecommerce BE):
 *  - Products sharing a name (ignoring case and outer spaces) are versions of one product: v0.1 … v0.9, v1.0, v1.1 …
 *    The server numbers them (`versionNumber` in tenths: 1 = v0.1, 10 = v1.0), one more than the name's highest.
 *  - Every version has its own model name, unique ignoring case. It is required to create or submit a product; a draft
 *    may wait for it.
 *  - A new version can be adapted from any version of any product: its values fill the create form and it records
 *    that version (`previousVersionId`), which is turned off when the new one is turned on.
 *  - A draft is saved but not finished: only title and category are needed, it holds no stock and isn't sent for
 *    approval. Submitting it checks every field, builds its first unit (barcodes scanned) and sends it to approval.
 *  - Once a product has been sold (it is on an order), its components never change: past orders, warranties and costs
 *    depend on them. A new version is made instead — a draft copy whose components can change.
 */

type VersionFields = Pick<ProductResponse, 'id' | 'title' | 'draft' | 'versionNumber' | 'previousVersionId' | 'sold'>;
/** What numbering versions by name needs. */
type NamedVersion = Pick<ProductResponse, 'id' | 'title' | 'versionNumber'>;

/** Ecommerce BE limit for a model name (ProductRequestDTO). */
export const MODEL_NAME_MAX = 100;

/** "v0.1" for 1, "v1.0" for 10, "v1.2" for 12. */
export const formatVersion = (versionNumber: number): string => `v${Math.floor(versionNumber / 10)}.${versionNumber % 10}`;

export const versionLabel = (product: Pick<ProductResponse, 'versionNumber'>): string => formatVersion(product.versionNumber);

/** The key the versions of one product share: the same as the server's lower(btrim(title)). */
export const nameKey = (title: string): string => title.trim().toLowerCase();

/**
 * The version number the server gives a product saved under this name: one more than the name's highest (1 = v0.1 for a
 * new name). `exceptId`: the product being edited, which doesn't count against itself.
 */
export const nextVersionNumberOfName = (title: string, all: readonly NamedVersion[], exceptId?: number): number => {
  const key = nameKey(title);
  if (!key) return 1;
  return all.reduce((highest, other) => (other.id !== exceptId && nameKey(other.title) === key ? Math.max(highest, other.versionNumber) : highest), 0) + 1;
};

/** The versions adapted or copied from this product, oldest first. */
export const newerVersionsOf = <T extends VersionFields>(product: VersionFields, all: readonly T[]): T[] =>
  all.filter((other) => other.previousVersionId === product.id).sort((a, b) => a.versionNumber - b.versionNumber);

/** Why a new version can't be copied from this product, or null when it can. */
export const newVersionBlockedReason = (product: VersionFields, all: readonly VersionFields[]): string | null => {
  if (product.draft) return 'This is a draft: edit it directly instead of making a new version.';
  const waiting = newerVersionsOf(product, all).find((other) => other.draft);
  if (waiting) return `${versionLabel(waiting)} (#${waiting.id}), copied from this version, is still a draft. Finish that one first.`;
  return null;
};

/** Shown when the components of a sold product are changed (the backend refuses it with PRODUCT_SOLD_COMPONENTS_LOCKED). */
export const soldComponentsLockedMessage = (product: VersionFields, all: readonly VersionFields[]): string =>
  `${product.title} has already been sold, so its components can't change — past orders, warranties and costs depend on them. ` +
  `Create ${formatVersion(nextVersionNumberOfName(product.title, all))} of the product and change the components there.`;

/** The product already holding this model name (ignoring case), other than `exceptId`; null when it is free. */
export const modelNameHolder = <T extends Pick<ProductResponse, 'id' | 'modelName'>>(modelName: string, all: readonly T[], exceptId?: number): T | null => {
  const key = modelName.trim().toLowerCase();
  if (!key) return null;
  return all.find((other) => other.id !== exceptId && (other.modelName ?? '').trim().toLowerCase() === key) ?? null;
};

/** Problem with a model name as typed, or null. `required`: creating or submitting (a draft may leave it empty). */
export const modelNameError = (
  modelName: string,
  all: readonly Pick<ProductResponse, 'id' | 'title' | 'versionNumber' | 'modelName'>[],
  required: boolean,
  exceptId?: number
): string | null => {
  const trimmed = modelName.trim();
  if (!trimmed) return required ? 'Model name is required.' : null;
  if (trimmed.length > MODEL_NAME_MAX) return `Model name cannot exceed ${MODEL_NAME_MAX} characters.`;
  const holder = modelNameHolder(trimmed, all, exceptId);
  return holder ? `${trimmed} is already the model name of ${holder.title} ${versionLabel(holder)} (#${holder.id}). Each version needs its own.` : null;
};

/**
 * The versions to adapt a new product from, for what is typed in the title: products whose name or model name contains
 * it (ignoring case), grouped by name with the newest version first.
 */
export const matchVersions = <T extends Pick<ProductResponse, 'id' | 'title' | 'versionNumber' | 'modelName'>>(query: string, all: readonly T[], limit = 8): T[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return all
    .filter((product) => product.title.toLowerCase().includes(q) || (product.modelName ?? '').toLowerCase().includes(q))
    .sort((a, b) => nameKey(a.title).localeCompare(nameKey(b.title)) || b.versionNumber - a.versionNumber)
    .slice(0, limit);
};

/**
 * "Model RX-200 · Version v0.2": written at the bottom of the description, on the storefront too (TinQa_Ecommerce_FE
 * productModelLine). Null without a model name.
 */
export const modelLine = (modelName: string | null | undefined, versionNumber: number): string | null =>
  modelName?.trim() ? `Model ${modelName.trim()} · Version ${formatVersion(versionNumber)}` : null;

/**
 * The version a product of this title has or gets when saved. A saved product (or draft) keeps its version unless it is
 * renamed; then, like a new product, it gets the next one of its new name.
 */
export const versionNumberFor = (
  title: string,
  all: readonly NamedVersion[],
  saved: NamedVersion | null
): number => (saved && nameKey(title) === nameKey(saved.title) ? saved.versionNumber : nextVersionNumberOfName(title, all, saved?.id));

/** Explains the version shown next to the model name. `saved`: the product being edited or finished, if any. */
export const versionHintFor = (title: string, versionNumber: number, saved: Pick<ProductResponse, 'title'> | null): string => {
  const name = title.trim();
  if (!name) return 'Given when saved: v0.1 for a new product name, the next version for an existing one.';
  if (saved && nameKey(name) !== nameKey(saved.title)) return `Renamed: it becomes the newest version of ${name} when saved.`;
  if (saved) return `Version of ${name}.`;
  return versionNumber === 1 ? `Given when saved: the first version of ${name}.` : `Given when saved: the next version of ${name}.`;
};

/** The form's errors without the model name's (cleared as soon as it is retyped). */
export const dropModelNameError = (errors: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(errors).filter(([field]) => field !== 'modelName'));

/** Model name and version rows of an edit's change summary (sent to the approver). */
export const modelChanges = (
  product: Pick<ProductResponse, 'modelName' | 'versionNumber'>,
  modelName: string,
  versionNumber: number,
  title: string
): { label: string; oldVal: string; newVal: string }[] => [
  ...(modelName.trim() === (product.modelName ?? '') ? [] : [{ label: 'Model name', oldVal: product.modelName || 'None', newVal: modelName.trim() || 'None' }]),
  ...(versionNumber === product.versionNumber
    ? []
    : [{ label: 'Version', oldVal: formatVersion(product.versionNumber), newVal: `${formatVersion(versionNumber)} (newest of ${title.trim()})` }]),
];

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
