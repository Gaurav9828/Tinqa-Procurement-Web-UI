import { useCallback, useRef, useState } from 'react';
import { refundApi } from '../api/refundApi';
import type { Refund, RefundRequestPayload } from '../types/refund.types';
import type { ApiResponse } from '../../../types/common.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode, getApiFieldErrors } from '../../../utils/apiError';
import { getApiErrorKind } from '../../../utils/apiErrorKind';
import { refundErrorMessage } from '../utils/refund.utils';

export interface RefundMutationResult {
  ok: boolean;
  refund?: Refund;
  /** Backend `errors[]` keyed by field (reason, amountPaise, speed, paymentId, comment). */
  fieldErrors: Record<string, string>;
  errorCode: string | null;
}

interface MutationConfig<A extends unknown[]> {
  call: (...args: A) => Promise<ApiResponse<Refund>>;
  success: string;
  failure: string;
  /** Action-specific wording for some error codes (wins over the server message). */
  messages?: Partial<Record<string, string>>;
  /** Reload whatever shows the refund (and the order): run after success and after any failure that may have changed state. */
  onChanged: () => void;
}

/**
 * One refund action. A ref blocks double submits before re-render; the UI never updates refund or order
 * state itself — it reloads from the server (`onChanged`). Outcomes are reported via the global alert.
 */
const useRefundMutation = <A extends unknown[]>({ call, success, failure, messages, onChanged }: MutationConfig<A>) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const notify = useNotify();

  const run = useCallback(
    async (...args: A): Promise<RefundMutationResult> => {
      if (inFlight.current) return { ok: false, fieldErrors: {}, errorCode: null };
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const res = await call(...args);
        if (!res.success) {
          notify.error(refundErrorMessage(res, failure, messages));
          onChanged();
          return { ok: false, fieldErrors: {}, errorCode: res.errorCode };
        }
        notify.success(res.message || success);
        onChanged();
        return { ok: true, refund: res.data, fieldErrors: {}, errorCode: null };
      } catch (err: unknown) {
        const errorCode = getApiErrorCode(err);
        const kind = getApiErrorKind(err);
        const fieldErrors = getApiFieldErrors(err);
        if (Object.keys(fieldErrors).length) {
          // 400 VALIDATION_FAILED: shown on the fields; nothing changed on the server.
          notify.error(err, failure);
          return { ok: false, fieldErrors, errorCode };
        }
        const message = refundErrorMessage(err, failure, messages);
        if (errorCode === 'REFUND_NOT_AWAITING_APPROVAL') notify.warning(message);
        else notify.error(message);
        // 409 / 404 / 502: the refund or order may have moved on (e.g. now FAILED or still APPROVED) — show the real state.
        // 403, 400, 405, 429 and network errors changed nothing, so the page stays as it is.
        if (kind === 'conflict' || kind === 'notFound' || kind === 'server') onChanged();
        return { ok: false, fieldErrors: {}, errorCode };
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [call, success, failure, messages, onChanged, notify]
  );

  return { run, isSubmitting };
};

const APPROVE_MESSAGES = {
  REFUND_SELF_APPROVAL_NOT_ALLOWED: 'Another approver must approve this refund — you requested it.',
  RAZORPAY_UNAVAILABLE: "Couldn't reach Razorpay. The refund is still approved — use Retry approval to try again.",
};
const SYNC_MESSAGES = { RAZORPAY_UNAVAILABLE: "Couldn't reach Razorpay, try again." };

/** L1: POST /admin/orders/{orderNumber}/refunds. */
export const useRequestRefund = (orderNumber: string, onChanged: () => void) => {
  const call = useCallback((payload: RefundRequestPayload) => refundApi.requestRefund(orderNumber, payload), [orderNumber]);
  const { run, isSubmitting } = useRefundMutation({
    call,
    success: 'Refund requested. An approver must approve it before any money is sent.',
    failure: 'The refund could not be requested.',
    onChanged,
  });
  return { requestRefund: run, isSubmitting };
};

/** L2: POST /admin/refunds/{id}/approve — also retries an APPROVED refund whose Razorpay call failed. */
export const useApproveRefund = (onChanged: () => void) => {
  const { run, isSubmitting } = useRefundMutation({
    call: refundApi.approveRefund,
    success: 'Refund approved and sent to Razorpay.',
    failure: 'The refund could not be approved.',
    messages: APPROVE_MESSAGES,
    onChanged,
  });
  return { approveRefund: run, isSubmitting };
};

/** L2: POST /admin/refunds/{id}/reject with a comment. */
export const useRejectRefund = (onChanged: () => void) => {
  const { run, isSubmitting } = useRefundMutation({
    call: refundApi.rejectRefund,
    success: 'Refund rejected.',
    failure: 'The refund could not be rejected.',
    onChanged,
  });
  return { rejectRefund: run, isSubmitting };
};

/** L1/L2: POST /admin/refunds/{id}/sync — latest state from Razorpay. */
export const useSyncRefund = (onChanged: () => void) => {
  const { run, isSubmitting } = useRefundMutation({
    call: refundApi.syncRefund,
    success: 'Refund status refreshed.',
    failure: "The refund status couldn't be refreshed.",
    messages: SYNC_MESSAGES,
    onChanged,
  });
  return { syncRefund: run, isSubmitting };
};
