import type { ReturnShippingMode } from '../types/supplierReturn.types';

export interface RaiseForm {
  units: string;
  reason: string;
  pieceDetails: string;
  shippingMode: ReturnShippingMode | '';
}

export interface DispatchForm {
  dispatchedOn: string;
  courier: string;
  trackingNumber: string;
  shippingCharge: string;
  note: string;
}

const WHOLE = /^\d{1,6}$/;
const MONEY = /^\d{1,8}(\.\d{1,2})?$/;

/** A return holds 1 to `unitsLeft` whole units (the failed units not in another return), with a reason and a shipping mode. */
export const validateRaise = (form: RaiseForm, unitsLeft: number): Partial<Record<keyof RaiseForm, string>> => {
  const errors: Partial<Record<keyof RaiseForm, string>> = {};
  const units = Number(form.units);
  if (!WHOLE.test(form.units.trim()) || units < 1) errors.units = 'Enter how many units go back (at least 1).';
  else if (units > unitsLeft) errors.units = `At most ${unitsLeft} failed units are left to return.`;
  if (!form.reason.trim()) errors.reason = 'Say why the pieces go back.';
  if (!form.shippingMode) errors.shippingMode = 'Choose whether TinQa ships the pieces or the supplier collects them.';
  return errors;
};

/**
 * TinQa ships: the dispatch date, the courier, the tracking number and the shipping charge (≥ 0, repaid by the
 * supplier). The supplier collects: only the pickup date. Neither date may be in the future (`today`: YYYY-MM-DD).
 */
export const validateDispatch = (form: DispatchForm, mode: ReturnShippingMode, today: string): Partial<Record<keyof DispatchForm, string>> => {
  const errors: Partial<Record<keyof DispatchForm, string>> = {};
  if (!form.dispatchedOn) errors.dispatchedOn = 'Enter the date.';
  else if (form.dispatchedOn > today) errors.dispatchedOn = 'The date can’t be in the future.';
  if (mode === 'TINQA_SHIPS') {
    if (!form.courier.trim()) errors.courier = 'Enter the courier.';
    if (!form.trackingNumber.trim()) errors.trackingNumber = 'Enter the tracking number.';
    if (!MONEY.test(form.shippingCharge.trim())) errors.shippingCharge = 'Enter the shipping charge (0 or more).';
  }
  return errors;
};
