import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { clearSession, getToken, isSessionExpired, redirectToLogin } from '../auth/session';

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
  409: 'This record was modified by someone else. Please refresh and try again.',
  413: 'The uploaded file is too large.',
  422: 'Some fields are invalid. Please review and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
};

const describeError = (error: AxiosError): string => {
  const serverMessage = (error.response?.data as { message?: string } | undefined)?.message;
  if (serverMessage) return serverMessage;
  if (!error.response) return 'Unable to reach the server. Please check your connection and try again.';
  const status = error.response.status;
  if (status >= 500) return 'The server encountered an error. Please try again shortly.';
  return STATUS_MESSAGES[status] || error.message;
};

export const createApiClient = (baseURL: string, label: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

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

      error.message = describeError(error);
      return Promise.reject(error);
    }
  );

  return client;
};
