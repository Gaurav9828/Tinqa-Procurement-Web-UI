import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
  ProductApprovalDecisionRequest,
  ProductApprovalResponse,
  SubmitProductApprovalRequest,
} from '../types/productApproval.types';

/** Procurement backend: Admin L2 approval requests for Ecommerce products. */
const BASE_URL = '/v1/product-approvals';

/** Procurement backend limit for one query parameter value (RequestInputSafetyFilter). */
const MAX_QUERY_VALUE_LENGTH = 450;

/** "1,2,3" strings, each within `maxLength` characters. */
export const chunkIds = (ids: number[], maxLength: number): string[] => {
  const batches: string[] = [];
  let current = '';
  for (const id of ids) {
    const next = current ? `${current},${id}` : String(id);
    if (next.length > maxLength && current) {
      batches.push(current);
      current = String(id);
    } else {
      current = next;
    }
  }
  if (current) batches.push(current);
  return batches;
};

export const productApprovalApi = {
  /** POST — create a PENDING request for an (inactive) product. ADMIN_L1 / ADMIN_L2. */
  submit: async (payload: SubmitProductApprovalRequest): Promise<ApiResponse<ProductApprovalResponse>> => {
    const response = await axiosClient.post<ApiResponse<ProductApprovalResponse>>(BASE_URL, payload);
    return response.data;
  },

  /** GET ?status=PENDING — the Admin L2 queue. */
  getPending: async (): Promise<ApiResponse<ProductApprovalResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<ProductApprovalResponse[]>>(BASE_URL, { params: { status: 'PENDING' } });
    return response.data;
  },

  /**
   * GET /latest?productIds=1,2,3 — the most recent request of each product that has one.
   * The backend rejects query values over 500 characters, so large id lists are sent in batches.
   */
  getLatestForProducts: async (productIds: number[]): Promise<ApiResponse<ProductApprovalResponse[]>> => {
    const batches = chunkIds(productIds, MAX_QUERY_VALUE_LENGTH);
    const responses = await Promise.all(
      batches.map(async (ids) => {
        const response = await axiosClient.get<ApiResponse<ProductApprovalResponse[]>>(`${BASE_URL}/latest`, {
          params: { productIds: ids },
        });
        return response.data;
      })
    );
    const failed = responses.find((res) => !res.success);
    if (failed) return { ...failed, data: [] };
    const [first] = responses;
    return { ...(first ?? { success: true, message: '' }), data: responses.flatMap((res) => (Array.isArray(res.data) ? res.data : [])) } as ApiResponse<ProductApprovalResponse[]>;
  },

  /** PATCH /{id}/applied — records that an approved UPDATE was written to the Ecommerce product. ADMIN_L1 / ADMIN_L2. */
  markApplied: async (id: number): Promise<ApiResponse<ProductApprovalResponse>> => {
    const response = await axiosClient.patch<ApiResponse<ProductApprovalResponse>>(`${BASE_URL}/${id}/applied`);
    return response.data;
  },

  /** PATCH /{id}/decision — ADMIN_L2 only. */
  decide: async (id: number, payload: ProductApprovalDecisionRequest): Promise<ApiResponse<ProductApprovalResponse>> => {
    const response = await axiosClient.patch<ApiResponse<ProductApprovalResponse>>(`${BASE_URL}/${id}/decision`, payload);
    return response.data;
  },
};
