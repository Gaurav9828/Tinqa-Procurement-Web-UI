import axios from 'axios';

export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Shown for 405 METHOD_NOT_ALLOWED. The backend's message for it is framework text
 * ("Request method 'GET' is not supported"), which is not meaningful to admins.
 */
export const METHOD_NOT_ALLOWED_MESSAGE =
  "This action isn't supported by the server. Please refresh the page and try again; if it keeps happening, contact support.";

/**
 * Every backend responds with the same envelope on failure:
 *   { success: false, message, errorCode, errors: [{ field, message }], timestamp, path }
 * (some older endpoints put a list of messages in `data` instead of `errors`).
 */
interface ApiErrorBody {
  success?: boolean;
  message?: unknown;
  errorCode?: unknown;
  errors?: unknown;
  data?: unknown;
}

export interface ParsedApiError {
  /** The envelope's `message` (or a fallback). */
  message: string;
  errorCode: string | null;
  /** Field errors from `errors[]`, in server order. */
  errors: ApiFieldError[];
  /**
   * What to show the user: one entry per field error when there are any, otherwise just `message`.
   * Empty and duplicate texts are removed.
   */
  messages: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The error envelope, from a thrown axios error or from a `success: false` response body. */
const errorBody = (err: unknown): ApiErrorBody | null => {
  if (axios.isAxiosError(err)) return isRecord(err.response?.data) ? (err.response!.data as ApiErrorBody) : null;
  if (isRecord(err) && err.success === false) return err as ApiErrorBody;
  return null;
};

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** The single place that turns any failure into user-facing text. */
export const parseApiError = (err: unknown, fallback = 'Something went wrong. Please try again.'): ParsedApiError => {
  if (axios.isAxiosError(err) && err.response?.status === 405) {
    return { message: METHOD_NOT_ALLOWED_MESSAGE, errorCode: 'METHOD_NOT_ALLOWED', errors: [], messages: [METHOD_NOT_ALLOWED_MESSAGE] };
  }
  const body = errorBody(err);
  const message =
    text(body?.message) ||
    (axios.isAxiosError(err) ? text(err.message) : '') ||
    (err instanceof Error ? text(err.message) : '') ||
    (typeof err === 'string' ? err.trim() : '') ||
    fallback;

  const errors: ApiFieldError[] = Array.isArray(body?.errors)
    ? body!.errors
        .filter(isRecord)
        .map((e) => ({ field: text(e.field), message: text(e.message) }))
        .filter((e) => e.message)
    : [];
  // Older endpoints: { data: ["message", ...] } instead of errors[].
  const legacyMessages = !errors.length && Array.isArray(body?.data) ? body!.data.map(text).filter(Boolean) : [];

  const detail = errors.length ? errors.map((e) => e.message) : legacyMessages;
  const messages = [...new Set(detail.length ? detail : [message])];
  const errorCode = text(body?.errorCode) || null;
  return { message, errorCode, errors, messages };
};

/** Every message to show for a failure (one per field error, else the envelope message). */
export const getApiErrorMessages = (err: unknown, fallback?: string): string[] => parseApiError(err, fallback).messages;

/**
 * One line of text for places that can only show a single string (e.g. inside a sentence):
 * the field errors joined, or the envelope message.
 */
export const getApiErrorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.'): string =>
  parseApiError(err, fallback).messages.join(' ');

/** Field-level validation errors (`errors: [{ field, message }]`) keyed by field, for showing under inputs. */
export const getApiFieldErrors = (err: unknown): Record<string, string> =>
  parseApiError(err).errors.reduce<Record<string, string>>((acc, e) => {
    if (e.field) acc[e.field] = e.message;
    return acc;
  }, {});

/** The backend's machine-readable `errorCode` (e.g. "TICKET_CLOSED"), if present. */
export const getApiErrorCode = (err: unknown): string | null => parseApiError(err).errorCode;
