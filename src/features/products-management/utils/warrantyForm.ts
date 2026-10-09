import {
  emptyWarrantyForm,
  formatWarrantyDuration,
  formatWarrantyType,
  toWarrantyRequests as toSharedWarrantyRequests,
  validateWarrantyForms,
  type WarrantyFormItem,
} from '../../item-management/utils/itemWarranty';
import type { WarrantyDurationUnit, WarrantyType } from '../../item-management/types/item.types';
import { WARRANTY_TEXT_MAX, type WarrantyRequest, type WarrantyResponse } from '../types/product.types';
import type { ComponentFormRow } from './componentForm';

/**
 * Product-level warranty card: the same fields as item/component warranties (shared editor),
 * plus read-only audit info and, for warranties copied from a selected item, where it came from.
 */
export interface ProductWarrantyFormItem extends WarrantyFormItem {
  updatedAt?: string | null;
  updatedBy?: number | null;
  /**
   * Set while a warranty was copied from a component's item and not saved yet. Client-only: the
   * backend stores it as a normal product warranty, so after saving the link no longer exists.
   */
  source?: { key: string; itemId: number; itemName: string };
}

export const emptyProductWarranty = (): ProductWarrantyFormItem => emptyWarrantyForm({ warrantyType: 'MANUFACTURER', durationUnit: 'MONTHS' });

export const toProductWarrantyForms = (warranties: WarrantyResponse[] | null | undefined): ProductWarrantyFormItem[] =>
  (warranties ?? []).map((w) => ({
    ...emptyProductWarranty(),
    id: w.id,
    warrantyType: w.warrantyType ?? '',
    title: w.title ?? '',
    durationValue: w.durationValue === null || w.durationValue === undefined ? '' : String(w.durationValue),
    durationUnit: w.durationUnit ?? '',
    provider: w.provider ?? '',
    coverage: w.coverage ?? '',
    exclusions: w.exclusions ?? '',
    termsAndConditions: w.termsAndConditions ?? '',
    isActive: w.isActive !== false,
    titleEdited: true,
    updatedAt: w.updatedAt ?? null,
    updatedBy: w.updatedBy ?? null,
  }));

/**
 * Cards → request items, in card order (so backend errors like `warranties[1].durationUnit` map back
 * to the same card). Blank optional text is omitted; `isActive` is always sent; ids only on update.
 */
export const toProductWarrantyRequests = (items: ProductWarrantyFormItem[], includeIds: boolean): WarrantyRequest[] =>
  toSharedWarrantyRequests(items, true).map(({ id, ...rest }) => ({
    ...(includeIds && id !== undefined ? { id } : {}),
    ...(rest as Omit<WarrantyRequest, 'id'>),
  }));

/** Same rules as the backend: required type/title/duration/unit, enums, integer > 0, max lengths, no HTML/scripts. */
export const validateProductWarranties = (items: ProductWarrantyFormItem[]): Record<string, string> =>
  validateWarrantyForms(items, { textMax: WARRANTY_TEXT_MAX, rejectScripts: true });

// ---------- item warranties copied into product warranties ----------

const sourceKey = (row: ComponentFormRow, sourceWarrantyId: number | null | undefined, index: number) =>
  `${row.uid}:${row.itemId}:${sourceWarrantyId ?? `#${index}`}`;

const PRODUCT_WARRANTY_TITLE_MAX = 255;

/**
 * Title of a product warranty copied from an item: the item's name (e.g. "Summit X Touch Panel").
 * The card is read-only, so the title is filled in here and capped at the backend's 255 characters.
 * Falls back to the item warranty's own title if the item has no name.
 */
export const itemWarrantyTitle = (warrantyTitle: string, itemName: string): string =>
  (itemName.trim() || warrantyTitle.trim()).slice(0, PRODUCT_WARRANTY_TITLE_MAX);

/** Product warranty card copied from one of the item's warranties. */
const fromItemWarranty = (row: ComponentFormRow, w: ComponentFormRow['warranties'][number], key: string): ProductWarrantyFormItem => ({
  ...emptyProductWarranty(),
  warrantyType: w.warrantyType as WarrantyType,
  title: itemWarrantyTitle(w.title, row.itemName),
  durationValue: String(w.durationValue),
  durationUnit: w.durationUnit as WarrantyDurationUnit,
  provider: w.provider ?? '',
  coverage: w.coverage ?? '',
  exclusions: w.exclusions ?? '',
  termsAndConditions: w.termsAndConditions ?? '',
  isActive: true,
  titleEdited: true,
  source: { key, itemId: row.itemId as number, itemName: row.itemName },
});

/**
 * Keeps the item-derived product warranties in step with the selected components: each component
 * that copies to the product (new rows / changed items) contributes its item's active warranties;
 * a removed or changed item takes its copies away. Admin edits to a copied card are kept, and
 * copies the admin removed (`dismissed`) are not re-added. Returns the same array when nothing changed.
 */
export const syncItemWarranties = (
  warranties: ProductWarrantyFormItem[],
  rows: ComponentFormRow[],
  dismissed: ReadonlySet<string> = new Set()
): ProductWarrantyFormItem[] => {
  const live = new Map<string, ProductWarrantyFormItem>();
  for (const row of rows) {
    if (!row.copiesToProduct || row.status !== 'ready' || row.itemId === null) continue;
    row.warranties.forEach((w, i) => {
      const key = sourceKey(row, w.sourceWarrantyId, i);
      if (!dismissed.has(key)) live.set(key, fromItemWarranty(row, w, key));
    });
  }
  const kept = warranties.filter((w) => !w.source || live.has(w.source.key));
  const present = new Set(kept.flatMap((w) => (w.source ? [w.source.key] : [])));
  const added = [...live].filter(([key]) => !present.has(key)).map(([, card]) => card);
  if (added.length === 0 && kept.length === warranties.length) return warranties;
  return [...kept, ...added];
};

// ---------- edit review ----------

const normalise = (w: {
  id?: number;
  warrantyType: string;
  title: string;
  durationValue: number | string;
  durationUnit: string;
  provider?: string | null;
  coverage?: string | null;
  exclusions?: string | null;
  termsAndConditions?: string | null;
  isActive?: boolean;
}) =>
  JSON.stringify([
    w.id ?? null,
    w.warrantyType,
    w.title.trim(),
    String(w.durationValue).trim(),
    w.durationUnit,
    (w.provider ?? '').trim(),
    (w.coverage ?? '').trim(),
    (w.exclusions ?? '').trim(),
    (w.termsAndConditions ?? '').trim(),
    w.isActive !== false,
  ]);

export const warrantiesChanged = (original: WarrantyResponse[], items: ProductWarrantyFormItem[]): boolean =>
  original.length !== items.length || original.some((w, i) => normalise(w) !== normalise(items[i]));

/** "1 Year Manufacturer Warranty (Manufacturer · 12 Months); … (inactive)" */
export const summarizeWarranties = (
  list: { title: string; warrantyType: string; durationValue: number | string; durationUnit: string; isActive?: boolean }[]
): string =>
  list.length
    ? list
        .map(
          (w) =>
            `${w.title.trim() || '(untitled)'} (${formatWarrantyType(w.warrantyType)} · ${formatWarrantyDuration(Number(w.durationValue), w.durationUnit)})${
              w.isActive === false ? ' (inactive)' : ''
            }`
        )
        .join('; ')
    : 'None';

/** What saving will do to the existing warranties — shown on the edit review. */
export const describeWarrantyChanges = (original: WarrantyResponse[], items: ProductWarrantyFormItem[]): string[] => {
  const byId = new Map(original.map((w) => [w.id, w]));
  const keptIds = new Set(items.flatMap((item) => (item.id !== undefined ? [item.id] : [])));
  const lines: string[] = [];
  items.forEach((item) => {
    const before = item.id !== undefined ? byId.get(item.id) : undefined;
    const title = item.title.trim() || '(untitled)';
    if (!before) {
      // Copied item warranties are titled with the item name, so describe them by type and duration.
      lines.push(
        item.source
          ? `Add ${formatWarrantyType(item.warrantyType)} warranty (${formatWarrantyDuration(Number(item.durationValue), item.durationUnit)}) from ${item.source.itemName}`
          : `Add "${title}"${item.isActive ? '' : ' (inactive)'}`
      );
      return;
    }
    if (normalise(before) === normalise(item)) return;
    const parts: string[] = [];
    if (before.title.trim() !== item.title.trim()) parts.push(`rename "${before.title}" → "${title}"`);
    if (before.warrantyType !== item.warrantyType) parts.push(`type → ${formatWarrantyType(item.warrantyType)}`);
    if (String(before.durationValue) !== item.durationValue.trim() || before.durationUnit !== item.durationUnit) {
      parts.push(`duration → ${formatWarrantyDuration(Number(item.durationValue), item.durationUnit)}`);
    }
    if ((before.provider ?? '').trim() !== item.provider.trim()) parts.push(`provider → ${item.provider.trim() || 'none'}`);
    if (
      (before.coverage ?? '').trim() !== item.coverage.trim() ||
      (before.exclusions ?? '').trim() !== item.exclusions.trim() ||
      (before.termsAndConditions ?? '').trim() !== item.termsAndConditions.trim()
    ) {
      parts.push('details edited');
    }
    if ((before.isActive !== false) !== item.isActive) parts.push(item.isActive ? 'reactivate' : 'deactivate');
    lines.push(`Update "${title}": ${parts.join(', ')}`);
  });
  original.filter((w) => !keptIds.has(w.id)).forEach((w) => lines.push(`Delete "${w.title}" permanently`));
  return lines;
};
