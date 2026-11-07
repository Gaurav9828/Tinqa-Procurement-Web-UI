import type { OrderReturns, SupplierReturn } from '../types/supplierReturn.types';

/** Two failed pieces going back, waiting for the Super Admin; override what a test needs. */
export const supplierReturn = (patch: Partial<SupplierReturn> = {}): SupplierReturn => ({
  id: 3, orderId: 1, orderNumber: 'ORD-1', supplierName: 'Acme Traders', itemName: 'Copper wire', units: 2, unitType: 'PCS', unitPrice: 100,
  reason: 'No power', pieceDetails: 'SN-1, SN-2', shippingMode: 'TINQA_SHIPS', status: 'PENDING_APPROVAL', piecesValue: 236,
  courier: null, trackingNumber: null, dispatchedOn: null, shippingCharge: null, repaymentId: null, amountDue: null,
  requestedByUsername: 'sm', requestedAt: '2026-10-20T10:00:00Z', decidedByUsername: null, decidedAt: null, decisionReason: null,
  supplierRespondedAt: null, supplierResponseReason: null, receivedAt: null, settledAt: null, cancelReason: null, events: [],
  ...patch,
});

/** An order with 5 failed units, 2 already in returns. */
export const returnsOf = (returns: SupplierReturn[], patch: Partial<OrderReturns> = {}): OrderReturns => ({
  orderId: 1, tested: true, failedUnits: 5, unitsInReturns: 2, unitsLeft: 3, canRaise: true, returns, ...patch,
});

