import {
  WARRANTY_DURATION_UNITS,
  WARRANTY_TYPES,
  type ItemWarrantyRequest,
  type ItemWarrantyResponse,
  type WarrantyDurationUnit,
  type WarrantyType,
} from '../types/item.types';

export const WARRANTY_TITLE_MAX = 255;
export const WARRANTY_PROVIDER_MAX = 255;
/** Backend `Integer` upper bound; larger values would be rejected as malformed. */
const MAX_DURATION = 2_147_483_647;

export const WARRANTY_TYPE_LABELS: Record<WarrantyType, string> = {
  MANUFACTURER: 'Manufacturer',
  SELLER: 'Seller',
  EXTENDED: 'Extended',
  REPLACEMENT: 'Replacement',
  SERVICE: 'Service',
  PARTS: 'Parts',
  LIMITED: 'Limited',
};

const UNIT_LABELS: Record<WarrantyDurationUnit, [singular: string, plural: string]> = {
  DAYS: ['Day', 'Days'],
  MONTHS: ['Month', 'Months'],
  YEARS: ['Year', 'Years'],
};

export const WARRANTY_TYPE_OPTIONS = WARRANTY_TYPES.map((value) => ({ value, label: WARRANTY_TYPE_LABELS[value] }));
export const WARRANTY_UNIT_OPTIONS = WARRANTY_DURATION_UNITS.map((value) => ({ value, label: UNIT_LABELS[value][1] }));

/** Unknown/legacy enum values still render ("NEW_TYPE" → "New Type"). */
export const formatWarrantyType = (type: string | null | undefined): string =>
  (type && WARRANTY_TYPE_LABELS[type as WarrantyType]) ||
  (type ?? '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ') ||
  '—';

/** 3, YEARS → "3 Years"; 1, MONTHS → "1 Month". */
export const formatWarrantyDuration = (value: number | null | undefined, unit: string | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const labels = UNIT_LABELS[unit as WarrantyDurationUnit];
  if (!labels) return `${value} ${unit ?? ''}`.trim();
  return `${value} ${value === 1 ? labels[0] : labels[1]}`;
};

/** "3 Years Manufacturer Warranty" — empty until type and a valid duration are chosen. */
export const suggestWarrantyTitle = (type: WarrantyType | '', durationValue: string, unit: WarrantyDurationUnit | ''): string => {
  const value = parseDuration(durationValue);
  if (!type || !unit || value === null) return '';
  return `${formatWarrantyDuration(value, unit)} ${WARRANTY_TYPE_LABELS[type]} Warranty`;
};

/** One-line summary, e.g. "Manufacturer · 3 Years · ASUS". */
export const summarizeWarranty = (w: {
  warrantyType: string | null | undefined;
  durationValue: number | string | null | undefined;
  durationUnit: string | null | undefined;
  provider?: string | null;
}): string => {
  const duration = typeof w.durationValue === 'string' ? parseDuration(w.durationValue) : w.durationValue;
  return [
    w.warrantyType ? formatWarrantyType(w.warrantyType) : null,
    duration !== null && duration !== undefined && w.durationUnit ? formatWarrantyDuration(duration, w.durationUnit) : null,
    w.provider?.trim() || null,
  ]
    .filter(Boolean)
    .join(' · ');
};

/** Whole number > 0, or null. */
export const parseDuration = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value > 0 && value <= MAX_DURATION ? value : null;
};

// ---------- form state ----------

/** One warranty card. `uid` is a client-only key; `id` exists only for warranties saved on this item. */
export interface WarrantyFormItem {
  uid: string;
  id?: number;
  warrantyType: WarrantyType | '';
  title: string;
  /** Kept as typed so partial input can be validated. */
  durationValue: string;
  durationUnit: WarrantyDurationUnit | '';
  provider: string;
  coverage: string;
  exclusions: string;
  termsAndConditions: string;
  isActive: boolean;
  /** False while the title still follows the suggestion from type + duration. */
  titleEdited: boolean;
}

let uidCounter = 0;
const nextUid = () => `item-warranty-${++uidCounter}`;

export const emptyWarrantyForm = (defaults: Partial<Pick<WarrantyFormItem, 'warrantyType' | 'durationUnit'>> = {}): WarrantyFormItem => ({
  uid: nextUid(),
  warrantyType: '',
  title: '',
  durationValue: '',
  durationUnit: 'YEARS',
  provider: '',
  coverage: '',
  exclusions: '',
  termsAndConditions: '',
  isActive: true,
  titleEdited: false,
  ...defaults,
});

export const toWarrantyForms = (warranties: ItemWarrantyResponse[] | null | undefined): WarrantyFormItem[] =>
  (warranties ?? []).map((w) => ({
    uid: nextUid(),
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
  }));

/** Applies a change and keeps an untouched title in sync with the suggestion. */
export const updateWarrantyForm = (item: WarrantyFormItem, patch: Partial<WarrantyFormItem>): WarrantyFormItem => {
  const next = { ...item, ...patch };
  if ('title' in patch) return { ...next, titleEdited: next.title.trim() !== '' };
  if (!next.titleEdited) next.title = suggestWarrantyTitle(next.warrantyType, next.durationValue, next.durationUnit);
  return next;
};

const optional = (value: string) => value.trim() || undefined;

/**
 * Validated cards → request items, in card order (so backend errors like `warranties[1].title`
 * map back to the same card). Ids only on update (`isEdit`); `isActive` only in edit mode,
 * where the toggle is shown — new items default to active on the server.
 */
export const toWarrantyRequests = (items: WarrantyFormItem[], isEdit: boolean): ItemWarrantyRequest[] =>
  items.map((item) => ({
    ...(isEdit && item.id !== undefined ? { id: item.id } : {}),
    warrantyType: item.warrantyType as WarrantyType,
    title: item.title.trim(),
    durationValue: parseDuration(item.durationValue) as number,
    durationUnit: item.durationUnit as WarrantyDurationUnit,
    provider: optional(item.provider),
    coverage: optional(item.coverage),
    exclusions: optional(item.exclusions),
    termsAndConditions: optional(item.termsAndConditions),
    ...(isEdit ? { isActive: item.isActive } : {}),
  }));

// ---------- validation / errors ----------

export type WarrantyField = 'warrantyType' | 'title' | 'durationValue' | 'durationUnit' | 'provider';

/** Same key format as the backend's field errors, e.g. `warranties[0].title`. */
export const warrantyErrorKey = (index: number, field?: string) => (field ? `warranties[${index}].${field}` : `warranties[${index}]`);

export interface WarrantyValidationOptions {
  /** Max length of coverage / exclusions / terms (unlimited when omitted). */
  textMax?: number;
  /** Reject `<tag>` HTML and script patterns in every text field (backends that return 400 for them). */
  rejectScripts?: boolean;
}

const LONG_TEXT_FIELDS = [
  ['coverage', 'Coverage'],
  ['exclusions', 'Exclusions'],
  ['termsAndConditions', 'Terms & Conditions'],
] as const;

const scriptError = (value: string, label: string): string | null => {
  if (/<[a-z][\s\S]*>/i.test(value)) return `${label} cannot contain HTML tags.`;
  const lower = value.toLowerCase();
  if (lower.includes('javascript:') || lower.includes('onerror=') || lower.includes('onload=')) {
    return `${label} contains a blocked script pattern ("javascript:", "onerror=" or "onload=").`;
  }
  return null;
};

/** Mirrors the warranty request constraints (ItemDTOs.WarrantyRequest; product warranties add `options`). */
export const validateWarrantyForms = (items: WarrantyFormItem[], options: WarrantyValidationOptions = {}): Record<string, string> => {
  const errors: Record<string, string> = {};
  items.forEach((item, i) => {
    if (options.rejectScripts) {
      for (const [field, label] of [['title', 'Title'], ['provider', 'Provider'], ...LONG_TEXT_FIELDS] as const) {
        const error = scriptError(item[field].trim(), label);
        if (error) errors[warrantyErrorKey(i, field)] = error;
      }
    }
    if (options.textMax !== undefined) {
      for (const [field, label] of LONG_TEXT_FIELDS) {
        if (item[field].trim().length > options.textMax && !errors[warrantyErrorKey(i, field)]) {
          errors[warrantyErrorKey(i, field)] = `${label} cannot exceed ${options.textMax.toLocaleString()} characters.`;
        }
      }
    }
    if (!item.warrantyType) errors[warrantyErrorKey(i, 'warrantyType')] = 'Select a warranty type.';
    else if (!(WARRANTY_TYPES as readonly string[]).includes(item.warrantyType)) errors[warrantyErrorKey(i, 'warrantyType')] = 'Select a supported warranty type.';
    const title = item.title.trim();
    if (!title) errors[warrantyErrorKey(i, 'title')] = 'Title is required.';
    else if (title.length > WARRANTY_TITLE_MAX) errors[warrantyErrorKey(i, 'title')] = `Title cannot exceed ${WARRANTY_TITLE_MAX} characters.`;
    if (!item.durationValue.trim()) errors[warrantyErrorKey(i, 'durationValue')] = 'Duration is required.';
    else if (parseDuration(item.durationValue) === null) errors[warrantyErrorKey(i, 'durationValue')] = 'Duration must be a whole number greater than 0.';
    if (!item.durationUnit) errors[warrantyErrorKey(i, 'durationUnit')] = 'Select a duration unit.';
    else if (!(WARRANTY_DURATION_UNITS as readonly string[]).includes(item.durationUnit)) errors[warrantyErrorKey(i, 'durationUnit')] = 'Select Days, Months or Years.';
    if (item.provider.trim().length > WARRANTY_PROVIDER_MAX) {
      errors[warrantyErrorKey(i, 'provider')] = `Provider cannot exceed ${WARRANTY_PROVIDER_MAX} characters.`;
    }
  });
  return errors;
};

/** Errors for card `index` (field name → message), including card-level ones under ''. */
export const errorsForCard = (errors: Record<string, string>, index: number): Record<string, string> => {
  const prefix = warrantyErrorKey(index);
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([key]) => key === prefix || key.startsWith(`${prefix}.`))
      .map(([key, message]) => [key === prefix ? '' : key.slice(prefix.length + 1), message])
  );
};

/** Clears the given keys, or every warranty error when cards were added/removed (indexes shift). */
export const dropWarrantyErrors = (errors: Record<string, string>, edited: string[] | 'all'): Record<string, string> =>
  Object.fromEntries(
    Object.entries(errors).filter(([key]) => (edited === 'all' ? !key.startsWith('warranties') : !edited.includes(key)))
  );

/** Backend field errors not tied to a warranty card (shown at form level). */
export const nonWarrantyErrors = (errors: Record<string, string>): [string, string][] =>
  Object.entries(errors).filter(([key]) => !key.startsWith('warranties'));

// ---------- audit ----------

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 hours ago", "yesterday", "just now". */
export const formatRelativeTime = (iso: string, now: number = Date.now()): string => {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const seconds = Math.round((time - now) / 1000);
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return 'just now';
};

/** "Updated 3 hours ago by user #7" (parts omitted when unknown). No user-name lookup exists in the app yet. */
export const describeWarrantyAudit = (w: Pick<ItemWarrantyResponse, 'updatedAt' | 'updatedBy'>, now?: number): string | null => {
  if (!w.updatedAt) return null;
  const by = w.updatedBy !== null && w.updatedBy !== undefined ? ` by user #${w.updatedBy}` : '';
  return `Updated ${formatRelativeTime(w.updatedAt, now)}${by}`;
};
