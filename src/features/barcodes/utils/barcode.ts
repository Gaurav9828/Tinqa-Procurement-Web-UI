import type { BarcodeEventType, BarcodeStatus, NewProductUnit } from '../types/barcode.types';

/**
 * Barcode rules, the same as the backends' (Procurement ValidationPatterns.BARCODE): codes are compared upper-case and
 * are 8-32 letters, digits or hyphens, starting and ending with a letter or digit (EAN-8/13, UPC-A, Code 128...).
 */
export const BARCODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{6,30}[A-Z0-9]$/;
export const BARCODE_RULE = '8-32 letters, digits or hyphens, starting and ending with a letter or digit';
/** Most codes one request carries (Procurement BarcodeCodes.MAX_CODES). */
export const MAX_BARCODES = 5000;

/** The code as stored: trimmed and upper-case. */
export const normalizeBarcode = (code: string) => code.trim().toUpperCase();

export const isValidBarcode = (code: string) => BARCODE_PATTERN.test(normalizeBarcode(code));

/** Codes from a scan or a paste: one per line, or separated by spaces, commas or semicolons. */
export const splitBarcodes = (text: string): string[] =>
  text
    .split(/[\s,;]+/)
    .map(normalizeBarcode)
    .filter(Boolean);

/** The first problem with a list of codes that must hold exactly `expected` (null when there is none). */
export const barcodeListError = (codes: string[], expected: number, what = 'unit'): string | null => {
  const invalid = codes.find((code) => !isValidBarcode(code));
  if (invalid) return `${invalid} is not a valid barcode: use ${BARCODE_RULE}.`;
  const seen = new Set<string>();
  for (const code of codes) {
    if (seen.has(code)) return `${code} is entered more than once.`;
    seen.add(code);
  }
  if (codes.length !== expected) {
    return expected === 1
      ? `Scan the barcode of the ${what} (${codes.length} entered).`
      : `Scan one barcode for each of the ${expected} ${what}s (${codes.length} entered).`;
  }
  return null;
};

/** Codes used more than once across product units and their parts (each piece and unit is unique). */
export const repeatedAcrossUnits = (units: NewProductUnit[]): string | null => {
  const seen = new Set<string>();
  for (const unit of units) {
    for (const code of [unit.barcode, ...unit.parts.flatMap((part) => part.barcodes)]) {
      if (!code) continue;
      if (seen.has(code)) return code;
      seen.add(code);
    }
  }
  return null;
};

export const BARCODE_STATUS_LABELS: Record<BarcodeStatus, string> = {
  PENDING: 'Awaiting approval',
  IN_STOCK: 'In stock',
  FITTED: 'Fitted in a product',
  REMOVED: 'Removed from stock',
  WITHDRAWAL_PENDING: 'Being taken off',
  ON_DEMO: 'Out on a client demo',
  VOID: 'Void',
};

export const BARCODE_STATUS_STYLES: Record<BarcodeStatus, string> = {
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  IN_STOCK: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  FITTED: 'bg-[#0071e3]/10 text-[#0071e3]',
  REMOVED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  WITHDRAWAL_PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  ON_DEMO: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  VOID: 'bg-gray-500/10 text-gray-500',
};

export const BARCODE_EVENT_LABELS: Record<BarcodeEventType, string> = {
  REGISTERED: 'Registered',
  APPROVED: 'Approved and locked',
  VOIDED: 'Registration withdrawn',
  FITTED: 'Fitted into a product unit',
  RETURNED: 'Returned to stock',
  REMOVED: 'Removed from stock',
  WITHDRAWAL_REQUESTED: 'Taken off by a count correction',
  WITHDRAWAL_APPROVED: 'Count correction approved',
  WITHDRAWAL_REJECTED: 'Count correction rejected: back in stock',
  CODE_CORRECTED: 'Barcode corrected',
  REVERSED: 'Change reversed',
  DEMO_HANDED_OUT: 'Handed out to a client demo',
  DEMO_RETURNED: 'Back from a client demo: in stock',
};
