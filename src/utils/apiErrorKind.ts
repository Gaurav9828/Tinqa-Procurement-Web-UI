import axios from 'axios';

/**
 * Coarse category of an API failure, for choosing an empty/error state.
 * The user-facing message still comes from the backend via `getApiErrorMessage`.
 * 401 never reaches a page: the shared API client ends the session and redirects.
 */
export type ApiErrorKind =
  | 'forbidden'
  | 'notFound'
  | 'unsupported'
  | 'conflict'
  | 'validation'
  | 'rateLimited'
  | 'server'
  | 'network'
  | 'unknown';

export const getApiErrorKind = (err: unknown): ApiErrorKind => {
  if (!axios.isAxiosError(err)) return 'unknown';
  if (!err.response) return 'network';
  const status = err.response.status;
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  // 405 METHOD_NOT_ALLOWED: retrying the same request can never succeed.
  if (status === 405) return 'unsupported';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rateLimited';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
};

/** Whether retrying the same request could reasonably succeed. */
export const isRetryableErrorKind = (kind: ApiErrorKind) =>
  kind === 'server' || kind === 'network' || kind === 'rateLimited' || kind === 'unknown';
