import { useCallback, useState } from 'react';
import { useNotify } from './useNotify';
import type { ApiResponse } from '../types/common.types';

interface ActionMessages {
  success: string;
  failure: string;
  /** Called with the thrown error (after the alert), e.g. to show backend field errors inline. */
  onError?: (err: unknown) => void;
}

/**
 * Runs a mutating API call with the standard submit-state → global alert → refetch flow.
 * The server's own `message` is shown when present. Resolves to `true` only on success.
 */
export const useApiAction = (onSuccess?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useNotify();

  const run = useCallback(
    async <T,>(call: () => Promise<ApiResponse<T>>, messages: ActionMessages): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const res = await call();
        if (res.success) {
          notify.success(res.message || messages.success);
          onSuccess?.();
          return true;
        }
        notify.error(res.message || messages.failure);
        return false;
      } catch (err: unknown) {
        notify.error(err, messages.failure);
        messages.onError?.(err);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [notify, onSuccess]
  );

  /** Report a client-side validation failure through the same channel. */
  const reject = useCallback(
    (message: string) => {
      notify.error(message);
      return false;
    },
    [notify]
  );

  return { isSubmitting, run, reject };
};
