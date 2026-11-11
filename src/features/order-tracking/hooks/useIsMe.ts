import { useCallback } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';

/**
 * Whether a recorded staff name (a requester, an approver) is the signed-in user, by username or email. UX only, e.g.
 * to hide approve/reject from whoever raised a request: the backend enforces it (409 RETURN_SELF_APPROVAL).
 */
export const useIsMe = () => {
  const user = useAuthStore((state) => state.user);
  return useCallback(
    (who: string | null | undefined): boolean => {
      const name = who?.trim().toLowerCase();
      if (!name || !user) return false;
      return [user.username, user.email].some((own) => !!own && own.trim().toLowerCase() === name);
    },
    [user]
  );
};
