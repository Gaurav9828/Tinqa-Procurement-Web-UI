import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  DeliveryCodeSent,
  AddCheckpointRequest,
  AdminOrderDetail,
  EnableReturnRequest,
  OrderReturnInfo,
  RejectReturnRequest,
  ReturnChargeRequest,
  ReturnInspectionRequest,
  ReturnRequestRow,
  ShipmentCheckpoint,
  AdminOrderListParams,
  AdminOrderSummary,
  OrderTrackingEntry,
  TrackingStatusOption,
  UpdateTrackingRequest,
} from '../types/orderTracking.types';

// Paths are relative to VITE_ECOMMERCE_API_BASE_URL (which already includes `/api`).
// Admin reads are restricted to ADMIN_L1/ADMIN_L2 by the backend from the bearer token.
const ADMIN_BASE_URL = '/admin/orders';
const RETURN_REQUESTS_URL = '/admin/returns/requests';
const ORDERS_BASE_URL = '/orders';

const orderPath = (base: string, orderNumber: string) => `${base}/${encodeURIComponent(orderNumber)}`;

/** Drops empty filters so the backend only receives parameters that are actually set. */
const toQueryParams = (params: AdminOrderListParams) => {
  const query: Record<string, string | number> = { page: params.page, size: params.size, sort: params.sort };
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.status) query.status = params.status;
  if (params.paymentStatus) query.paymentStatus = params.paymentStatus;
  if (params.fromDate) query.fromDate = params.fromDate;
  if (params.toDate) query.toDate = params.toDate;
  return query;
};

export const orderTrackingApi = {
  /** GET /api/admin/orders — paginated, server-side search/filter/sort. */
  listOrders: async (params: AdminOrderListParams): Promise<ApiResponse<PageResponse<AdminOrderSummary>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<AdminOrderSummary>>>(ADMIN_BASE_URL, {
      params: toQueryParams(params),
    });
    return response.data;
  },

  /** GET /api/admin/orders/{orderNumber} — order with customer, items and full tracking history. */
  getOrder: async (orderNumber: string): Promise<ApiResponse<AdminOrderDetail>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<AdminOrderDetail>>(orderPath(ADMIN_BASE_URL, orderNumber));
    return response.data;
  },

  /** GET /api/admin/orders/tracking-statuses — authoritative status list, in display order. */
  getTrackingStatuses: async (): Promise<ApiResponse<TrackingStatusOption[]>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<TrackingStatusOption[]>>(
      `${ADMIN_BASE_URL}/tracking-statuses`
    );
    return response.data;
  },

  /**
   * PATCH /api/admin/orders/{orderNumber}/pre-order/approve — no request body.
   * The backend rechecks stock under lock, reserves it and moves the order to
   * PRE_ORDER_CONFIRMED; returns the updated detail. 409 PRE_ORDER_STOCK_NOT_READY when stock
   * is insufficient (the order stays PRE_ORDER_PENDING).
   */
  approvePreOrder: async (orderNumber: string): Promise<ApiResponse<AdminOrderDetail>> => {
    const response = await ecommerceAxiosClient.patch<ApiResponse<AdminOrderDetail>>(
      `${orderPath(ADMIN_BASE_URL, orderNumber)}/pre-order/approve`
    );
    return response.data;
  },

  /**
   * PATCH /api/orders/{orderNumber}/tracking with JSON `{ status, notes }` — the console's only way to
   * change status. Appends one history event, marks it current and updates orderStatus. The backend
   * rejects any status that is not an allowed next step (409 INVALID_STATUS_TRANSITION).
   */
  updateTracking: async (
    orderNumber: string,
    payload: UpdateTrackingRequest
  ): Promise<ApiResponse<OrderTrackingEntry>> => {
    const response = await ecommerceAxiosClient.patch<ApiResponse<OrderTrackingEntry>>(
      `${orderPath(ORDERS_BASE_URL, orderNumber)}/tracking`,
      payload
    );
    return response.data;
  },

  /**
   * POST /api/admin/orders/{orderNumber}/return/enable — REFUND_REQUEST. With RETURN_ENABLE the DELIVERED order becomes
   * returnable for 7 days (ENABLED); without it this is a request (REQUESTED) for a Store Manager. Calling it again on a
   * REQUESTED return updates the request.
   */
  enableReturn: async (orderNumber: string, payload: EnableReturnRequest): Promise<ApiResponse<OrderReturnInfo>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<OrderReturnInfo>>(
      `${orderPath(ADMIN_BASE_URL, orderNumber)}/return/enable`,
      payload
    );
    return response.data;
  },

  /** POST /api/admin/orders/{orderNumber}/return/withdraw — REFUND_REQUEST; takes back a REQUESTED or ENABLED return. */
  withdrawReturn: async (orderNumber: string): Promise<ApiResponse<OrderReturnInfo>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<OrderReturnInfo>>(`${orderPath(ADMIN_BASE_URL, orderNumber)}/return/withdraw`);
    return response.data;
  },

  /** POST /api/admin/orders/{orderNumber}/return/approve — RETURN_ENABLE; REQUESTED → ENABLED (the charge may be changed). */
  approveReturn: async (orderNumber: string, payload: ReturnChargeRequest): Promise<ApiResponse<OrderReturnInfo>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<OrderReturnInfo>>(
      `${orderPath(ADMIN_BASE_URL, orderNumber)}/return/approve`,
      payload
    );
    return response.data;
  },

  /** POST /api/admin/orders/{orderNumber}/return/reject — RETURN_ENABLE; REQUESTED → REJECTED, the reason goes to the customer. */
  rejectReturn: async (orderNumber: string, payload: RejectReturnRequest): Promise<ApiResponse<OrderReturnInfo>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<OrderReturnInfo>>(
      `${orderPath(ADMIN_BASE_URL, orderNumber)}/return/reject`,
      payload
    );
    return response.data;
  },

  /** PUT /api/admin/orders/{orderNumber}/return/charge — RETURN_ENABLE; new charge on an open ENABLED return, consent cleared. */
  changeReturnCharge: async (orderNumber: string, payload: ReturnChargeRequest): Promise<ApiResponse<OrderReturnInfo>> => {
    const response = await ecommerceAxiosClient.put<ApiResponse<OrderReturnInfo>>(
      `${orderPath(ADMIN_BASE_URL, orderNumber)}/return/charge`,
      payload
    );
    return response.data;
  },

  /** GET /api/admin/returns/requests?page=&size= — RETURN_ENABLE; returns waiting for a Store Manager, oldest first (size ≤ 50). */
  listReturnRequests: async (page: number, size: number): Promise<ApiResponse<PageResponse<ReturnRequestRow>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<ReturnRequestRow>>>(RETURN_REQUESTS_URL, {
      params: { page, size },
    });
    return response.data;
  },

  /** POST /api/admin/orders/{orderNumber}/return/inspection — REFUND_REQUEST; PASS / PARTIAL request the refund. */
  recordInspection: async (orderNumber: string, payload: ReturnInspectionRequest): Promise<ApiResponse<OrderReturnInfo>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<OrderReturnInfo>>(
      `${orderPath(ADMIN_BASE_URL, orderNumber)}/return/inspection`,
      payload
    );
    return response.data;
  },

  /** POST /api/admin/orders/{orderNumber}/checkpoints — CUSTOMER_ORDER_TRACKING_UPDATE (staff). */
  addCheckpoint: async (orderNumber: string, payload: AddCheckpointRequest): Promise<ApiResponse<ShipmentCheckpoint>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<ShipmentCheckpoint>>(
      `${orderPath(ADMIN_BASE_URL, orderNumber)}/checkpoints`,
      payload
    );
    return response.data;
  },

  /** POST /api/admin/orders/{orderNumber}/rider-checkpoints — DELIVERY_STATUS_UPDATE (riders, Fleet Coordinator); same rules. */
  addRiderCheckpoint: async (orderNumber: string, payload: AddCheckpointRequest): Promise<ApiResponse<ShipmentCheckpoint>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<ShipmentCheckpoint>>(
      `${orderPath(ADMIN_BASE_URL, orderNumber)}/rider-checkpoints`,
      payload
    );
    return response.data;
  },

  /** DELETE /api/admin/orders/{orderNumber}/checkpoints/{id} — CUSTOMER_ORDER_TRACKING_UPDATE, while that trip is under way. */
  deleteCheckpoint: async (orderNumber: string, checkpointId: number): Promise<ApiResponse<null>> => {
    const response = await ecommerceAxiosClient.delete<ApiResponse<null>>(
      `${orderPath(ADMIN_BASE_URL, orderNumber)}/checkpoints/${checkpointId}`
    );
    return response.data;
  },

  /**
   * Emails the customer a new delivery code (they asked the delivery partner for it); it replaces the old one. Staff:
   * POST /api/orders/{n}/tracking/delivery-code (CUSTOMER_ORDER_TRACKING_UPDATE). Riders (`riderRoute`):
   * POST /api/orders/{n}/delivery-status/delivery-code (DELIVERY_STATUS_UPDATE). Only while out for delivery, once a minute.
   */
  resendDeliveryCode: async (orderNumber: string, riderRoute: boolean): Promise<ApiResponse<DeliveryCodeSent>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<DeliveryCodeSent>>(
      `${orderPath(ORDERS_BASE_URL, orderNumber)}/${riderRoute ? 'delivery-status' : 'tracking'}/delivery-code`
    );
    return response.data;
  },

  /**
   * PATCH /api/orders/{orderNumber}/delivery-status with JSON `{ status, notes }` — a delivery rider's update. Same
   * effect and rules as updateTracking, but only for DELIVERY_OUTCOMES (403 DELIVERY_STATUS_NOT_ALLOWED otherwise).
   */
  updateDeliveryStatus: async (
    orderNumber: string,
    payload: UpdateTrackingRequest
  ): Promise<ApiResponse<OrderTrackingEntry>> => {
    const response = await ecommerceAxiosClient.patch<ApiResponse<OrderTrackingEntry>>(
      `${orderPath(ORDERS_BASE_URL, orderNumber)}/delivery-status`,
      payload
    );
    return response.data;
  },
};
