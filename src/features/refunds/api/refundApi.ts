import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type { OrderRefundSummary, Refund, RefundListParams, RefundRequestPayload } from '../types/refund.types';

// Paths are relative to VITE_ECOMMERCE_API_BASE_URL (which already includes `/api`).
// Roles are enforced by the backend from the bearer token: L1 requests, a different L2 approves or rejects.
const orderRefundsPath = (orderNumber: string) => `/admin/orders/${encodeURIComponent(orderNumber)}/refunds`;
const REFUNDS_BASE_URL = '/admin/refunds';
const refundPath = (id: number) => `${REFUNDS_BASE_URL}/${id}`;

export const refundApi = {
  /** GET /admin/orders/{orderNumber}/refunds — refundable payments, refund history and whether L1 may request. */
  getOrderRefunds: async (orderNumber: string): Promise<ApiResponse<OrderRefundSummary>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<OrderRefundSummary>>(orderRefundsPath(orderNumber));
    return response.data;
  },

  /** POST /admin/orders/{orderNumber}/refunds (L1) — creates a REQUESTED refund; no money moves yet. */
  requestRefund: async (orderNumber: string, payload: RefundRequestPayload): Promise<ApiResponse<Refund>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<Refund>>(orderRefundsPath(orderNumber), payload);
    return response.data;
  },

  /** POST /admin/refunds/{id}/approve (L2, not the requester) — the backend calls Razorpay. Also retries an APPROVED refund. */
  approveRefund: async (id: number): Promise<ApiResponse<Refund>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<Refund>>(`${refundPath(id)}/approve`);
    return response.data;
  },

  /** POST /admin/refunds/{id}/reject (L2) with `{ comment }`. */
  rejectRefund: async (id: number, comment: string): Promise<ApiResponse<Refund>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<Refund>>(`${refundPath(id)}/reject`, { comment });
    return response.data;
  },

  /** POST /admin/refunds/{id}/sync — pulls the latest state from Razorpay. */
  syncRefund: async (id: number): Promise<ApiResponse<Refund>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<Refund>>(`${refundPath(id)}/sync`);
    return response.data;
  },

  /** GET /admin/refunds?status=&page=&size= — newest first. */
  listRefunds: async ({ status, page, size }: RefundListParams): Promise<ApiResponse<PageResponse<Refund>>> => {
    const params: Record<string, string | number> = { page, size };
    if (status) params.status = status;
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<Refund>>>(REFUNDS_BASE_URL, { params });
    return response.data;
  },

  /** GET /admin/refunds/{id} */
  getRefund: async (id: number): Promise<ApiResponse<Refund>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<Refund>>(refundPath(id));
    return response.data;
  },
};
