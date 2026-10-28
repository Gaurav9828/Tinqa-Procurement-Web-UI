import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { clearSession, getStoredUser, getToken, isSessionExpired, redirectToLogin, redirectToPasswordSetup } from '../auth/session';
import { createEndpointMatcher, type EndpointRule } from '../config/endpointAccess';
import { METHOD_NOT_ALLOWED_MESSAGE } from '../utils/apiError';
import { guardAdapter, RUNAWAY_ERROR_CODE } from './apiCallGuard';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Set on endpoints where a 401 means "bad credentials", not "session expired"
     * (login, change-password). The error is returned to the caller instead of
     * logging the user out.
     */
    skipAuthRedirect?: boolean;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check the entered values.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested record was not found.',
  405: METHOD_NOT_ALLOWED_MESSAGE,
  409: 'This record was modified by someone else. Please refresh and try again.',
  413: 'The uploaded file is too large.',
  422: 'Some fields are invalid. Please review and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
};

const describeError = (error: AxiosError): string => {
  // A request loop stopped in the browser: the server was never called
  if (error.code === RUNAWAY_ERROR_CODE) return error.message;
  // The 405 body carries framework text, not a user-facing message.
  if (error.response?.status === 405) return METHOD_NOT_ALLOWED_MESSAGE;
  const serverMessage = (error.response?.data as { message?: string } | undefined)?.message;
  if (serverMessage) return serverMessage;
  if (!error.response) return 'Unable to reach the server. Please check your connection and try again.';
  const status = error.response.status;
  if (status >= 500) return 'The server encountered an error. Please try again shortly.';
  return STATUS_MESSAGES[status] || error.message;
};

export { dedupeInFlightGets } from './apiCallGuard';

/** Why a request was never sent: the signed-in user lacks the permission the endpoint requires. */
export const NOT_PERMITTED_MESSAGE = 'Not sent: missing permission';

/**
 * `endpointRules` (config/endpointAccess.ts) say which permission each endpoint needs. A request the signed-in user
 * isn't allowed to make is cancelled before it is sent, the same answer the backend would give, so it never reaches
 * the server and shows no error (callers ignore cancelled requests). Screens should not try such calls at all; in
 * development each one is logged so it can be fixed where it starts.
 */
export const createApiClient = (baseURL: string, label: string, endpointRules: readonly EndpointRule[] = []): AxiosInstance => {
  const requiredPermission = createEndpointMatcher(endpointRules);
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });
  // Shares in-flight GETs, stops request loops, and counts calls in development (see apiCallGuard)
  client.defaults.adapter = guardAdapter(axios.getAdapter(client.defaults.adapter), label);

  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      if (isSessionExpired()) {
        clearSession();
        redirectToLogin('expired');
        return Promise.reject(new axios.CanceledError('Session expired'));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    const required = requiredPermission(config.method, config.url);
    // No stored permissions yet (a session from an older build): leave the decision to the backend
    const permissions = getStoredUser()?.permissions;
    if (required && permissions && !permissions.includes(required)) {
      if (import.meta.env.DEV) {
        console.warn(`[${label}] blocked ${config.method?.toUpperCase()} ${config.url}: needs ${required}`);
      }
      return Promise.reject(new axios.CanceledError(`${NOT_PERMITTED_MESSAGE} ${required}`));
    }
    // Let the browser set the multipart boundary itself.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (axios.isCancel(error)) return Promise.reject(error);

      const status = error.response?.status;

      if (import.meta.env.DEV) {
        console.error(`[${label}] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, status, error.response?.data);
      }

      // Only an invalid/expired token ends the session. 403, 5xx and network
      // failures are surfaced to the caller without logging the user out.
      if (status === 401 && !error.config?.skipAuthRedirect) {
        clearSession();
        redirectToLogin('expired');
      }

      // A temporary password only allows setting a new one; the backend blocks everything else.
      const errorCode = (error.response?.data as { errorCode?: unknown } | undefined)?.errorCode;
      if (status === 403 && errorCode === 'PASSWORD_CHANGE_REQUIRED') {
        redirectToPasswordSetup();
      }

      error.message = describeError(error);
      return Promise.reject(error);
    }
  );

  return client;
};
