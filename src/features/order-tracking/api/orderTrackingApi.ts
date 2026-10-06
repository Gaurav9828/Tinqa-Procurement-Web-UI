import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  AdminOrderDetail,
  AdminOrderListParams,
  AdminOrderSummary,
  OrderStatusUpdateResponse,
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
   * Option A — "Update tracking".
   * PATCH /api/orders/{orderNumber}/tracking with JSON `{ status, notes }`.
   * Appends one history event, marks it current and updates orderStatus.
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
   * Option B — "Manually update order status".
   * PATCH /api/orders/{orderNumber}/status?status=…&notes=… — status and notes are
   * query parameters (axios encodes them via URLSearchParams); there is no JSON body.
   * Appends one history event and updates orderStatus. Never call both options for
   * the same user action: that would record two history events.
   */
  setOrderStatus: async (
    orderNumber: string,
    status: string,
    notes: string | null
  ): Promise<ApiResponse<OrderStatusUpdateResponse>> => {
    const params = new URLSearchParams({ status });
    if (notes) params.set('notes', notes);
    const response = await ecommerceAxiosClient.patch<ApiResponse<OrderStatusUpdateResponse>>(
      `${orderPath(ORDERS_BASE_URL, orderNumber)}/status`,
      undefined,
      { params }
    );
    return response.data;
  },
};
