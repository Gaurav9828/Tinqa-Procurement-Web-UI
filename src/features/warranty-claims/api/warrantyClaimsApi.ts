import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type { WarrantyClaim, WarrantyClaimRow, WarrantyClaimStatus, WarrantyDecision } from '../types/warrantyClaim.types';

const BASE = '/admin/warranty/claims';
const claimPath = (referenceNumber: string) => `${BASE}/${encodeURIComponent(referenceNumber)}`;

/** Ecommerce AdminWarrantyClaimController. */
export const warrantyClaimsApi = {
  /** GET /admin/warranty/claims?status=&page=&size= — WARRANTY_CLAIM_VIEW; oldest first within a status, else newest first. */
  list: async (status: WarrantyClaimStatus | null, page: number, size: number): Promise<ApiResponse<PageResponse<WarrantyClaimRow>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<WarrantyClaimRow>>>(BASE, {
      params: { ...(status ? { status } : {}), page, size },
    });
    return response.data;
  },

  /** GET /admin/warranty/claims/{ref} — WARRANTY_CLAIM_VIEW. */
  detail: async (referenceNumber: string): Promise<ApiResponse<WarrantyClaim>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<WarrantyClaim>>(claimPath(referenceNumber));
    return response.data;
  },

  /** POST /admin/warranty/claims/{ref}/review — WARRANTY_CLAIM_UPDATE: the diagnosis; the claim waits for a decision. */
  review: async (referenceNumber: string, diagnosis: string): Promise<ApiResponse<WarrantyClaim>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<WarrantyClaim>>(`${claimPath(referenceNumber)}/review`, { diagnosis });
    return response.data;
  },

  /** POST /admin/warranty/claims/{ref}/decision — WARRANTY_CLAIM_DECIDE, not by whoever reviewed it. */
  decide: async (referenceNumber: string, decision: WarrantyDecision): Promise<ApiResponse<WarrantyClaim>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<WarrantyClaim>>(`${claimPath(referenceNumber)}/decision`, decision);
    return response.data;
  },

  /** POST /admin/warranty/claims/{ref}/resolve — WARRANTY_CLAIM_UPDATE: an approved claim was repaired or replaced. */
  resolve: async (referenceNumber: string, note: string): Promise<ApiResponse<WarrantyClaim>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<WarrantyClaim>>(`${claimPath(referenceNumber)}/resolve`, { note });
    return response.data;
  },
};
