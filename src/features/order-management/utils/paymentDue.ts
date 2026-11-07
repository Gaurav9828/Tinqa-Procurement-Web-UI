import type { PaymentMilestone, PaymentSummary, SupplierPaymentEntry } from '../types/supplierPayment.types';

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * What a payment against `milestone` is now: set by the plan, never typed. A new payment takes the server's figure
 * (`left`: what is left of the part, within what may be paid in all now). A waiting entry being corrected gets its own
 * amount back first, as the server does (SupplierPaymentService, Figures.left).
 */
export const paymentAmountDue = (summary: PaymentSummary, milestone: PaymentMilestone, own?: SupplierPaymentEntry): number => {
  const part = summary.milestones.find((m) => m.milestone === milestone);
  if (!part || !summary.openMilestones.includes(milestone)) return 0;
  const ownPayment = own && own.status === 'PENDING_APPROVAL' && own.kind === 'PAYMENT' ? own.amount : 0;
  if (!ownPayment) return part.left;
  const ownHere = own?.milestone === milestone ? ownPayment : 0;
  const leftOfPart = part.planned - part.paid - part.pending + ownHere;
  return Math.max(0, round(Math.min(leftOfPart, summary.payableNow + ownPayment)));
};

/** The parts a payment can go against now (something left to pay), plus the entry's own part when it is corrected. */
export const payableMilestones = (summary: PaymentSummary, own?: SupplierPaymentEntry): PaymentMilestone[] =>
  summary.openMilestones.filter((m) => paymentAmountDue(summary, m, own) > 0 || m === own?.milestone);

/** The part a new payment starts on: the earliest one with something left (advance before midterm before final). */
export const nextMilestone = (summary: PaymentSummary): PaymentMilestone | '' => payableMilestones(summary)[0] ?? '';
