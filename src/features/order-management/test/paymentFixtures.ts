import type { ApiResponse } from '../../../types/common.types';
import type { SupplierPaymentEntry, OrderPayments, PaymentSettlement, PaymentSummary } from '../types/supplierPayment.types';

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
  awaitingSupplier: 0,
  refunded: 0,
  pendingRefunds: 0,
  outstanding: 1180,
  payableNow: 708,
  openMilestones: ['ADVANCE', 'MIDTERM'],
  reversalClosed: false,
  milestones: [
    { milestone: 'ADVANCE', percent: 30, planned: 354, paid: 0, pending: 0, due: true, left: 354 },
    { milestone: 'MIDTERM', percent: 30, planned: 354, paid: 0, pending: 0, due: true, left: 354 },
    { milestone: 'FINAL', percent: 40, planned: 472, paid: 0, pending: 0, due: false, left: 0 },
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
  chargeAmount: 0,
  returnId: null,
  waitsFor: null,
  ...patch,
});

export const paymentsOf = (summary: PaymentSummary = paymentSummary(), entries: SupplierPaymentEntry[] = []): ApiResponse<OrderPayments> =>
  ({ success: true, message: '', data: { summary, entries } }) as ApiResponse<OrderPayments>;

/**
 * 10 PCS × ₹100.00 + ₹50.00 shipment, 18 % GST (₹1,239.00); 8 passed, 2 failed: ₹200.00 + ₹36.00 GST taken off, so
 * worth ₹1,003.00 (the server's PaymentSettlementTest case).
 */
export const paymentSettlement = (patch: Partial<PaymentSettlement> = {}): PaymentSettlement => ({
  unitType: 'PCS',
  unitPrice: 100,
  orderedUnits: 10,
  passedUnits: 8,
  failedUnits: 2,
  shortUnits: 0,
  shipment: 50,
  gstRate: 18,
  quotedGoods: 1000,
  quotedTaxable: 1050,
  quotedGst: 189,
  orderValue: 1239,
  failedValue: 200,
  shortValue: 0,
  shipmentDropped: 0,
  gstReduction: 36,
  reduction: 236,
  passedGoods: 800,
  passedTaxable: 850,
  passedGst: 153,
  payable: 1003,
  ...patch,
});
