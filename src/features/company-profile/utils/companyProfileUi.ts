import { LIMITS } from './companyProfileForm';

const buttonBase =
  'flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const BUTTON = {
  primary: `${buttonBase} bg-[#0071e3] hover:bg-[#0077ed] text-white`,
  approve: `${buttonBase} bg-emerald-600 hover:bg-emerald-700 text-white`,
  danger: `${buttonBase} bg-rose-600 hover:bg-rose-700 text-white`,
  secondary: `${buttonBase} bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white font-medium`,
};

const { min: COMMENT_MIN, max: COMMENT_MAX } = LIMITS.rejectComment;

/** Reject comment: 3-500 characters of plain text. */
export const validateRejectComment = (comment: string): string | null => {
  const text = comment.trim();
  if (text.length < COMMENT_MIN) return `Enter at least ${COMMENT_MIN} characters.`;
  if (text.length > COMMENT_MAX) return `Keep it under ${COMMENT_MAX} characters.`;
  if (/[<>]/.test(text)) return 'The comment can’t contain < or >.';
  return null;
};

export const MAX_ASSET_BYTES = 1024 * 1024;
const ALLOWED_EXTENSIONS = ['png', 'svg', 'webp', 'ico'];

/** Quick client checks before uploading (the server checks the real content type and SVG safety). */
export const precheckAsset = (file: File): string | null => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.includes(extension)) return 'Only PNG, SVG, WEBP or ICO images are allowed.';
  if (file.size > MAX_ASSET_BYTES) return 'The image is larger than 1 MB.';
  return null;
};
