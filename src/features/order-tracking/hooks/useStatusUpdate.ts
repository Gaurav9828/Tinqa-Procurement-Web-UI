import { useCallback, useRef, useState } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import { useNotify } from '../../../hooks/useNotify';
import { getApiFieldErrors } from '../../../utils/apiError';
import { getApiErrorKind } from '../../../utils/apiErrorKind';
import type { UnitSerial, UpdateTrackingRequest } from '../types/orderTracking.types';

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

interface StatusUpdateInput {
  status: string;
  notes: string;
  isAllowed: (status: string) => boolean;
  deliveryOnly: boolean;
  shipping?: ShippingCostInput;
  deliveryCode?: string;
  unitSerials?: UnitSerial[];
}

const fail = (field: string, message: string) => ({ fieldErrors: { [field]: message } });

/** The shipping cost of a leg, when this move starts one: null when none was entered, or the field error. */
const checkShippingCost = (status: string, shipping: ShippingCostInput | undefined) => {
  const cost = shipping?.cost.trim() ?? '';
  if (!cost) {
    return SHIPPING_COST_REQUIRED.has(status) && shipping ? fail('shippingCost', 'Enter what this shipment costs (0 if nothing).') : { cost: null };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(cost)) return fail('shippingCost', 'Enter an amount in rupees with at most 2 decimals.');
  return { cost: Number(cost), partner: shipping?.partner.trim() || null };
};

/**
 * Checks a status move before it is sent and builds its request, or returns the field errors to show. Mirrors the
 * backend's rules so invalid moves are never sent; the backend stays authoritative.
 */
export const checkStatusUpdate = ({
  status,
  notes,
  isAllowed,
  deliveryOnly,
  shipping,
  deliveryCode,
  unitSerials,
}: StatusUpdateInput): { payload: UpdateTrackingRequest } | { fieldErrors: Record<string, string> } => {
  if (!status) return fail('status', 'Please select a status.');
  if (!isAllowed(status)) return fail('status', 'This status change is not allowed from the order\'s current stage.');
  const trimmedNotes = notes.trim();
  if (trimmedNotes.length > STATUS_NOTES_MAX_LENGTH) return fail('notes', `Notes cannot exceed ${STATUS_NOTES_MAX_LENGTH} characters.`);

  // Delivered only with the code the customer gives once the device is set up and working
  const code = status === 'DELIVERED' ? (deliveryCode ?? '').trim() : '';
  if (status === 'DELIVERED' && !DELIVERY_CODE_PATTERN.test(code)) {
    return fail('deliveryCode', `Enter the ${DELIVERY_CODE_LENGTH}-character code the customer gives you (letters and digits).`);
  }

  const payload: UpdateTrackingRequest = { status, notes: trimmedNotes || null };
  if (!deliveryOnly && SHIPPING_COST_STATUSES.has(status) && shipping) {
    const leg = checkShippingCost(status, shipping);
    if ('fieldErrors' in leg) return leg;
    if (leg.cost !== null) {
      payload.shippingCost = leg.cost;
      payload.shippingPartner = leg.partner;
    }
  }
  if (code) payload.deliveryCode = code;
  // Shipping out records the serial of every unit (the form checked each one)
  if (status === 'SHIPPED' && unitSerials && unitSerials.length > 0) payload.unitSerials = unitSerials;
  return { payload };
};

/**
 * Submits one forward status move: PATCH /orders/{n}/tracking (JSON { status, notes }), which appends
 * one history event and updates orderStatus. Authorization, audit fields and the authoritative
 * transition rules are the backend's job; `isAllowed` mirrors the workflow so invalid moves are never sent.
 * `deliveryOnly` (delivery riders) sends to PATCH /orders/{n}/delivery-status instead, which takes delivery outcomes only.
 * DELIVERED carries the customer's delivery code; a wrong one comes back as a `deliveryCode` field error.
 * SHIPPED carries the serial of every unit (`unitSerials`); a serial Procurement doesn't know, or one of another
 * product, comes back as a `unitSerials…` field error.
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
      deliveryCode?: string,
      unitSerials?: UnitSerial[]
    ): Promise<StatusUpdateResult> => {
      if (inFlight.current) return { ok: false, fieldErrors: {} };
      const checked = checkStatusUpdate({ status, notes, isAllowed, deliveryOnly, shipping, deliveryCode, unitSerials });
      if ('fieldErrors' in checked) return { ok: false, fieldErrors: checked.fieldErrors };

      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const update = deliveryOnly ? orderTrackingApi.updateDeliveryStatus : orderTrackingApi.updateTracking;
        const payload = checked.payload;
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
