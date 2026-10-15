import axios from 'axios';
import { getApiErrorCode } from '../../../utils/apiError';
import { formatPaise } from '../../order-tracking/utils/payment.utils';
import type { RefundSpeed, RefundStatus } from '../types/refund.types';

/** Backend limits for `reason` (request) and `comment` (reject). */
export const REFUND_TEXT_MIN_LENGTH = 3;
export const REFUND_TEXT_MAX_LENGTH = 500;

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  REQUESTED: 'Awaiting approval',
  APPROVED: 'Approved',
  PENDING: 'Pending at Razorpay',
  PROCESSED: 'Refunded',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
};

/** Filter order for the refunds queue. */
export const REFUND_STATUSES: RefundStatus[] = ['REQUESTED', 'APPROVED', 'PENDING', 'PROCESSED', 'FAILED', 'REJECTED'];

export const REFUND_SPEED_LABELS: Record<RefundSpeed, string> = {
  normal: 'Normal',
  optimum: 'Instant',
};

export const formatRefundSpeed = (speed: string | null | undefined): string =>
  (speed && REFUND_SPEED_LABELS[speed as RefundSpeed]) || (speed ? speed.charAt(0).toUpperCase() + speed.slice(1) : '—');

/**
 * Rupees typed by an admin → integer paise, or null when it isn't a valid amount with at most 2 decimals.
 * Rounds instead of truncating, so float noise never loses a paisa (0.1 + 0.2 → 30, 19.99 → 1999).
 */
export const rupeesToPaise = (input: string | number): number | null => {
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? Math.round(input * 100) : null;
  const text = input.trim().replace(/,/g, '');
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(text)) return null;
  return Math.round(Number(text) * 100);
};

/** Paise → the value shown in an amount input ("1999" → "19.99"). */
export const paiseToRupeesInput = (paise: number): string => (paise / 100).toFixed(2);

/** Inline validation for `reason` / `comment`; mirrors the backend rules. */
export const validateRefundText = (value: string, label: string): string | null => {
  const text = value.trim();
  if (!text) return `${label} is required.`;
  if (text.length < REFUND_TEXT_MIN_LENGTH) return `${label} must be at least ${REFUND_TEXT_MIN_LENGTH} characters.`;
  if (text.length > REFUND_TEXT_MAX_LENGTH) return `${label} cannot exceed ${REFUND_TEXT_MAX_LENGTH} characters.`;
  if (/[<>]/.test(text)) return `${label} cannot contain < or >.`;
  return null;
};

/** The amount to send in paise, or why it can't be sent. */
export const validateRefundAmount = (
  input: string,
  maxPaise: number,
  currency: string | null | undefined
): { paise: number; error: null } | { paise: null; error: string } => {
  if (!input.trim()) return { paise: null, error: 'Enter the amount to refund.' };
  const paise = rupeesToPaise(input);
  if (paise === null) return { paise: null, error: 'Enter a valid amount in rupees, with at most 2 decimals.' };
  if (paise < 1) return { paise: null, error: 'The amount must be more than zero.' };
  if (paise > maxPaise) return { paise: null, error: `The amount cannot be more than ${formatPaise(maxPaise, currency)}.` };
  return { paise, error: null };
};

/**
 * Fallback wording for the backend's refund error codes. The server's own `message` wins when it sends one,
 * except where an action overrides the code (see `refundErrorMessage`).
 */
export const REFUND_ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "You don't have permission for this refund action.",
  REFUND_NOT_ALLOWED_FOR_STATUS: "This order can't be refunded in its current status.",
  NO_CAPTURED_PAYMENT: 'This order has no captured payment to refund.',
  REFUND_ALREADY_IN_PROGRESS: 'A refund for this payment is already in progress.',
  REFUND_WINDOW_EXPIRED: 'The refund window for this payment has closed.',
  NOTHING_TO_REFUND: 'Nothing is left to refund on this payment.',
  REFUND_SELF_APPROVAL_NOT_ALLOWED: 'You requested this refund, so another approver must approve it.',
  REFUND_NOT_AWAITING_APPROVAL: 'Another admin has already acted on this refund. Showing its latest state.',
  PAYMENT_NOT_CAPTURED: "Razorpay hasn't captured this payment, so it can't be refunded. The refund is marked failed.",
  REFUND_EXCEEDS_BALANCE: 'The refund is more than the amount still refundable. The refund is marked failed.',
  REFUND_REJECTED_BY_RAZORPAY: 'Razorpay rejected the refund. It is marked failed.',
  RAZORPAY_UNAVAILABLE: "Couldn't reach Razorpay. Please try again.",
};

/** The envelope's `message`, but never axios' generic "Request failed with status code …". */
const serverMessage = (err: unknown): string | null => {
  const data: unknown = axios.isAxiosError(err) ? err.response?.data : err;
  const message = data && typeof data === 'object' ? (data as { message?: unknown }).message : null;
  return typeof message === 'string' && message.trim() ? message.trim() : null;
};

/** What to show for a failed refund call: action-specific wording → server message → code fallback → `fallback`. */
export const refundErrorMessage = (err: unknown, fallback: string, overrides: Partial<Record<string, string>> = {}): string => {
  const code = getApiErrorCode(err);
  return (code && overrides[code]) || serverMessage(err) || (code && REFUND_ERROR_MESSAGES[code]) || fallback;
};
