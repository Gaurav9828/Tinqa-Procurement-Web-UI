import { useEffect, useRef } from 'react';
import axios from 'axios';
import { accessService } from '../api/services/accessService';
import { useAuthStore } from '../store/useAuthStore';
import { useNotify } from '../hooks/useNotify';
import { getTokenPermissions } from './adminIdentity';

const MIN_REFRESH_INTERVAL_MS = 60_000;

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((item) => b.includes(item));

/**
 * Keeps the signed-in user's permissions current: loads them on mount (sessions from older builds have none), and
 * again when the window regains focus, at most once a minute. Designation and level changes apply on the
 * Procurement backend at once, but the Ecommerce backend reads them from the token, so a mismatch asks the user to
 * sign in again.
 */
export const useAccessSync = () => {
  const notify = useNotify();
  const setAccess = useAuthStore((state) => state.setAccess);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const lastRefresh = useRef(0);
  const warnedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const refresh = async (force: boolean) => {
      if (!force && Date.now() - lastRefresh.current < MIN_REFRESH_INTERVAL_MS) return;
      lastRefresh.current = Date.now();
      try {
        const access = await accessService.getMyAccess();
        if (cancelled) return;
        setAccess(access);

        const tokenPermissions = getTokenPermissions(useAuthStore.getState().token);
        const key = [...access.permissions].sort().join(',');
        if (tokenPermissions && !sameSet(tokenPermissions, access.permissions) && warnedFor.current !== key) {
          warnedFor.current = key;
          notify.warning('Your access has changed. Sign out and sign in again to apply it everywhere.');
        }
      } catch (error) {
        // Not fatal: the stored permissions stay in use and every action is still checked by the backend
        if (import.meta.env.DEV && !axios.isCancel(error)) console.warn('[access] refresh failed', error);
      }
    };

    void refresh(true);
    const onFocus = () => void refresh(false);
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated, notify, setAccess]);
};
