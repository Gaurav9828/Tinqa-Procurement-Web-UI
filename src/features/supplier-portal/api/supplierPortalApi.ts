import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
  CreateQuotationRequest,
  SupplierChange,
  SupplierItem,
  SupplierOrder,
  SupplierProfile,
  OrderResponseRequest,
  QuotationChangeRequest,
} from '../types/supplierPortal.types';

/** Supplier logins only. The server always scopes these to the signed-in supplier; nothing here names a supplier. */
const BASE_URL = '/v1/supplier-portal';

export const supplierPortalApi = {
  getProfile: async (): Promise<ApiResponse<SupplierProfile>> =>
    (await axiosClient.get<ApiResponse<SupplierProfile>>(`${BASE_URL}/me`)).data,

  getItems: async (): Promise<ApiResponse<SupplierItem[]>> =>
    (await axiosClient.get<ApiResponse<SupplierItem[]>>(`${BASE_URL}/items`)).data,

  getOrders: async (): Promise<ApiResponse<SupplierOrder[]>> =>
    (await axiosClient.get<ApiResponse<SupplierOrder[]>>(`${BASE_URL}/orders`)).data,

  getOrder: async (id: number): Promise<ApiResponse<SupplierOrder>> =>
    (await axiosClient.get<ApiResponse<SupplierOrder>>(`${BASE_URL}/orders/${id}`)).data,

  respondToOrder: async (orderId: number, payload: OrderResponseRequest): Promise<ApiResponse<SupplierOrder>> =>
    (await axiosClient.post<ApiResponse<SupplierOrder>>(`${BASE_URL}/orders/${orderId}/response`, payload)).data,

  markShipped: async (orderId: number): Promise<ApiResponse<SupplierOrder>> =>
    (await axiosClient.post<ApiResponse<SupplierOrder>>(`${BASE_URL}/orders/${orderId}/ship`)).data,

  createQuotation: async (payload: CreateQuotationRequest): Promise<ApiResponse<SupplierOrder>> =>
    (await axiosClient.post<ApiResponse<SupplierOrder>>(`${BASE_URL}/quotations`, payload)).data,

  requestChange: async (orderId: number, payload: QuotationChangeRequest): Promise<ApiResponse<SupplierChange>> =>
    (await axiosClient.post<ApiResponse<SupplierChange>>(`${BASE_URL}/quotations/${orderId}/change-requests`, payload)).data,

  withdrawChange: async (changeId: number): Promise<ApiResponse<SupplierChange>> =>
    (await axiosClient.patch<ApiResponse<SupplierChange>>(`${BASE_URL}/change-requests/${changeId}/withdraw`)).data,
};
