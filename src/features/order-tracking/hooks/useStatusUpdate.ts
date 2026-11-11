import { useCallback, useRef, useState } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import { useNotify } from '../../../hooks/useNotify';
import { getApiFieldErrors } from '../../../utils/apiError';
import { getApiErrorKind } from '../../../utils/apiErrorKind';

/** Backend limit for notes on both update endpoints. */
export const STATUS_NOTES_MAX_LENGTH = 500;

/**
 * Moves that start a shipping leg: the cost of that leg is entered with the move (Ecommerce VoucherService
 * SHIPPING_COST_STATUSES) and sent for approval as an expense. Shipping out requires it.
 */
export const SHIPPING_COST_STATUSES: ReadonlySet<string> = new Set(['SHIPPED', 'DELIVERY_REATTEMPT', 'OUT_FOR_PICKUP', 'RETURN_PICKED_UP']);
export const SHIPPING_COST_REQUIRED: ReadonlySet<string> = new Set(['SHIPPED']);

/** The customer's delivery code: 7 letters and digits, case-sensitive (Ecommerce DeliveryCodeService). */
export const DELIVERY_CODE_LENGTH = 7;
export const DELIVERY_CODE_PATTERN = /^[A-Za-z0-9]{7}$/;

export interface ShippingCostInput {
  cost: string;
  partner: string;
}

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
 * DELIVERED carries the customer's delivery code; a wrong one comes back as a `deliveryCode` field error.
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
    async (
      orderNumber: string,
      status: string,
      notes: string,
      shipping?: ShippingCostInput,
      deliveryCode?: string
    ): Promise<StatusUpdateResult> => {
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

      // Delivered only with the code the customer gives once the device is set up and working
      const code = status === 'DELIVERED' ? (deliveryCode ?? '').trim() : '';
      if (status === 'DELIVERED' && !DELIVERY_CODE_PATTERN.test(code)) {
        return {
          ok: false,
          fieldErrors: { deliveryCode: `Enter the ${DELIVERY_CODE_LENGTH}-character code the customer gives you (letters and digits).` },
        };
      }

      let shippingCost: number | null = null;
      let shippingPartner: string | null = null;
      if (!deliveryOnly && SHIPPING_COST_STATUSES.has(status) && shipping) {
        const cost = shipping.cost.trim();
        if (!cost && SHIPPING_COST_REQUIRED.has(status)) {
          return { ok: false, fieldErrors: { shippingCost: 'Enter what this shipment costs (0 if nothing).' } };
        }
        if (cost) {
          if (!/^\d+(\.\d{1,2})?$/.test(cost)) {
            return { ok: false, fieldErrors: { shippingCost: 'Enter an amount in rupees with at most 2 decimals.' } };
          }
          shippingCost = Number(cost);
          shippingPartner = shipping.partner.trim() || null;
        }
      }

      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const update = deliveryOnly ? orderTrackingApi.updateDeliveryStatus : orderTrackingApi.updateTracking;
        const payload = {
          status,
          notes: finalNotes,
          ...(shippingCost === null ? {} : { shippingCost, shippingPartner }),
          ...(code ? { deliveryCode: code } : {}),
        };
        const res = await update(orderNumber, payload);

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
