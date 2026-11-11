import { useCallback, useRef, useState } from 'react';
import type { ApiResponse } from '../../../types/common.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode, getApiFieldErrors } from '../../../utils/apiError';
import { getApiErrorKind } from '../../../utils/apiErrorKind';
import { returnErrorMessage } from '../utils/returnErrors';

export interface OrderMutationResult {
  ok: boolean;
  /** Backend `errors[]` keyed by field, for showing under the inputs. */
  fieldErrors: Record<string, string>;
  errorCode: string | null;
}

interface Config<A extends unknown[], T> {
  call: (...args: A) => Promise<ApiResponse<T>>;
  success: string;
  failure: string;
  /** Reload what the action changed: after success, and after a failure that means the shown state is stale. */
  onChanged: () => void;
}

/**
 * One order action (return or checkpoint). A ref blocks double submits before re-render; the page never patches its
 * own copy of the order — it reloads from the server (`onChanged`). Outcomes go to the global alert.
 */
export const useOrderMutation = <A extends unknown[], T>({ call, success, failure, onChanged }: Config<A, T>) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const notify = useNotify();

  const run = useCallback(
    async (...args: A): Promise<OrderMutationResult> => {
      if (inFlight.current) return { ok: false, fieldErrors: {}, errorCode: null };
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const res = await call(...args);
        if (!res.success) {
          notify.error(returnErrorMessage(res, failure));
          onChanged();
          return { ok: false, fieldErrors: {}, errorCode: res.errorCode ?? null };
        }
        notify.success(res.message || success);
        onChanged();
        return { ok: true, fieldErrors: {}, errorCode: null };
      } catch (err: unknown) {
        const errorCode = getApiErrorCode(err);
        const fieldErrors = getApiFieldErrors(err);
        if (Object.keys(fieldErrors).length) {
          // 400 VALIDATION_FAILED: shown on the fields as well; nothing changed on the server.
          notify.error(err, failure);
          return { ok: false, fieldErrors, errorCode };
        }
        notify.error(returnErrorMessage(err, failure));
        // 409 / 404: the order moved on elsewhere — show its real state. 403, 400 and network errors changed nothing.
        const kind = getApiErrorKind(err);
        if (kind === 'conflict' || kind === 'notFound') onChanged();
        return { ok: false, fieldErrors: {}, errorCode };
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [call, success, failure, onChanged, notify]
  );

  return { run, isSubmitting };
};
