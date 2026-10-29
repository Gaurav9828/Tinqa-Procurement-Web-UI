import type { OrderStatus } from '../../../types/common.types';

/** GET /v1/dealer-portal/me: the dealer the signed-in dealer login belongs to. */
export interface DealerProfile {
  dealerId: number;
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

export interface DealerItem {
  id: number;
  name: string;
  brand: string | null;
  sku: string;
  unitOfMeasure: string;
  /** The item's existing price; quoting another price needs a reason. */
  mrp: number | null;
}

/** The quotation terms a dealer may change. In a change only the proposed fields are set. */
export interface QuotationTerms {
  itemId?: number | null;
  itemName?: string | null;
  orderQuantity?: number | null;
  unitType?: string | null;
  unitPrice?: number | null;
  shipmentPrice?: number | null;
  /** The GST breakup as stored (see order-management/utils/quotationTax); {} when removed. */
  taxBreakup?: Record<string, unknown> | null;
  expectedDelivery?: string | null;
  note?: string | null;
}

export type ChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface DealerChange {
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

export interface DealerStatusStep {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: string;
  reason: string | null;
}

export interface DealerOrder {
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
  orderStatus: OrderStatus;
  orderDate: string;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  createdAt: string;
  note: string | null;
  /** Raised by the dealer themselves, rather than by a Dealer Manager on their behalf. */
  raisedByYou: boolean;
  /** A change can be requested now: still a quotation and no other change is waiting. */
  changeable: boolean;
  /** Approved by the procurement team and waiting for you to accept or reject it. */
  awaitingYourResponse: boolean;
  /** Confirmed and not yet shipped: you can mark it as shipped. */
  shippable: boolean;
  pendingChange: DealerChange | null;
  /** Only on GET /orders/{id}. */
  history?: DealerStatusStep[] | null;
  changes?: DealerChange[] | null;
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
  note?: string;
  /** Required when unitPrice differs from the item's MRP. */
  priceChangeReason?: string;
}

export type OrderDecision = 'ACCEPT' | 'REJECT';

/** The dealer's answer to an order awaiting them; a rejection needs a reason. */
export interface OrderResponseRequest {
  decision: OrderDecision;
  reason?: string;
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
  note?: string;
  reason?: string;
}
