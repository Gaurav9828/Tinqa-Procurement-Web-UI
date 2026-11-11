// Mirrors the Ecommerce BE admin order DTOs (com.tinqa.ecommerce.dto.order.admin.*).
// LocalDateTime fields arrive as ISO strings without a zone, e.g. "2026-10-06T10:15:30".
// Status choices are not duplicated here: they come from GET /admin/orders/tracking-statuses.
// Audit fields (updatedBy, createdAt, updatedAt, current, stage) are assigned by the backend
// and are never sent by the UI.

/** OrderTrackingResponseDTO */
export interface OrderTrackingEntry {
  id: number;
  /** Normally one of the tracking statuses; kept as string so legacy values still render. */
  status: string;
  stage: string | null;
  notes: string | null;
  current: boolean | null;
  /** Admin (JWT subject) who recorded the event; null for records predating audit attribution. */
  updatedBy: string | null;
  /** Event time. */
  createdAt: string;
  updatedAt: string | null;
}

/** OrderResponseDTO.OrderItemResponseDTO */
export interface OrderItemSummary {
  productId: number;
  title: string;
  price: number;
  quantity: number;
  totalPrice: number;
  /** Accessory units bought with a parent product and the extra discount they got (already taken off totalPrice). */
  bundleQuantity?: number;
  bundleDiscountAmount?: number | null;
  /** The line was ordered while out of stock and waits for stock + admin approval. */
  preOrder?: boolean;
  /** Current stock of the product — sent for pre-order lines on the admin detail only. */
  availableStock?: number | null;
}

/** AdminCustomerSummaryDTO — null when the customer row no longer exists. */
export interface AdminCustomerSummary {
  id: number;
  name: string | null;
  email: string | null;
}

/** AdminOrderSummaryDTO — one row of GET /admin/orders. */
export interface AdminOrderSummary {
  id: number;
  orderNumber: string;
  orderStatus: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  totalAmount: number | null;
  itemCount: number;
  createdAt: string;
  /** Time of the order's latest change. */
  updatedAt: string | null;
  /** Admin who made the order's latest change; null for older records. */
  updatedBy: string | null;
  /** ONLINE (storefront) or STORE (booked by a selling agent). Missing on backends that predate store sales. */
  salesChannel?: 'ONLINE' | 'STORE' | string | null;
  /** Store sales: the agent's login and name the sale is credited to. */
  soldBy?: string | null;
  soldByName?: string | null;
  customer: AdminCustomerSummary | null;
  items: OrderItemSummary[] | null;
  /** The entry flagged current, or null when the order has no tracking yet. */
  currentTracking: OrderTrackingEntry | null;
}

/**
 * OrderResponseDTO.OrderShippingAddressDTO — the address snapshot taken when the order was
 * placed (so later edits to the customer's address book don't change it).
 */
export interface OrderShippingAddress {
  recipientName: string | null;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

/** OrderPaymentResponseDTO — one Razorpay attempt, or store cash. The signature is never sent. */
export interface OrderPaymentAttempt {
  /** RAZORPAY or CASH */
  provider: string | null;
  /** CREATED | ATTEMPTED | FAILED | PAID */
  status: string;
  /** Razorpay payment ID; null until the customer actually attempts payment. */
  transactionId: string | null;
  /** e.g. UPI / CARD — recorded once Razorpay reports how the customer paid. */
  paymentInstrument: string | null;
  /** Minor units (paise). Divide by 100 for rupees. */
  amountPaise: number | null;
  currency: string | null;
  createdAt: string | null;
  /** Set only on the PAID attempt. */
  paidAt: string | null;
  /** Cash: the agent's receipt number and who received it (admin view). */
  receiptNumber?: string | null;
  collectedBy?: string | null;
}

/** AdminOrderDetailDTO — GET /admin/orders/{orderNumber}. */
export interface AdminOrderDetail extends AdminOrderSummary {
  addressId: number | null;
  /**
   * Shipping address snapshot. `undefined` until the backend adds it to the admin detail
   * response (see ECOMMERCE_ADMIN_ORDER_ADDRESS_PROMPT.md); `null` when the order has none.
   */
  shippingAddress?: OrderShippingAddress | null;
  subtotal: number | null;
  shippingFee: number | null;
  notes: string | null;
  /** Full history, createdAt ascending. */
  tracking: OrderTrackingEntry[] | null;
  /** Razorpay attempts, oldest first. `undefined` on backends that predate this field. */
  payments?: OrderPaymentAttempt[] | null;
  /** Every pre-order product currently has enough stock for its total ordered quantity. */
  preOrderReady?: boolean;
  /** Server decision: status is PRE_ORDER_PENDING and stock is ready. Rechecked on approval. */
  canApprovePreOrder?: boolean;
  /** TinQa's own delivery tracking ID ("TQD-…"), given when the order is shipped; null before. */
  deliveryTrackingId?: string | null;
  /** The return staff enabled on this order (orders are not returnable by default); null when none. */
  returnInfo?: OrderReturnInfo | null;
  /** Hub checkpoints of the delivery and of the return, oldest first. */
  checkpoints?: ShipmentCheckpoint[] | null;
  /** Each line with the serials of its units (recorded when it ships) and their warranty; absent on older backends. */
  units?: OrderItemUnits[] | null;
}

/** OrderUnitsDTO.Unit: one unit shipped; released = no longer the customer's (cancelled or returned). */
export interface OrderUnit {
  serial: string;
  warrantyTitle: string | null;
  coverageStartsOn: string | null;
  coverageEndsOn: string | null;
  released: boolean;
}

/** OrderUnitsDTO.ItemUnits: an order line, how many units it has and the serials recorded so far. */
export interface OrderItemUnits {
  orderItemId: number;
  productId: number;
  title: string;
  quantity: number;
  units: OrderUnit[];
}

/** The serial (product unit barcode) of one unit on an order line. */
export interface UnitSerial {
  orderItemId: number;
  serial: string;
}

/**
 * REQUESTED: Customer Support asked for a return, waiting for a Store Manager (RETURN_ENABLE) · REJECTED: that request
 * was turned down · ENABLED: the customer may start it within 7 days · WITHDRAWN · STARTED by the customer.
 */
export type ReturnState = 'REQUESTED' | 'REJECTED' | 'ENABLED' | 'WITHDRAWN' | 'STARTED';
export type ReturnSettlement = 'DEDUCT' | 'PAY';
export type ReturnChargeStatus = 'NONE' | 'PENDING' | 'PAID';
export type InspectionOutcome = 'PASS' | 'PARTIAL' | 'FAIL';

/** ReturnDTOs.AdminView — amounts in rupees, times are ISO local datetimes. */
export interface OrderReturnInfo {
  id: number;
  state: ReturnState;
  /** ENABLED and still inside the customer's 7 days (or the customer is paying the charge). */
  open: boolean;
  /**
   * The customer's own words: the text of the ticket message Customer Support picked when requesting the return
   * (never typed by staff).
   */
  enabledReason: string | null;
  /** The support ticket the return was requested from; null for returns from before 2026-11-11. */
  sourceTicketReference?: string | null;
  /** Customer Support's optional internal note for the Store Manager (never shown to the customer). */
  staffNote?: string | null;
  /** Null while REQUESTED or REJECTED. */
  enabledBy: string | null;
  enabledAt: string | null;
  /** Last moment the customer can start the return. Null while REQUESTED or REJECTED. */
  expiresAt: string | null;
  withdrawnBy: string | null;
  withdrawnAt: string | null;
  chargeAmount: number | null;
  chargeReason: string | null;
  /** How the customer settles the charge when starting: taken off the refund, or paid now. */
  settlement: ReturnSettlement | null;
  /** The reason the customer gave when starting the return. */
  customerReason: string | null;
  requestedAt: string | null;
  chargeStatus: ReturnChargeStatus;
  chargePaidAt: string | null;
  /** Return tracking ID ("TQR-…") once the customer started it. */
  trackingId: string | null;
  inspectionOutcome: InspectionOutcome | null;
  inspectionNote: string | null;
  refundAmount: number | null;
  inspectedBy: string | null;
  inspectedAt: string | null;
  /** The order's subtotal (items after promo, GST inclusive): what a return can refund. Shipping is never part of it. */
  orderAmount: number;
  /** Shipping paid on the order; never refunded by a return. */
  shippingFee: number;
  /** The charge is less than the order amount, so the customer may have it deducted from the refund. */
  deductAllowed: boolean;
  /** Staff member (no RETURN_ENABLE) who requested the return, and when. */
  staffRequestedBy: string | null;
  staffRequestedAt: string | null;
  /** The charge the requester proposed. */
  requestedChargeAmount: number | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  /** Shown to the customer. */
  rejectionReason: string | null;
  /** Last change of the charge of an enabled return (it clears the customer's consent). */
  chargeChangedBy: string | null;
  chargeChangedAt: string | null;
  /** When the customer ticked "I agree to the return charge"; null until then (or after the charge changed). */
  chargeConsentedAt: string | null;
}

/** POST /admin/orders/{n}/return/approve and PUT /admin/orders/{n}/return/charge (RETURN_ENABLE). */
export interface ReturnChargeRequest {
  /** Rupees, ≥ 0, at most 2 decimals and 9 integer digits; no upper limit against the order. */
  chargeAmount: number;
  /** Required when chargeAmount > 0. */
  chargeReason: string | null;
}

/** POST /admin/orders/{n}/return/reject (RETURN_ENABLE). The reason is shown to the customer. */
export interface RejectReturnRequest {
  reason: string;
}

/** ReturnRequestRow — one row of GET /admin/returns/requests (oldest first). */
export interface ReturnRequestRow {
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  orderAmount: number;
  shippingFee: number;
  totalAmount: number;
  /** The proposed charge and what it is for. */
  chargeAmount: number;
  chargeReason: string | null;
  /** The customer's own words (the ticket message Customer Support picked). */
  reason: string | null;
  /** The support ticket the request was raised from. */
  ticketReference?: string | null;
  /** Customer Support's optional internal note. */
  staffNote?: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
}

export type CheckpointLeg = 'DELIVERY' | 'RETURN';
export type CheckpointEvent = 'ARRIVED' | 'DEPARTED';

/** CheckpointService.View — one "Reached / Left <place>" entry. */
export interface ShipmentCheckpoint {
  id: number;
  leg: CheckpointLeg;
  event: CheckpointEvent;
  place: string;
  city: string | null;
  pincode: string | null;
  occurredAt: string;
  recordedBy: string | null;
}

/**
 * POST /admin/orders/{n}/return/enable (REFUND_REQUEST) — always a request for a Store Manager. Raised from the
 * customer's support ticket about the order: the customer's reason is the text of one of their own messages in it.
 */
export interface EnableReturnRequest {
  ticketReference: string;
  /** The ticket message (by the customer) whose text is sent to the Store Manager as written. */
  customerMessageId: number;
  /** Rupees, ≥ 0; no upper limit (≥ the order amount means the customer must pay it). */
  chargeAmount: number;
  /** Required when chargeAmount > 0. */
  chargeReason?: string | null;
  /** Optional internal note for the Store Manager, at most 500 characters. */
  staffNote?: string | null;
}

/** A message in the support ticket a return is requested from (only CUSTOMER messages can be picked). */
export interface ReturnTicketMessage {
  id: number;
  authorType: string;
  message: string;
  createdAt: string;
}

/** The support ticket the return panel is shown in: returns are requested only from there. */
export interface ReturnTicketContext {
  referenceNumber: string;
  messages: ReturnTicketMessage[] | null | undefined;
  /** A closed ticket can't take a return request (409 RETURN_TICKET_CLOSED). */
  closed: boolean;
}

/** POST /admin/orders/{n}/return/inspection */
export interface ReturnInspectionRequest {
  outcome: InspectionOutcome;
  /** Rupees; PARTIAL only. */
  refundAmount?: number | null;
  /** Required for PARTIAL and FAIL. */
  note?: string | null;
}

/** POST /admin/orders/{n}/checkpoints (and /rider-checkpoints) */
export interface AddCheckpointRequest {
  event: CheckpointEvent;
  place: string;
  city?: string | null;
  pincode?: string | null;
  /** ISO local datetime ("2026-11-09T14:30:00"); omitted = now. */
  occurredAt?: string | null;
}

/** TrackingStatusOptionDTO */
export interface TrackingStatusOption {
  status: string;
  stage: string;
}

/** Sortable fields whitelisted by the backend. */
export type AdminOrderSortField = 'createdAt' | 'orderNumber' | 'orderStatus' | 'totalAmount';
export type AdminOrderSort = `${AdminOrderSortField},${'asc' | 'desc'}`;

/** Query params accepted by GET /admin/orders. */
export interface AdminOrderListParams {
  page: number;
  /** 1–100 */
  size: number;
  sort: AdminOrderSort;
  /** Matches order number, item title, customer email or name. Max 100 chars. */
  search?: string;
  status?: string;
  /** Order-level payment status, e.g. PAID or REFUND_REQUESTED. */
  paymentStatus?: string;
  /** yyyy-MM-dd, inclusive */
  fromDate?: string;
  /** yyyy-MM-dd, inclusive */
  toDate?: string;
}

/** OrderTrackingUpdateRequestDTO (JSON body of PATCH /orders/{orderNumber}/tracking). */
export interface UpdateTrackingRequest {
  status: string;
  notes: string | null;
  /** Rupees this leg costs the company (courier); raised as an expense voucher for approval. */
  shippingCost?: number | null;
  shippingPartner?: string | null;
  /**
   * DELIVERED only: the 7-character, case-sensitive code from the customer's "out for delivery" email. The customer
   * gives it once the device is unpacked, set up and working; it is their consent that the device is OK.
   */
  deliveryCode?: string | null;
  /** SHIPPED only: the serial of every unit of every line (scanned product unit barcodes); they start each warranty. */
  unitSerials?: UnitSerial[];
}

/** POST …/delivery-code: a new delivery code was emailed to the customer (address masked). */
export interface DeliveryCodeSent {
  sentTo: string;
  resendAfterSeconds: number;
}
