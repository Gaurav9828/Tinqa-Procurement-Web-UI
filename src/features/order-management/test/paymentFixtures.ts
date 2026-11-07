import type { ApiResponse } from '../../../types/common.types';
import type { SupplierPaymentEntry, OrderPayments, PaymentSummary } from '../types/supplierPayment.types';

/** A 30 / 30 / 40 plan on an order worth 1180.00 (GST included), nothing paid yet; override what a test needs. */
export const paymentSummary = (patch: Partial<PaymentSummary> = {}): PaymentSummary => ({
  orderId: 1,
  orderNumber: 'ORD-1',
  orderStatus: 'SHIPPED',
  hasPlan: true,
  advancePercent: 30,
  midtermPercent: 30,
  finalPercent: 40,
  expectedPaymentMethod: 'BANK_TRANSFER',
  orderValue: 1180,
  tested: false,
  unitsPassed: 0,
  unitsFailed: 0,
  payable: 1180,
  paid: 0,
  pendingPayments: 0,
  refunded: 0,
  pendingRefunds: 0,
  outstanding: 1180,
  payableNow: 708,
  openMilestones: ['ADVANCE', 'MIDTERM'],
  milestones: [
    { milestone: 'ADVANCE', percent: 30, planned: 354, paid: 0, pending: 0, due: true },
    { milestone: 'MIDTERM', percent: 30, planned: 354, paid: 0, pending: 0, due: true },
    { milestone: 'FINAL', percent: 40, planned: 472, paid: 0, pending: 0, due: false },
  ],
  claim: null,
  ...patch,
});

export const paymentEntry = (patch: Partial<SupplierPaymentEntry> = {}): SupplierPaymentEntry => ({
  id: 11,
  orderId: 1,
  orderNumber: 'ORD-1',
  supplierName: 'Acme Traders',
  kind: 'PAYMENT',
  milestone: 'ADVANCE',
  amount: 354,
  method: 'BANK_TRANSFER',
  reference: 'UTR-1',
  paidOn: '2026-10-05',
  note: null,
  reversesId: null,
  reversed: false,
  status: 'APPROVED',
  recordedBy: 50,
  recordedByUsername: 'payments.l1',
  recordedAt: '2026-10-05T10:00:00Z',
  decidedByUsername: 'payments.l2',
  decidedAt: '2026-10-05T11:00:00Z',
  decisionReason: null,
  ...patch,
});

export const paymentsOf = (summary: PaymentSummary = paymentSummary(), entries: SupplierPaymentEntry[] = []): ApiResponse<OrderPayments> =>
  ({ success: true, message: '', data: { summary, entries } }) as ApiResponse<OrderPayments>;
