/** A supplier's receipt for money paid back: PDF, PNG, JPG or WEBP, at most 5 MB (the server checks it too). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';
const RECEIPT_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const RECEIPT_EXTENSIONS = /\.(pdf|png|jpe?g|webp)$/i;

/** Why the file can't be sent, or null when it can (no file is fine: the receipt is optional). */
export const receiptProblem = (file: File | null): string | null => {
  if (!file) return null;
  if (!RECEIPT_TYPES.has(file.type) && !RECEIPT_EXTENSIONS.test(file.name)) return 'The receipt must be a PDF, PNG, JPG or WEBP file.';
  if (file.size > RECEIPT_MAX_BYTES) return 'The receipt is larger than 5 MB.';
  return null;
};
