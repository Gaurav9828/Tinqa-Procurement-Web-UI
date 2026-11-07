import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  PromoCodeDetail,
  PromoCodeListParams,
  PromoCodeRequest,
  PromoCodeSummary,
  PromoRedemption,
} from '../types/promoCode.types';

// Promo codes live in the Ecommerce backend (docs/promo-codes.md › Staff). Viewing needs PROMO_CODE_VIEW; sharing
// (email, storefront) PROMO_CODE_SHARE; the suggestion and every change PROMO_CODE_MANAGE (Super Admin). See
// config/endpointAccess.ts.
const BASE_URL = '/admin/promo-codes';

export const promoCodesApi = {
  /** GET /api/admin/promo-codes?search=&status=&page=&size= — codes starting with `search`, newest first. */
  list: async ({ search, status, page, size }: PromoCodeListParams): Promise<ApiResponse<PageResponse<PromoCodeSummary>>> => {
    const params: Record<string, string | number> = { page, size };
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<PromoCodeSummary>>>(BASE_URL, { params });
    return response.data;
  },

  /** GET /api/admin/promo-codes/{id} — the code with its customers and products. */
  get: async (id: number): Promise<ApiResponse<PromoCodeDetail>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PromoCodeDetail>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /** GET /api/admin/promo-codes/{id}/redemptions?page=&size= — every order that used it, newest first. */
  redemptions: async (id: number, page: number, size: number): Promise<ApiResponse<PageResponse<PromoRedemption>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<PromoRedemption>>>(`${BASE_URL}/${id}/redemptions`, {
      params: { page, size },
    });
    return response.data;
  },

  /** GET /api/admin/promo-codes/code-suggestion — an unused code (PROMO_CODE_MANAGE). */
  suggestCode: async (): Promise<ApiResponse<{ code: string }>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<{ code: string }>>(`${BASE_URL}/code-suggestion`);
    return response.data;
  },

  /** POST /api/admin/promo-codes (PROMO_CODE_MANAGE). Answers the detail; 409 PROMO_CODE_TAKEN for a used code. */
  create: async (body: PromoCodeRequest): Promise<ApiResponse<PromoCodeDetail>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<PromoCodeDetail>>(BASE_URL, body);
    return response.data;
  },

  /** PUT /api/admin/promo-codes/{id} (PROMO_CODE_MANAGE). Answers the detail. */
  update: async (id: number, body: PromoCodeRequest): Promise<ApiResponse<PromoCodeDetail>> => {
    const response = await ecommerceAxiosClient.put<ApiResponse<PromoCodeDetail>>(`${BASE_URL}/${id}`, body);
    return response.data;
  },

  /** PATCH /api/admin/promo-codes/{id}/status { active } (PROMO_CODE_MANAGE): switch it off or back on. Answers the detail. */
  setActive: async (id: number, active: boolean): Promise<ApiResponse<PromoCodeDetail>> => {
    const response = await ecommerceAxiosClient.patch<ApiResponse<PromoCodeDetail>>(`${BASE_URL}/${id}/status`, { active });
    return response.data;
  },

  /** DELETE /api/admin/promo-codes/{id} (PROMO_CODE_MANAGE): soft delete, hidden and unusable until restored. Answers the detail. */
  remove: async (id: number): Promise<ApiResponse<PromoCodeDetail>> => {
    const response = await ecommerceAxiosClient.delete<ApiResponse<PromoCodeDetail>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * POST /api/admin/promo-codes/{id}/share { customerIds } (PROMO_CODE_SHARE): emails a chosen customers' code to
   * these of them (none listed: all). Answers the detail as the caller may see it; 409 PROMO_CODE_NOT_SHAREABLE for an
   * everyone code or one that can't be used any more.
   */
  share: async (id: number, customerIds: number[]): Promise<ApiResponse<PromoCodeDetail>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<PromoCodeDetail>>(`${BASE_URL}/${id}/share`, { customerIds });
    return response.data;
  },

  /** PATCH /api/admin/promo-codes/{id}/storefront { shown } (PROMO_CODE_SHARE): show an everyone code on the storefront, or stop. */
  setShownOnStorefront: async (id: number, shown: boolean): Promise<ApiResponse<PromoCodeDetail>> => {
    const response = await ecommerceAxiosClient.patch<ApiResponse<PromoCodeDetail>>(`${BASE_URL}/${id}/storefront`, { shown });
    return response.data;
  },

  /** POST /api/admin/promo-codes/{id}/restore (PROMO_CODE_MANAGE): brings a deleted code back as it was. Answers the detail. */
  restore: async (id: number): Promise<ApiResponse<PromoCodeDetail>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<PromoCodeDetail>>(`${BASE_URL}/${id}/restore`);
    return response.data;
  },
};
