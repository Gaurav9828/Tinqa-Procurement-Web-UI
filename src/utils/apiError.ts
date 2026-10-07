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
 * Extract a user-facing message from any thrown value.
 * The API client already normalises `error.message` to the backend's message,
 * so this mostly guards against non-axios errors.
 */
export const getApiErrorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 405) return METHOD_NOT_ALLOWED_MESSAGE;
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

/** Field-level validation errors returned by the backend (`errors: [{ field, message }]`). */
export const getApiFieldErrors = (err: unknown): Record<string, string> => {
  if (!axios.isAxiosError(err)) return {};
  const errors = (err.response?.data as { errors?: ApiFieldError[] } | undefined)?.errors;
  if (!Array.isArray(errors)) return {};
  return errors.reduce<Record<string, string>>((acc, e) => {
    if (e?.field) acc[e.field] = e.message;
    return acc;
  }, {});
};

/** The backend's machine-readable `errorCode` (e.g. "TICKET_CLOSED"), if present. */
export const getApiErrorCode = (err: unknown): string | null => {
  if (!axios.isAxiosError(err)) return null;
  const code = (err.response?.data as { errorCode?: unknown } | undefined)?.errorCode;
  return typeof code === 'string' && code ? code : null;
};
