import type { OrderStatus } from '../../../types/common.types';
import type { PaymentMethod } from '../../order-management/utils/paymentPlan';

/** GET /v1/supplier-portal/me: the supplier the signed-in supplier login belongs to. */
export interface SupplierProfile {
  supplierId: number;
  name: string;
  tradeName: string | null;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber: string | null;
  street: string;
  landmark: string | null;
  city: string;
  district: string | null;
  state: string;
  country: string;
  pincode: string;
  gstin: string | null;
  panNumber: string | null;
  username: string;
}

export interface SupplierItem {
  id: number;
  name: string;
  brand: string | null;
  sku: string;
  unitOfMeasure: string;
  /** The item's existing price; quoting another price needs a reason. */
  mrp: number | null;
}

/** The quotation terms a supplier may change. In a change only the proposed fields are set. */
export interface QuotationTerms {
  itemId?: number | null;
  itemName?: string | null;
  /** Display-only: the MRP of the item a change switches to */
  itemMrp?: number | null;
  orderQuantity?: number | null;
  unitType?: string | null;
  unitPrice?: number | null;
  shipmentPrice?: number | null;
  /** The GST breakup as stored (see order-management/utils/quotationTax); {} when removed. */
  taxBreakup?: Record<string, unknown> | null;
  expectedDelivery?: string | null;
  advancePercent?: number | null;
  midtermPercent?: number | null;
  expectedPaymentMethod?: PaymentMethod | null;
  note?: string | null;
}

export type ChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface SupplierChange {
  id: number;
  changes: QuotationTerms;
  previous: QuotationTerms;
  /** Order total if the change is approved (pending changes only). */
  proposedTotalPrice: number | null;
  reason: string | null;
  status: ChangeStatus;
  requestedAt: string;
  decidedAt: string | null;
  decisionReason: string | null;
}

export interface SupplierStatusStep {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: string;
  reason: string | null;
}

export interface SupplierOrder {
  id: number;
  orderNumber: string;
  itemId: number;
  itemName: string;
  itemSku: string | null;
  orderQuantity: number;
  unitType: string;
  unitPrice: number;
  shipmentPrice: number;
  totalPrice: number;
  taxBreakup: Record<string, unknown> | null;
  /** Payment plan; null on orders made before plans existed. */
  advancePercent?: number | null;
  midtermPercent?: number | null;
  finalPercent?: number | null;
  expectedPaymentMethod?: PaymentMethod | null;
  orderStatus: OrderStatus;
  orderDate: string;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  createdAt: string;
  note: string | null;
  /** Raised by the supplier themselves, rather than by a Supplier Manager on their behalf. */
  raisedByYou: boolean;
  /** A change can be requested now: still a quotation and no other change is waiting. */
  changeable: boolean;
  /** Approved by the procurement team and waiting for you to accept or reject it. */
  awaitingYourResponse: boolean;
  /** Confirmed and not yet shipped: you can mark it as shipped. */
  shippable: boolean;
  /** Payments for this order waiting for you to confirm you received them. */
  paymentsToConfirm: number;
  /** Your own entries asking you to pay money back (REPAYMENT_DUE, or REPAYMENT_MISSING: send it again). */
  repaymentsDue: number;
  /** Returns of failed pieces waiting for your answer (AWAITING_SUPPLIER) or for you to confirm they arrived (IN_TRANSIT). */
  returnsToAnswer: number;
  pendingChange: SupplierChange | null;
  /**
   * Every term TinQa changed from what you quoted, what you quoted beside what it is now; empty when nothing changed or
   * the procurement team prepared the quotation. Accepting the order then needs changesAccepted.
   */
  changedByTinqa?: TermChange[] | null;
  /** Only on GET /orders/{id}. */
  history?: SupplierStatusStep[] | null;
  changes?: SupplierChange[] | null;
}

export interface CreateQuotationRequest {
  itemId: number;
  orderQuantity: number;
  unitType: string;
  unitPrice: number;
  shipmentPrice: number;
  /** Optional GST breakup: supplyType, gstRate, hsnSac, cgst/sgst or igst, cess. */
  taxBreakup?: Record<string, unknown>;
  expectedDelivery?: string;
  /** How you want to be paid: the final part (the rest of 100 %) is paid after the delivered units are tested. */
  advancePercent: number;
  midtermPercent: number;
  expectedPaymentMethod: PaymentMethod;
  note?: string;
  /** Required when unitPrice differs from the item's MRP. */
  priceChangeReason?: string;
}

/** One term TinQa changed from what the supplier quoted (Procurement SupplierQuotedTerms.TermChange); values are ready to show. */
export interface TermChange {
  field:
    | 'ITEM' | 'ORDER_QUANTITY' | 'UNIT_TYPE' | 'UNIT_PRICE' | 'SHIPMENT_PRICE' | 'TOTAL_PRICE' | 'GST' | 'EXPECTED_DELIVERY'
    | 'ADVANCE_PERCENT' | 'MIDTERM_PERCENT' | 'FINAL_PERCENT' | 'PAYMENT_METHOD';
  label: string;
  quoted: string;
  current: string;
}

export type OrderDecision = 'ACCEPT' | 'REJECT';

/** The supplier's answer to an order awaiting them; a rejection needs a reason. */
export interface OrderResponseRequest {
  decision: OrderDecision;
  reason?: string;
  /** Accepting an order whose terms TinQa changed (changedByTinqa) needs the supplier's agreement. */
  changesAccepted?: boolean;
}

/** Only the fields being changed, plus why. */
export interface QuotationChangeRequest {
  itemId?: number;
  orderQuantity?: number;
  unitType?: string;
  unitPrice?: number;
  shipmentPrice?: number;
  /** A new GST breakup; {} removes it. */
  taxBreakup?: Record<string, unknown>;
  expectedDelivery?: string;
  advancePercent?: number;
  midtermPercent?: number;
  expectedPaymentMethod?: PaymentMethod;
  note?: string;
  reason?: string;
}
