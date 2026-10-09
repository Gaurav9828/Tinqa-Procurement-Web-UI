/**
 * Units of measure for TinQa's hardware items and orders, offered as a select (never typed).
 *
 * Codes are what the Procurement backend stores; they must match its UNIT rule
 * (^[A-Za-z][A-Za-z ._-]*$, max 20 characters — no digits). The original preset codes
 * (PCS, KG, GRAM, METER, LTR, BOX, PACK, SET) are kept unchanged so existing records still match.
 */
export interface UnitOfMeasure {
  code: string;
  label: string;
  group: UnitGroup;
}

export type UnitGroup = 'Count' | 'Length' | 'Weight' | 'Volume' | 'Area';

export const UNITS_OF_MEASURE: readonly UnitOfMeasure[] = [
  // Count
  { code: 'PCS', label: 'Pieces', group: 'Count' },
  { code: 'NOS', label: 'Numbers', group: 'Count' },
  { code: 'PAIR', label: 'Pair', group: 'Count' },
  { code: 'SET', label: 'Set', group: 'Count' },
  { code: 'KIT', label: 'Kit', group: 'Count' },
  { code: 'DOZEN', label: 'Dozen', group: 'Count' },
  { code: 'PACK', label: 'Pack', group: 'Count' },
  { code: 'BOX', label: 'Box', group: 'Count' },
  { code: 'ROLL', label: 'Roll', group: 'Count' },
  { code: 'REEL', label: 'Reel', group: 'Count' },
  { code: 'SHEET', label: 'Sheet', group: 'Count' },
  // Length
  { code: 'MM', label: 'Millimetre', group: 'Length' },
  { code: 'CM', label: 'Centimetre', group: 'Length' },
  { code: 'METER', label: 'Metre', group: 'Length' },
  { code: 'INCH', label: 'Inch', group: 'Length' },
  { code: 'FEET', label: 'Feet', group: 'Length' },
  // Weight
  { code: 'MG', label: 'Milligram', group: 'Weight' },
  { code: 'GRAM', label: 'Gram', group: 'Weight' },
  { code: 'KG', label: 'Kilogram', group: 'Weight' },
  { code: 'TON', label: 'Tonne', group: 'Weight' },
  // Volume
  { code: 'ML', label: 'Millilitre', group: 'Volume' },
  { code: 'LTR', label: 'Litre', group: 'Volume' },
  // Area
  { code: 'SQ_CM', label: 'Square centimetre', group: 'Area' },
  { code: 'SQ_M', label: 'Square metre', group: 'Area' },
  { code: 'SQ_FT', label: 'Square feet', group: 'Area' },
];

export const DEFAULT_UNIT = 'PCS';

const BY_CODE = new Map(UNITS_OF_MEASURE.map((unit) => [unit.code, unit]));

export const isKnownUnit = (code: string | null | undefined): boolean => !!code && BY_CODE.has(code.trim().toUpperCase());

/** "MM — Millimetre"; unknown (legacy) codes are shown as-is. */
export const formatUnit = (code: string | null | undefined): string => {
  const unit = code ? BY_CODE.get(code.trim().toUpperCase()) : undefined;
  return unit ? `${unit.code} — ${unit.label}` : (code ?? '');
};

/** Flat options for selects without option groups; keeps a legacy saved value selectable. */
export const unitSelectOptions = (current?: string | null): { label: string; value: string }[] => {
  const options = UNITS_OF_MEASURE.map((unit) => ({ label: `${formatUnit(unit.code)} (${unit.group})`, value: unit.code }));
  const value = (current ?? '').trim();
  return value && !isKnownUnit(value) ? [{ label: `${value} (current value)`, value }, ...options] : options;
};
