/**
 * Change detection for forms: Save / Confirm stays disabled until the form differs from what it opened with.
 *
 * Values are compared after normalising, so edits that don't change what gets saved don't count:
 * surrounding whitespace, '' vs null vs undefined, and object key order are ignored.
 */
const normalize = (value: unknown): unknown => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = normalize((value as Record<string, unknown>)[key]);
      if (v !== null) out[key] = v;
    }
    return out;
  }
  return value;
};

/** True when `current` holds a real change compared with `initial`. */
export const hasFormChanges = (current: unknown, initial: unknown): boolean =>
  JSON.stringify(normalize(current)) !== JSON.stringify(normalize(initial));
