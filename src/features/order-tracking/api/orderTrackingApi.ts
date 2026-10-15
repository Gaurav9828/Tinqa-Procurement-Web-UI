import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  AdminOrderDetail,
  AdminOrderListParams,
  AdminOrderSummary,
  OrderTrackingEntry,
  TrackingStatusOption,
  UpdateTrackingRequest,
} from '../types/orderTracking.types';

// Paths are relative to VITE_ECOMMERCE_API_BASE_URL (which already includes `/api`).
// Admin reads are restricted to ADMIN_L1/ADMIN_L2 by the backend from the bearer token.
const ADMIN_BASE_URL = '/admin/orders';
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
