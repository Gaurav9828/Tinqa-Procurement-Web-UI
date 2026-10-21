import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  AssetPurpose,
  AssetUploadResponse,
  CompanyProfileOverview,
  CompanyProfileVersion,
  CreateDraftRequest,
  SaveDraftRequest,
} from '../types/companyProfile.types';

// Relative to VITE_ECOMMERCE_API_BASE_URL (already includes `/api`). ADMIN_L1 makes changes,
// ADMIN_L2 approves them; the backend enforces it (403 FORBIDDEN / NOT_VERSION_OWNER / APPROVAL_SELF_NOT_ALLOWED).
const BASE_URL = '/admin/company/profile';

export const companyProfileApi = {
  /** GET — live profile, the pending change and the caller's drafts. */
  getOverview: async (): Promise<ApiResponse<CompanyProfileOverview>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<CompanyProfileOverview>>(BASE_URL);
    return response.data;
  },

  /** GET /versions?page&size — every version, newest first. */
  listVersions: async (page: number, size: number): Promise<ApiResponse<PageResponse<CompanyProfileVersion>>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<CompanyProfileVersion>>>(`${BASE_URL}/versions`, {
      params: { page, size },
    });
    return response.data;
  },

  /** GET /versions/{id} — with `changes` (vs live) and `auditTrail`. */
  getVersion: async (id: number): Promise<ApiResponse<CompanyProfileVersion>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<CompanyProfileVersion>>(`${BASE_URL}/versions/${id}`);
    return response.data;
  },

  /** POST /drafts — L1. Either all fields, `{ copyFromLive: true }`, or `{ copyFromLive: true, section }` for one section. */
  createDraft: async (body: CreateDraftRequest): Promise<ApiResponse<CompanyProfileVersion>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<CompanyProfileVersion>>(`${BASE_URL}/drafts`, body);
    return response.data;
  },

  /** PUT /drafts/{id} — L1, own DRAFT/REJECTED. Always send every field; a section draft keeps only its section's. */
  saveDraft: async (id: number, body: SaveDraftRequest): Promise<ApiResponse<CompanyProfileVersion>> => {
    const response = await ecommerceAxiosClient.put<ApiResponse<CompanyProfileVersion>>(`${BASE_URL}/drafts/${id}`, body);
    return response.data;
  },

  /** DELETE /drafts/{id} — own DRAFT/REJECTED (anyone's with COMPANY_PROFILE_DRAFT_DELETE_ANY) → DELETED (final). */
  deleteDraft: async (id: number): Promise<ApiResponse<CompanyProfileVersion>> => {
    const response = await ecommerceAxiosClient.delete<ApiResponse<CompanyProfileVersion>>(`${BASE_URL}/drafts/${id}`);
    return response.data;
  },

  /** POST /drafts/{id}/submit — L1, own DRAFT/REJECTED → PENDING_APPROVAL. */
  submitDraft: async (id: number): Promise<ApiResponse<CompanyProfileVersion>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<CompanyProfileVersion>>(`${BASE_URL}/drafts/${id}/submit`);
    return response.data;
  },

  /** POST /versions/{id}/withdraw — L1, only the submitter → WITHDRAWN (final). */
  withdraw: async (id: number): Promise<ApiResponse<CompanyProfileVersion>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<CompanyProfileVersion>>(`${BASE_URL}/versions/${id}/withdraw`);
    return response.data;
  },

  /** POST /versions/{id}/approve — L2, not the maker → APPROVED (live immediately). */
  approve: async (id: number): Promise<ApiResponse<CompanyProfileVersion>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<CompanyProfileVersion>>(`${BASE_URL}/versions/${id}/approve`);
    return response.data;
  },

  /** POST /versions/{id}/reject { comment } — L2 → REJECTED. */
  reject: async (id: number, comment: string): Promise<ApiResponse<CompanyProfileVersion>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<CompanyProfileVersion>>(`${BASE_URL}/versions/${id}/reject`, {
      comment,
    });
    return response.data;
  },

  /** POST /admin/company/assets (multipart) — L1. Uploading alone changes nothing until a version using it is approved. */
  uploadAsset: async (
    file: File,
    purpose: AssetPurpose,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<AssetUploadResponse>> => {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    const response = await ecommerceAxiosClient.post<ApiResponse<AssetUploadResponse>>('/admin/company/assets', form, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data;
  },
};
