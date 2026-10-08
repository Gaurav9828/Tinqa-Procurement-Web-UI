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

/** OrderPaymentResponseDTO — one Razorpay attempt. The signature is never sent. */
export interface OrderPaymentAttempt {
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
  /** yyyy-MM-dd, inclusive */
  fromDate?: string;
  /** yyyy-MM-dd, inclusive */
  toDate?: string;
}

/** OrderTrackingUpdateRequestDTO (JSON body of PATCH /orders/{orderNumber}/tracking). */
export interface UpdateTrackingRequest {
  status: string;
  notes: string | null;
}

/** Customer-facing OrderResponseDTO, returned by PATCH /orders/{orderNumber}/status. */
export interface OrderStatusUpdateResponse {
  id: number;
  orderNumber: string;
  orderStatus: string;
  updatedBy: string | null;
  createdAt: string;
  items: OrderItemSummary[] | null;
  tracking: OrderTrackingEntry[] | null;
}

/**
 * The two ways an admin can change status. Each user action sends exactly one request;
 * both append one history event and update orderStatus on the server.
 */
export type StatusUpdateMode = 'tracking' | 'manual';
