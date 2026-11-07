import { calculateTax, type TaxForm } from "./quotationTax";
import type { OrderStatus } from "../../../types/common.types";

/**
 * A quotation's payment plan: how the dealer wants to be paid. The advance and the midterm percentages are typed in;
 * the final part is whatever is left of 100 % and is paid only after the delivered units are tested (the stock entry
 * is approved). Mirrors Procurement's PaymentPlan.
 */
export type PaymentMethod = 'CASH' | 'ONLINE' | 'BANK_TRANSFER' | 'CHEQUE';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  ONLINE: 'Online payment',
  BANK_TRANSFER: 'Bank to bank transfer',
  CHEQUE: 'Cheque',
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export interface PaymentPlanForm {
  advancePercent: string;
  /** Some dealers want only an advance and the final payment: no midterm part (sent as 0 %). */
  midtermEnabled: boolean;
  midtermPercent: string;
  expectedPaymentMethod: PaymentMethod | '';
}

/** The plan a new quotation starts with: 30 % advance, 30 % midterm, 40 % after testing. */
export const DEFAULT_PAYMENT_PLAN: PaymentPlanForm = { advancePercent: '30', midtermEnabled: true, midtermPercent: '30', expectedPaymentMethod: '' };

export interface PaymentPlanFields {
  advancePercent?: number | null;
  midtermPercent?: number | null;
  expectedPaymentMethod?: PaymentMethod | null;
}

/** The form for a saved plan; an order made before plans existed starts from the default. */
export const planFormFrom = (saved: PaymentPlanFields | null | undefined): PaymentPlanForm =>
  saved?.advancePercent == null || saved.midtermPercent == null
    ? { ...DEFAULT_PAYMENT_PLAN, expectedPaymentMethod: saved?.expectedPaymentMethod ?? '' }
    : {
        advancePercent: String(Number(saved.advancePercent)),
        // A saved 0 % midterm is a plan without one
        midtermEnabled: Number(saved.midtermPercent) > 0,
        midtermPercent: Number(saved.midtermPercent) > 0 ? String(Number(saved.midtermPercent)) : '',
        expectedPaymentMethod: saved.expectedPaymentMethod ?? '',
      };

const PERCENT = /^\d{1,3}(\.\d{1,2})?$/;

/** The midterm percentage as typed, or '0' when there is no midterm part. */
const midtermText = (form: Pick<PaymentPlanForm, 'midtermEnabled' | 'midtermPercent'>): string =>
  form.midtermEnabled === false ? '0' : form.midtermPercent.trim();

/** What is left of 100 % after the advance and the midterm, or null while either is not a valid percentage. */
export const finalPercentOf = (form: Pick<PaymentPlanForm, 'advancePercent' | 'midtermPercent'> & { midtermEnabled?: boolean }): number | null => {
  const midterm = midtermText({ midtermEnabled: form.midtermEnabled ?? true, midtermPercent: form.midtermPercent });
  if (!PERCENT.test(form.advancePercent.trim()) || !PERCENT.test(midterm)) return null;
  // In hundredths, so 33.33 + 33.33 leaves exactly 33.34
  const left = 10000 - Math.round(Number(form.advancePercent) * 100) - Math.round(Number(midterm) * 100);
  return left / 100;
};

/** Field errors keyed like the backend (advancePercent, midtermPercent, expectedPaymentMethod). */
export const validatePlanForm = (form: PaymentPlanForm): Record<string, string> => {
  const errors: Record<string, string> = {};
  const advance = form.advancePercent.trim();
  if (advance === '') errors.advancePercent = 'Advance percentage is required (0 for none).';
  else if (!PERCENT.test(advance) || Number(advance) > 100) errors.advancePercent = 'Advance must be a percentage from 0 to 100, with at most 2 decimals.';
  if (form.midtermEnabled) {
    const midterm = form.midtermPercent.trim();
    if (midterm === '') errors.midtermPercent = 'Midterm percentage is required, or untick the midterm payment.';
    else if (!PERCENT.test(midterm) || Number(midterm) > 100) errors.midtermPercent = 'Midterm must be a percentage from 0 to 100, with at most 2 decimals.';
    else if (Number(midterm) === 0) errors.midtermPercent = 'Untick the midterm payment instead of giving it 0%.';
  }
  const left = finalPercentOf(form);
  if (!errors.advancePercent && !errors.midtermPercent && left !== null && left < 0) {
    errors.midtermPercent = `Advance and midterm together cannot be more than 100% (they are ${100 - left}%).`;
  }
  if (!form.expectedPaymentMethod) errors.expectedPaymentMethod = 'Choose how the dealer expects to be paid.';
  return errors;
};

/** The request fields for a valid form. */
export const planPayload = (form: PaymentPlanForm): Required<{ [K in keyof PaymentPlanFields]: NonNullable<PaymentPlanFields[K]> }> => ({
  advancePercent: Number(form.advancePercent),
  midtermPercent: Number(midtermText(form)),
  expectedPaymentMethod: form.expectedPaymentMethod as PaymentMethod,
});

/** Only the plan fields that differ from the saved ones (an edit or a dealer's change sends just those). */
export interface PlanChange {
  advancePercent?: number;
  midtermPercent?: number;
  expectedPaymentMethod?: PaymentMethod;
}

export const planChanges = (form: PaymentPlanForm, saved: PaymentPlanFields | null | undefined): PlanChange => {
  const next = planPayload(form);
  const changes: PlanChange = {};
  if (saved?.advancePercent == null || Number(saved.advancePercent) !== next.advancePercent) changes.advancePercent = next.advancePercent;
  if (saved?.midtermPercent == null || Number(saved.midtermPercent) !== next.midtermPercent) changes.midtermPercent = next.midtermPercent;
  if ((saved?.expectedPaymentMethod ?? null) !== next.expectedPaymentMethod) changes.expectedPaymentMethod = next.expectedPaymentMethod;
  return changes;
};

const percentText = (value: number) => `${Number(value.toFixed(2))}%`;

/** "30% advance · 30% midterm · 40% after testing · Bank to bank transfer", or null without a plan. */
export const describePlan = (plan: PaymentPlanFields | null | undefined): string | null => {
  if (plan?.advancePercent == null || plan.midtermPercent == null) return null;
  const rest = 100 - Number(plan.advancePercent) - Number(plan.midtermPercent);
  const parts = [`${percentText(Number(plan.advancePercent))} advance`];
  // A plan without a midterm reads "30% advance · 70% after testing"
  if (Number(plan.midtermPercent) > 0) parts.push(`${percentText(Number(plan.midtermPercent))} midterm`);
  parts.push(`${percentText(rest)} after testing`);
  if (plan.expectedPaymentMethod) parts.push(PAYMENT_METHOD_LABELS[plan.expectedPaymentMethod]);
  return parts.join(' · ');
};

/** The quotation's total in rupees as the plan's parts are worked out on: GST included when a breakup is given. */
export const quotedTotal = (taxable: number | null, tax: TaxForm): number | null => {
  if (taxable === null) return null;
  const amounts = calculateTax(Math.round(taxable * 100), tax);
  return amounts ? amounts.grandTotal / 100 : taxable;
};

/** The errors worth showing while typing: a missing method only blocks saving (the field says it is required). */
export const shownPlanErrors = (errors: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => key !== 'expectedPaymentMethod'));

/** Whether the form differs from the saved plan (an order without one always gets one when saved). */
export const planChanged = (form: PaymentPlanForm, saved: PaymentPlanFields | null | undefined): boolean =>
  Object.keys(validatePlanForm(form)).length > 0 || Object.keys(planChanges(form, saved)).length > 0;

/** Once approved, the dealer may have been paid (the advance is due from approval on): the stages showing payments. */
export const PAYMENT_STAGES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'DEALER_LEVEL_PENDING', 'CONFIRMED', 'CANCELLED', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED',
  'RETURN_REJECTED', 'RETURN_PICKED_UP', 'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_FAILED', 'REFUND_COMPLETED',
]);
