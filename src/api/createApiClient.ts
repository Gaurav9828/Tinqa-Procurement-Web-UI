import axios, { type AxiosAdapter, type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import { clearSession, getToken, isSessionExpired, redirectToLogin, redirectToPasswordSetup } from '../auth/session';
import { METHOD_NOT_ALLOWED_MESSAGE } from '../utils/apiError';

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
  // The 405 body carries framework text, not a user-facing message.
  if (error.response?.status === 405) return METHOD_NOT_ALLOWED_MESSAGE;
  const serverMessage = (error.response?.data as { message?: string } | undefined)?.message;
  if (serverMessage) return serverMessage;
  if (!error.response) return 'Unable to reach the server. Please check your connection and try again.';
  const status = error.response.status;
  if (status >= 500) return 'The server encountered an error. Please try again shortly.';
  return STATUS_MESSAGES[status] || error.message;
};

/**
 * Identical GETs that are already in flight share one network call: StrictMode's double effect,
 * or two components loading the same list at once, no longer hit the server twice. Nothing is
 * cached once the response lands, so later reads are always fresh. Requests with an abort
 * signal are left alone so one caller cancelling can't cancel the other.
 */
export const dedupeInFlightGets = (adapter: AxiosAdapter): AxiosAdapter => {
  const inFlight = new Map<string, Promise<AxiosResponse>>();

  return (config) => {
    if ((config.method ?? 'get').toLowerCase() !== 'get' || config.signal) return adapter(config);

    // The token is part of the key so two sessions never share a response.
    const key = `${axios.getUri(config)}|${String(config.headers?.Authorization ?? '')}|${config.responseType ?? ''}`;
    const pending = inFlight.get(key);
    if (pending) return pending.then((response) => ({ ...response, config }));

    const request = adapter(config).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };
};

export const createApiClient = (baseURL: string, label: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });
  client.defaults.adapter = dedupeInFlightGets(axios.getAdapter(client.defaults.adapter));

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
