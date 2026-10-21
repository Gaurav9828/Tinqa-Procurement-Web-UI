import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type { EmailCodeSent, EmailVerificationApi, EmailVerified } from '../../../types/emailVerification.types';
import type {
  StoreAddressRequest,
  StoreCustomer,
  StoreCustomerRequest,
  StoreOrderRequest,
  StoreProduct,
  StoreQuote,
  StoreSale,
  StoreSaleLine,
  StoreSaleListParams,
} from '../types/storeSale.types';

// Paths are relative to VITE_ECOMMERCE_API_BASE_URL (which already includes `/api`).
// The seller is always taken from the bearer token on the server, never from the request.
const BASE_URL = '/admin/store-sales';

const listQuery = ({ page, size, paymentStatus, soldBy }: StoreSaleListParams) => {
  const query: Record<string, string | number> = { page, size };
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (soldBy?.trim()) query.soldBy = soldBy.trim();
  return query;
};

export const storeSaleApi = {
  /** GET /api/admin/store-sales/customers?query= — exact mobile number or email; 404 CUSTOMER_NOT_FOUND otherwise. */
  findCustomer: async (query: string): Promise<ApiResponse<StoreCustomer>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<StoreCustomer>>(`${BASE_URL}/customers`, { params: { query } });
    return response.data;
  },

  /** POST /api/admin/store-sales/customers/email-verification — emails the customer a 5-digit code. */
  sendEmailCode: async (email: string): Promise<ApiResponse<EmailCodeSent>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<EmailCodeSent>>(`${BASE_URL}/customers/email-verification`, { email });
    return response.data;
  },

  /** POST /api/admin/store-sales/customers/email-verification/confirm — the code the customer read out. */
  confirmEmailCode: async (email: string, code: string): Promise<ApiResponse<EmailVerified>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<EmailVerified>>(`${BASE_URL}/customers/email-verification/confirm`, {
      email,
      code,
    });
    return response.data;
  },

  /** POST /api/admin/store-sales/customers — same rules as the storefront sign-up; the email must be verified. */
  registerCustomer: async (payload: StoreCustomerRequest): Promise<ApiResponse<StoreCustomer>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<StoreCustomer>>(`${BASE_URL}/customers`, payload);
    return response.data;
  },

  /** POST /api/admin/store-sales/customers/{id}/addresses */
  addAddress: async (customerId: number, payload: StoreAddressRequest): Promise<ApiResponse<StoreCustomer>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<StoreCustomer>>(`${BASE_URL}/customers/${customerId}/addresses`, payload);
    return response.data;
  },

  /** GET /api/admin/store-sales/products — every product on sale now (filtered in the browser). */
  listProducts: async (): Promise<ApiResponse<StoreProduct[]>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<StoreProduct[]>>(`${BASE_URL}/products`);
    return response.data;
  },

  /** POST /api/admin/store-sales/quote — the server's price, shipping and total for these lines. */
  quote: async (items: StoreSaleLine[]): Promise<ApiResponse<StoreQuote>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<StoreQuote>>(`${BASE_URL}/quote`, { items });
    return response.data;
  },

  /** POST /api/admin/store-sales/orders — 409 CONFLICT_PRICE_CHANGED when the quote is stale. */
  placeOrder: async (payload: StoreOrderRequest): Promise<ApiResponse<StoreSale>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<StoreSale>>(`${BASE_URL}/orders`, payload);
    return response.data;
  },

  /** GET /api/admin/store-sales/orders/mine — the signed-in agent's own sales. */
  listMySales: async (params: StoreSaleListParams): Promise<ApiResponse<PageResponse<StoreSale>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<StoreSale>>>(`${BASE_URL}/orders/mine`, {
      params: listQuery(params),
    });
    return response.data;
  },

  /** GET /api/admin/store-sales/orders — every agent's sales (STORE_SALES_VIEW_ALL). */
  listAllSales: async (params: StoreSaleListParams): Promise<ApiResponse<PageResponse<StoreSale>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<StoreSale>>>(`${BASE_URL}/orders`, {
      params: listQuery(params),
    });
    return response.data;
  },

};

/** Verifies a walk-in customer's email through the e-commerce API. */
export const storeEmailVerificationApi: EmailVerificationApi = {
  sendCode: (email) => storeSaleApi.sendEmailCode(email),
  confirmCode: (email, code) => storeSaleApi.confirmEmailCode(email, code),
};
