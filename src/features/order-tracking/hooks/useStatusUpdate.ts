import { useCallback, useRef, useState } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import type { StatusUpdateMode } from '../types/orderTracking.types';
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
 * Submits a status change through exactly ONE endpoint, chosen by `mode`:
 *  - 'tracking' → PATCH /orders/{n}/tracking  (JSON { status, notes })
 *  - 'manual'   → PATCH /orders/{n}/status?status=&notes=
 * Both append a single history event server-side, so they must never both run for one action.
 * Authorization, audit fields and the authoritative transition rules are the backend's job;
 * `isAllowed` mirrors the workflow so invalid moves are never sent.
 */
export const useStatusUpdate = (
  isAllowed: (mode: StatusUpdateMode, status: string) => boolean,
  {
    onSuccess,
    onConflict,
  }: {
    onSuccess?: (orderNumber: string) => void;
    /** 409: the order changed server-side (e.g. another admin), so the shown state is stale. */
    onConflict?: (orderNumber: string) => void;
  } = {}
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A ref, not state, so a rapid double-click cannot slip past before re-render.
  const inFlight = useRef(false);
  const notify = useNotify();

  const submit = useCallback(
    async (mode: StatusUpdateMode, orderNumber: string, status: string, notes: string): Promise<StatusUpdateResult> => {
      if (inFlight.current) return { ok: false, fieldErrors: {} };

      if (!status) {
        return { ok: false, fieldErrors: { status: 'Please select a status.' } };
      }
      if (!isAllowed(mode, status)) {
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
        const res =
          mode === 'manual'
            ? await orderTrackingApi.setOrderStatus(orderNumber, status, finalNotes)
            : await orderTrackingApi.updateTracking(orderNumber, { status, notes: finalNotes });

        if (!res.success) {
          notify.error(res.message || 'Failed to update order status.');
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
    [isAllowed, notify, onSuccess, onConflict]
  );

  return { isSubmitting, submit };
};
