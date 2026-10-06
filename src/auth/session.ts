import type { AuthResponse, UserProfile } from '../types/auth';

/**
 * Single source of truth for everything the app persists about the auth session.
 * All keys are namespaced so clearing the session never wipes unrelated
 * preferences (e.g. theme) the way `localStorage.clear()` did.
 */
const KEYS = {
  TOKEN: 'tinqa.auth.token',
  EXPIRY: 'tinqa.auth.expiry',
  USER: 'tinqa.auth.user',
} as const;

// Keys used by older builds; removed on clear so stale tokens never linger.
const LEGACY_KEYS = ['token', 'tokenExpiry', 'user', 'accessToken', 'userSession'];

export const SESSION_STORAGE_KEYS = KEYS;

const readJwtExpiry = (token: string): number | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
};

/**
 * Resolve the absolute expiry timestamp (ms). The JWT `exp` claim is authoritative;
 * `expiresIn` (milliseconds, per backend contract) is only a fallback.
 */
export const resolveExpiry = (data: AuthResponse): number => {
  const fromJwt = readJwtExpiry(data.accessToken);
  if (fromJwt) return fromJwt;
  return Date.now() + Number(data.expiresIn || 0);
};

export const getToken = (): string | null => localStorage.getItem(KEYS.TOKEN);

export const getExpiry = (): number => Number(localStorage.getItem(KEYS.EXPIRY) || 0);

export const isSessionExpired = (): boolean => {
  const expiry = getExpiry();
  return !expiry || Date.now() >= expiry;
};

export const getStoredUser = (): UserProfile | null => {
  const raw = localStorage.getItem(KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
};

export const saveSession = (token: string, expiry: number, user: UserProfile) => {
  localStorage.setItem(KEYS.TOKEN, token);
  localStorage.setItem(KEYS.EXPIRY, String(expiry));
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
};

export const saveUser = (user: UserProfile) => {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
};

export const clearSession = () => {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.clear();
};

/** Full-page redirect to login; used outside React (axios interceptors). */
export const redirectToLogin = (reason?: 'expired') => {
  if (window.location.pathname === '/login') return;
  window.location.assign(reason ? `/login?${reason}=true` : '/login');
};
