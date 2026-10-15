import { useCallback, useRef, useState } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import { useNotify } from '../../../hooks/useNotify';
import { getApiFieldErrors } from '../../../utils/apiError';
import { getApiErrorKind } from '../../../utils/apiErrorKind';

/** Backend limit for notes on both update endpoints. */
export const STATUS_NOTES_MAX_LENGTH = 500;

export interface StatusUpdateResult {
  ok: boolean;
  /** Field-level errors (client validation or backend `errors[]`), keyed by field name. */
  fieldErrors: Record<string, string>;
}

/**
 * Submits one forward status move: PATCH /orders/{n}/tracking (JSON { status, notes }), which appends
 * one history event and updates orderStatus. Authorization, audit fields and the authoritative
 * transition rules are the backend's job; `isAllowed` mirrors the workflow so invalid moves are never sent.
 * `deliveryOnly` (delivery riders) sends to PATCH /orders/{n}/delivery-status instead, which takes delivery outcomes only.
 */
export const useStatusUpdate = (
  isAllowed: (status: string) => boolean,
  {
    onSuccess,
    onConflict,
    deliveryOnly = false,
  }: {
    onSuccess?: (orderNumber: string) => void;
    /** 409: the order changed server-side (e.g. another admin), so the shown state is stale. */
    onConflict?: (orderNumber: string) => void;
    deliveryOnly?: boolean;
  } = {}
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A ref, not state, so a rapid double-click cannot slip past before re-render.
  const inFlight = useRef(false);
  const notify = useNotify();

  const submit = useCallback(
    async (orderNumber: string, status: string, notes: string): Promise<StatusUpdateResult> => {
      if (inFlight.current) return { ok: false, fieldErrors: {} };

      if (!status) {
        return { ok: false, fieldErrors: { status: 'Please select a status.' } };
      }
      if (!isAllowed(status)) {
        return { ok: false, fieldErrors: { status: 'This status change is not allowed from the order\'s current stage.' } };
      }
      const trimmedNotes = notes.trim();
      if (trimmedNotes.length > STATUS_NOTES_MAX_LENGTH) {
        return { ok: false, fieldErrors: { notes: `Notes cannot exceed ${STATUS_NOTES_MAX_LENGTH} characters.` } };
      }
      const finalNotes = trimmedNotes || null;

      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const update = deliveryOnly ? orderTrackingApi.updateDeliveryStatus : orderTrackingApi.updateTracking;
        const res = await update(orderNumber, { status, notes: finalNotes });

        if (!res.success) {
          notify.error(res, 'Failed to update order status.');
          return { ok: false, fieldErrors: {} };
        }
        notify.success(res.message || 'Order status updated successfully.');
        onSuccess?.(orderNumber);
        return { ok: true, fieldErrors: {} };
      } catch (err: unknown) {
        notify.error(err, 'Failed to update order status.');
        if (getApiErrorKind(err) === 'conflict') onConflict?.(orderNumber);
        return { ok: false, fieldErrors: getApiFieldErrors(err) };
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [isAllowed, notify, onSuccess, onConflict, deliveryOnly]
  );

  return { isSubmitting, submit };
};
