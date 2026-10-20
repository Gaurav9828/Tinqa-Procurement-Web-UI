import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
  CreateQuotationRequest,
  DealerChange,
  DealerItem,
  DealerOrder,
  DealerProfile,
  OrderResponseRequest,
  QuotationChangeRequest,
} from '../types/dealerPortal.types';

/** Dealer logins only. The server always scopes these to the signed-in dealer; nothing here names a dealer. */
const BASE_URL = '/v1/dealer-portal';

export const dealerPortalApi = {
  getProfile: async (): Promise<ApiResponse<DealerProfile>> =>
    (await axiosClient.get<ApiResponse<DealerProfile>>(`${BASE_URL}/me`)).data,

  getItems: async (): Promise<ApiResponse<DealerItem[]>> =>
    (await axiosClient.get<ApiResponse<DealerItem[]>>(`${BASE_URL}/items`)).data,

  getOrders: async (): Promise<ApiResponse<DealerOrder[]>> =>
    (await axiosClient.get<ApiResponse<DealerOrder[]>>(`${BASE_URL}/orders`)).data,

  getOrder: async (id: number): Promise<ApiResponse<DealerOrder>> =>
    (await axiosClient.get<ApiResponse<DealerOrder>>(`${BASE_URL}/orders/${id}`)).data,

  respondToOrder: async (orderId: number, payload: OrderResponseRequest): Promise<ApiResponse<DealerOrder>> =>
    (await axiosClient.post<ApiResponse<DealerOrder>>(`${BASE_URL}/orders/${orderId}/response`, payload)).data,

  markShipped: async (orderId: number): Promise<ApiResponse<DealerOrder>> =>
    (await axiosClient.post<ApiResponse<DealerOrder>>(`${BASE_URL}/orders/${orderId}/ship`)).data,

  createQuotation: async (payload: CreateQuotationRequest): Promise<ApiResponse<DealerOrder>> =>
    (await axiosClient.post<ApiResponse<DealerOrder>>(`${BASE_URL}/quotations`, payload)).data,

  requestChange: async (orderId: number, payload: QuotationChangeRequest): Promise<ApiResponse<DealerChange>> =>
    (await axiosClient.post<ApiResponse<DealerChange>>(`${BASE_URL}/quotations/${orderId}/change-requests`, payload)).data,

  withdrawChange: async (changeId: number): Promise<ApiResponse<DealerChange>> =>
    (await axiosClient.patch<ApiResponse<DealerChange>>(`${BASE_URL}/change-requests/${changeId}/withdraw`)).data,
};
