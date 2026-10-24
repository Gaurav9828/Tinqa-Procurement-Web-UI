import { axiosClient } from '../../../api/axiosClient';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type { TicketSummary } from '../../support-tickets/types/supportTicket.types';
import type {
  CustomerCartItem,
  CustomerChangeRequestPayload,
  CustomerDetail,
  CustomerOrder,
  CustomerSummary,
} from '../types/customer.types';

// Customers live in the Ecommerce backend; change requests are Procurement notifications to the Super Admin.
const BASE_URL = '/admin/customers';

export interface CustomerListParams {
  search: string;
  /** Only customers with something in their cart (to follow up before they forget it). */
  withCart: boolean;
  page: number;
  size: number;
}

export interface CustomerUpdatePayload {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  dob?: string;
  /** MALE, FEMALE or OTHER. */
  gender?: string;
  reason: string;
}

export const customersApi = {
  /** GET /api/admin/customers?search=&withCart=&page=&size= — newest registration first. */
  list: async ({ search, withCart, page, size }: CustomerListParams): Promise<ApiResponse<PageResponse<CustomerSummary>>> => {
    const params: Record<string, string | number | boolean> = { page, size };
    if (search) params.search = search;
    if (withCart) params.withCart = true;
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<CustomerSummary>>>(BASE_URL, { params });
    return response.data;
  },

  get: async (customerId: number): Promise<ApiResponse<CustomerDetail>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<CustomerDetail>>(`${BASE_URL}/${customerId}`);
    return response.data;
  },

  orders: async (customerId: number, page: number, size: number): Promise<ApiResponse<PageResponse<CustomerOrder>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<CustomerOrder>>>(`${BASE_URL}/${customerId}/orders`, {
      params: { page, size },
    });
    return response.data;
  },

  cart: async (customerId: number): Promise<ApiResponse<CustomerCartItem[]>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<CustomerCartItem[]>>(`${BASE_URL}/${customerId}/cart`);
    return response.data;
  },

  tickets: async (customerId: number, page: number, size: number): Promise<ApiResponse<PageResponse<TicketSummary>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<TicketSummary>>>(`${BASE_URL}/${customerId}/tickets`, {
      params: { page, size },
    });
    return response.data;
  },

  /** PATCH /api/admin/customers/{id} — Super Admin only (CUSTOMER_UPDATE). */
  update: async (customerId: number, payload: CustomerUpdatePayload): Promise<ApiResponse<CustomerDetail>> => {
    const response = await ecommerceAxiosClient.patch<ApiResponse<CustomerDetail>>(`${BASE_URL}/${customerId}`, payload);
    return response.data;
  },

  /** POST /v1/admin/customer-change-requests — notifies the Super Admin; nothing changes until they edit it. */
  requestChange: async (payload: CustomerChangeRequestPayload): Promise<ApiResponse<void>> => {
    const response = await axiosClient.post<ApiResponse<void>>('/v1/admin/customer-change-requests', payload);
    return response.data;
  },
};
