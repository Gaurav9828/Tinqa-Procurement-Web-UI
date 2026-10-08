import { WARRANTY_LIMITS, type WarrantyRequest, type WarrantyResponse } from '../types/product.types';

export type WarrantyTextField = keyof typeof WARRANTY_LIMITS;

/** One warranty row in the product form. `uid` is a client-only React key; `id` exists only for saved warranties. */
export interface WarrantyFormItem {
  uid: string;
  id?: number;
  title: string;
  description: string;
  generalTermsAndConditions: string;
  isActive: boolean;
  /** Read-only, from the server. */
  updatedAt?: string | null;
}

export const WARRANTY_FIELD_LABELS: Record<WarrantyTextField, string> = {
  title: 'Title',
  description: 'Description',
  generalTermsAndConditions: 'General Terms & Conditions',
};

const WARRANTY_TEXT_FIELDS = Object.keys(WARRANTY_LIMITS) as WarrantyTextField[];

let uidCounter = 0;
const nextUid = () => `warranty-${++uidCounter}`;

export const emptyWarranty = (): WarrantyFormItem => ({
  uid: nextUid(),
  title: '',
  description: '',
  generalTermsAndConditions: '',
  isActive: true,
});

export const toWarrantyFormItems = (warranties: WarrantyResponse[] | null | undefined): WarrantyFormItem[] =>
  (warranties ?? []).map((w) => ({
    uid: nextUid(),
    id: w.id,
    title: w.title ?? '',
    description: w.description ?? '',
    generalTermsAndConditions: w.generalTermsAndConditions ?? '',
    isActive: w.isActive !== false,
    updatedAt: w.updatedAt ?? null,
  }));

/**
 * Request items in form order (one per form row, so backend errors like `warranties[1].title`
 * map back to the same row). Ids are sent only when `includeIds` (update) — never on create.
 */
export const toWarrantyRequests = (items: WarrantyFormItem[], includeIds: boolean): WarrantyRequest[] =>
  items.map((item) => ({
    ...(includeIds && item.id !== undefined ? { id: item.id } : {}),
    title: item.title.trim(),
    description: item.description.trim(),
    generalTermsAndConditions: item.generalTermsAndConditions.trim(),
    isActive: Boolean(item.isActive),
  }));

/** Error key used both for client validation and backend field errors, e.g. `warranties[0].title`. */
export const warrantyErrorKey = (index: number, field?: WarrantyTextField) =>
  field ? `warranties[${index}].${field}` : `warranties[${index}]`;

/** Mirrors the backend's ProductSecurityValidator checks so a save is not rejected with a 400. */
export const validateWarrantyText = (value: string, field: WarrantyTextField): string | null => {
  const label = WARRANTY_FIELD_LABELS[field];
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  const max = WARRANTY_LIMITS[field];
  if (trimmed.length > max) return `${label} cannot exceed ${max.toLocaleString()} characters.`;
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return `${label} cannot contain HTML tags.`;
  const lower = trimmed.toLowerCase();
  if (lower.includes('javascript:') || lower.includes('onerror=') || lower.includes('onload=')) {
    return `${label} contains a blocked script pattern ("javascript:", "onerror=" or "onload=").`;
  }
  return null;
};

/** Inline errors keyed by `warranties[i].<field>`; empty when every row is valid. */
export const validateWarranties = (items: WarrantyFormItem[]): Record<string, string> => {
  const errors: Record<string, string> = {};
  items.forEach((item, index) => {
    WARRANTY_TEXT_FIELDS.forEach((field) => {
      const error = validateWarrantyText(item[field], field);
      if (error) errors[warrantyErrorKey(index, field)] = error;
    });
  });
  return errors;
};

const normalise = (w: { id?: number; title: string; description: string; generalTermsAndConditions: string; isActive?: boolean }) =>
  JSON.stringify([w.id ?? null, w.title.trim(), w.description.trim(), w.generalTermsAndConditions.trim(), w.isActive !== false]);

export const warrantiesChanged = (original: WarrantyResponse[], items: WarrantyFormItem[]): boolean =>
  original.length !== items.length || original.some((w, i) => normalise(w) !== normalise(items[i]));

/** Short human summary for the edit review, e.g. "1 Year Warranty; 6 Month Extended (inactive)". */
export const summarizeWarranties = (list: { title: string; isActive?: boolean }[]): string =>
  list.length ? list.map((w) => `${w.title.trim() || '(untitled)'}${w.isActive === false ? ' (inactive)' : ''}`).join('; ') : 'None';

/** What saving will do to the existing warranties — shown on the edit review. */
export const describeWarrantyChanges = (original: WarrantyResponse[], items: WarrantyFormItem[]): string[] => {
  const byId = new Map(original.map((w) => [w.id, w]));
  const keptIds = new Set(items.flatMap((item) => (item.id !== undefined ? [item.id] : [])));
  const lines: string[] = [];
  items.forEach((item) => {
    const before = item.id !== undefined ? byId.get(item.id) : undefined;
    const title = item.title.trim() || '(untitled)';
    if (!before) {
      lines.push(`Add "${title}"${item.isActive ? '' : ' (inactive)'}`);
      return;
    }
    if (normalise(before) === normalise(item)) return;
    const parts: string[] = [];
    if (before.title.trim() !== item.title.trim()) parts.push(`rename "${before.title}" → "${title}"`);
    if (before.description.trim() !== item.description.trim()) parts.push('description edited');
    if (before.generalTermsAndConditions.trim() !== item.generalTermsAndConditions.trim()) parts.push('terms edited');
    if ((before.isActive !== false) !== item.isActive) parts.push(item.isActive ? 'reactivate' : 'deactivate');
    lines.push(`Update "${title}": ${parts.join(', ')}`);
  });
  original.filter((w) => !keptIds.has(w.id)).forEach((w) => lines.push(`Delete "${w.title}" permanently`));
  return lines;
};

/** Clears the error(s) for an edited field; 'all' drops every warranty error (row indexes shifted). */
export const dropWarrantyErrors = (errors: Record<string, string>, edited: string | 'all'): Record<string, string> =>
  Object.fromEntries(
    Object.entries(errors).filter(([key]) => (edited === 'all' ? !key.startsWith('warranties') : key !== edited))
  );

/** Backend field errors that don't belong to a warranty row — shown at form level. */
export const nonWarrantyErrors = (errors: Record<string, string>): [string, string][] =>
  Object.entries(errors).filter(([key]) => !/^warranties\[\d+\]/.test(key));
