import type {
  AddCheckpointRequest,
  CheckpointEvent,
  EnableReturnRequest,
  InspectionOutcome,
  RejectReturnRequest,
  ReturnChargeRequest,
  ReturnInspectionRequest,
} from '../types/orderTracking.types';
import { decencyError } from '../../../utils/decency';

/** Backend limits (Ecommerce ReturnDTOs / CheckpointService.AddRequest). */
export const RETURN_TEXT_MAX_LENGTH = 500;
export const CHECKPOINT_PLACE_MAX_LENGTH = 120;
export const CHECKPOINT_CITY_MAX_LENGTH = 100;

const RUPEES = /^\d+(\.\d{1,2})?$/;
/** A return charge: at most 9 integer digits and 2 decimals (Ecommerce ReturnDTOs). */
const CHARGE_RUPEES = /^\d{1,9}(\.\d{1,2})?$/;
const PINCODE = /^[1-9]\d{5}$/;

type Checked<T> = { payload: T; errors: null } | { payload: null; errors: Record<string, string> };

const done = <T,>(payload: T, errors: Record<string, string>): Checked<T> =>
  Object.keys(errors).length ? { payload: null, errors } : { payload, errors: null };

export interface ReturnChargeInput {
  charge: string;
  chargeReason: string;
}

/** Requesting a return from the customer's ticket: one of their messages is their reason; staff add a note at most. */
export interface EnableReturnInput extends ReturnChargeInput {
  /** The picked customer message; null until one is picked (the latest is preselected). */
  customerMessageId: number | null;
  staffNote: string;
}

/** Text staff write: required or not, within the limit, and polite (the courtesy check). */
const checkText = (text: string, tooLong: string): string => {
  if (text.length > RETURN_TEXT_MAX_LENGTH) return tooLong;
  return decencyError(text);
};

/** The charge (₹0 or more, no upper limit against the order) and its reason, required when charging. */
const checkCharge = (input: ReturnChargeInput, errors: Record<string, string>): ReturnChargeRequest => {
  const chargeReason = input.chargeReason.trim();
  const chargeText = input.charge.trim() || '0';
  let chargeAmount = 0;
  if (!CHARGE_RUPEES.test(chargeText)) errors.chargeAmount = 'Enter the charge in rupees (0 or more, at most 2 decimals).';
  else chargeAmount = Number(chargeText);
  if (chargeAmount > 0 && !chargeReason) errors.chargeReason = 'Say what the return charge is for.';
  else if (chargeAmount > 0) {
    const problem = checkText(chargeReason, `Keep it within ${RETURN_TEXT_MAX_LENGTH} characters.`);
    if (problem) errors.chargeReason = problem;
  }
  return { chargeAmount, chargeReason: chargeAmount > 0 ? chargeReason : null };
};

/**
 * One of the customer's own messages picked as their reason, a valid charge (see checkCharge) and an optional, polite
 * staff note. Only the message's id is sent: the server copies its text, so nobody can reword the customer.
 */
export const validateEnableReturn = (input: EnableReturnInput, ticketReference: string): Checked<EnableReturnRequest> => {
  const errors: Record<string, string> = {};
  if (input.customerMessageId === null) errors.customerMessageId = "Pick the customer's message that explains why they want to return it.";
  const staffNote = input.staffNote.trim();
  const noteProblem = checkText(staffNote, `Keep the note within ${RETURN_TEXT_MAX_LENGTH} characters.`);
  if (noteProblem) errors.staffNote = noteProblem;
  const charge = checkCharge(input, errors);
  return done(
    { ticketReference, customerMessageId: input.customerMessageId ?? 0, ...charge, ...(staffNote ? { staffNote } : {}) },
    errors
  );
};

/** Approving a request or changing the charge of an enabled return. */
export const validateReturnCharge = (input: ReturnChargeInput): Checked<ReturnChargeRequest> => {
  const errors: Record<string, string> = {};
  const charge = checkCharge(input, errors);
  return done(charge, errors);
};

/** Rejecting a request: the reason is required and shown to the customer. */
export const validateRejectReturn = (reasonText: string): Checked<RejectReturnRequest> => {
  const reason = reasonText.trim();
  if (!reason) return { payload: null, errors: { reason: 'Say why the return is rejected; the customer sees it.' } };
  const problem = checkText(reason, `Keep the reason within ${RETURN_TEXT_MAX_LENGTH} characters.`);
  if (problem) return { payload: null, errors: { reason: problem } };
  return { payload: { reason }, errors: null };
};

export type ChargeSettlementHint = 'free' | 'deduct-or-pay' | 'pay-only' | 'unknown';

/**
 * What the customer will be able to do with a charge: nothing to settle (free), have it deducted from the refund or pay
 * it (charge less than the order amount), or only pay it before the return starts (charge equal to or above it).
 */
export const chargeSettlementHint = (chargeText: string, orderAmount: number | null | undefined): ChargeSettlementHint => {
  const text = chargeText.trim() || '0';
  if (!CHARGE_RUPEES.test(text)) return 'unknown';
  const charge = Number(text);
  if (charge === 0) return 'free';
  if (orderAmount === null || orderAmount === undefined) return 'unknown';
  return charge < orderAmount ? 'deduct-or-pay' : 'pay-only';
};

export interface InspectionInput {
  outcome: InspectionOutcome | '';
  refundAmount: string;
  note: string;
}

/**
 * Partial needs a refund amount above ₹0; Partial and Fail need a note. The upper bound (less than the full refund,
 * which depends on what was paid and refunded) is checked by the server and shown on the field.
 */
export const validateInspection = (input: InspectionInput): Checked<ReturnInspectionRequest> => {
  const errors: Record<string, string> = {};
  const note = input.note.trim();
  if (!input.outcome) return { payload: null, errors: { outcome: 'Choose the inspection result.' } };
  let refundAmount: number | null = null;
  if (input.outcome === 'PARTIAL') {
    const text = input.refundAmount.trim();
    if (!text) errors.refundAmount = 'Enter the refund amount.';
    else if (!RUPEES.test(text) || Number(text) <= 0) errors.refundAmount = 'Enter an amount in rupees above ₹0 (at most 2 decimals).';
    else refundAmount = Number(text);
  }
  if (input.outcome !== 'PASS' && !note) {
    errors.note = input.outcome === 'PARTIAL' ? 'Say why the refund is lower.' : 'Say why the return failed inspection.';
  } else {
    const problem = checkText(note, `Keep the note within ${RETURN_TEXT_MAX_LENGTH} characters.`);
    if (problem) errors.note = problem;
  }
  return done(
    {
      outcome: input.outcome,
      ...(refundAmount !== null ? { refundAmount } : {}),
      ...(note ? { note } : {}),
    },
    errors
  );
};

export interface CheckpointInput {
  event: CheckpointEvent;
  place: string;
  city: string;
  pincode: string;
  /** `datetime-local` value ("2026-11-09T14:30"), or '' for now. */
  occurredAt: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A Date as a `datetime-local` value in the browser's time zone. */
export const toDateTimeLocal = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Place required; PIN, when given, is 6 digits; the time, when given, is not in the future. */
export const validateCheckpoint = (input: CheckpointInput, now: Date): Checked<AddCheckpointRequest> => {
  const errors: Record<string, string> = {};
  const place = input.place.trim();
  const city = input.city.trim();
  const pincode = input.pincode.trim();
  if (!place) errors.place = 'Enter the place reached or left.';
  else if (place.length > CHECKPOINT_PLACE_MAX_LENGTH) errors.place = `Keep the place within ${CHECKPOINT_PLACE_MAX_LENGTH} characters.`;
  if (city.length > CHECKPOINT_CITY_MAX_LENGTH) errors.city = `Keep the city within ${CHECKPOINT_CITY_MAX_LENGTH} characters.`;
  if (pincode && !PINCODE.test(pincode)) errors.pincode = 'PIN code must be 6 digits.';
  if (input.occurredAt) {
    const when = new Date(input.occurredAt);
    if (Number.isNaN(when.getTime())) errors.occurredAt = 'Enter a valid date and time.';
    else if (when.getTime() > now.getTime()) errors.occurredAt = "A checkpoint can't be in the future.";
  }
  return done(
    {
      event: input.event,
      place,
      ...(city ? { city } : {}),
      ...(pincode ? { pincode } : {}),
      ...(input.occurredAt ? { occurredAt: `${input.occurredAt}:00` } : {}),
    },
    errors
  );
};
