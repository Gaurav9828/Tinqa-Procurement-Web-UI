import type { OrderStatus } from "../../../types/common.types";
import type { QuotationTerms } from "../../supplier-portal/types/supplierPortal.types";
import type { PaymentMethod } from "../utils/paymentPlan";

export interface CreateOrderRequest {
  supplierId: number;
  itemId: number;
  orderQuantity: number;
  unitType: string;
  unitPrice: number;
  shipmentPrice: number;
  taxBreakup?: Record<string, any>;
  /** Payment plan: the final part (paid after testing) is the rest of 100 %. */
  advancePercent: number;
  midtermPercent: number;
  expectedPaymentMethod: PaymentMethod;
  expectedDelivery?: string;
  orderDate: string;
  additionalInfo?: Record<string, any>;
}

export interface UpdateOrderStatusRequest {
  /** Must be an allowed next status of the order's current one (see utils/orderWorkflow). */
  status: OrderStatus;
  /** Required when moving to DELIVERED. */
  actualDelivery?: string;
  /** Required for cancel, return request/rejection and failed refunds; optional otherwise. */
  reason?: string;
  /** DELIVERED only: a Level 2 approver accepting a supplier's invoice that didn't match the quotation. */
  invoiceOverrideReason?: string;
}

export type InvoiceVerificationStatus = 'MATCHED' | 'MISMATCH' | 'UNVERIFIED';

/** One figure compared between the quotation and the supplier's invoice. Amounts are rupee text; for gstin, GSTINs. */
export interface InvoiceCheck {
  key: 'text' | 'grandTotal' | 'taxableValue' | 'cgst' | 'sgst' | 'igst' | 'cess' | 'gstin';
  label: string;
  expected: string | null;
  /** null when the invoice doesn't show it */
  found: string | null;
  ok: boolean;
  message: string | null;
}

/** GET/POST /v1/orders/{id}/invoice: the supplier's invoice that counts for the order (the latest upload). */
export interface OrderInvoice {
  id: number;
  orderId: number;
  fileName: string | null;
  invoiceNumber: string | null;
  status: InvoiceVerificationStatus;
  expectedTotal: number;
  foundTotal: number | null;
  checks: InvoiceCheck[];
  uploadedByUsername: string | null;
  uploadedAt: string;
  overrideByUsername: string | null;
  overrideAt: string | null;
  overrideReason: string | null;
  /** Can be delivered without an approver's override. */
  matched: boolean;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  itemId: number;
  itemName: string;
  orderQuantity: number;
  unitType: string;
  unitPrice: number;
  totalPrice: number;
  shipmentPrice: number;
  taxBreakup: Record<string, any> | null;
  /** Payment plan; null on orders made before plans existed. */
  advancePercent?: number | null;
  midtermPercent?: number | null;
  /** 100 less the advance and the midterm: paid after the delivered units are tested. */
  finalPercent?: number | null;
  expectedPaymentMethod?: PaymentMethod | null;
  orderStatus: OrderStatus;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  orderDate: string;
  additionalInfo: Record<string, any> | null;
  createdAt: string;
  createdBy: number;
  /** The supplier raised this quotation from their supplier login. */
  raisedBySupplier?: boolean;
  /** A supplier's change waits for approval: the quotation can't be edited, submitted or cancelled until it is decided. */
  supplierChangePending?: boolean;
}

export interface UpdateOrderRequest {
  supplierId?: number;
  itemId?: number;
  orderQuantity?: number;
  unitType?: string;
  unitPrice?: number;
  shipmentPrice?: number;
  taxBreakup?: Record<string, any>;
  advancePercent?: number;
  midtermPercent?: number;
  expectedPaymentMethod?: PaymentMethod;
  // null clears a previously set date.
  expectedDelivery?: string | null;
  orderDate?: string;
  additionalInfo?: Record<string, any>;
}

/** A supplier's proposed change to a quotation (GET /v1/orders/change-requests). Only the proposed fields are set in `changes`. */
export interface OrderChangeRequest {
  id: number;
  orderId: number;
  orderNumber: string | null;
  orderStatus: OrderStatus | null;
  supplierId: number | null;
  supplierName: string | null;
  changes: QuotationTerms;
  previous: QuotationTerms;
  /** Order total if approved (pending requests only). */
  proposedTotalPrice: number | null;
  currentTotalPrice: number | null;
  /** The MRP of the item the quotation would have once approved, to compare the unit price with. */
  itemPrice?: number | null;
  /** The supplier's reason (required by the server when the unit price changes). */
  note: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  requestedByUsername: string | null;
  requestedAt: string;
  decidedByUsername: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
}
