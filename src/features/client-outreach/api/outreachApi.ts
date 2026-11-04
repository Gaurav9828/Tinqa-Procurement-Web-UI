import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
  BusinessListParams,
  BusinessPayload,
  ContactPayload,
  ContactProof,
  OutreachBusiness,
  OutreachContact,
  OutreachPage,
  OutreachSummary,
} from '../types/outreach.types';

const BASE = '/v1/outreach';

/** Client outreach (docs/outreach-meetings-roles.md § 2). Reads need OUTREACH_VIEW, writes OUTREACH_LOG. */
export const outreachApi = {
  /** GET …/businesses: search by name, phone or email; latest contact first. */
  businesses: async ({ search, businessType, interest, followUpDue, page, size }: BusinessListParams): Promise<ApiResponse<OutreachPage<OutreachBusiness>>> => {
    const params: Record<string, string | number | boolean> = { page, size };
    if (search) params.search = search;
    if (businessType) params.businessType = businessType;
    if (interest) params.interest = interest;
    if (followUpDue) params.followUpDue = true;
    return (await axiosClient.get<ApiResponse<OutreachPage<OutreachBusiness>>>(`${BASE}/businesses`, { params })).data;
  },

  business: async (id: number): Promise<ApiResponse<OutreachBusiness>> =>
    (await axiosClient.get<ApiResponse<OutreachBusiness>>(`${BASE}/businesses/${id}`)).data,

  /** POST: 409 BUSINESS_EXISTS with { existingId } when the phone or email is already on file. */
  createBusiness: async (payload: BusinessPayload): Promise<ApiResponse<OutreachBusiness>> =>
    (await axiosClient.post<ApiResponse<OutreachBusiness>>(`${BASE}/businesses`, payload)).data,

  updateBusiness: async (id: number, payload: BusinessPayload): Promise<ApiResponse<OutreachBusiness>> =>
    (await axiosClient.put<ApiResponse<OutreachBusiness>>(`${BASE}/businesses/${id}`, payload)).data,

  /** GET …/businesses/{id}/contacts: newest first. */
  contacts: async (businessId: number, page: number, size: number): Promise<ApiResponse<OutreachPage<OutreachContact>>> =>
    (await axiosClient.get<ApiResponse<OutreachPage<OutreachContact>>>(`${BASE}/businesses/${businessId}/contacts`, { params: { page, size } })).data,

  logContact: async (businessId: number, payload: ContactPayload): Promise<ApiResponse<OutreachContact>> =>
    (await axiosClient.post<ApiResponse<OutreachContact>>(`${BASE}/businesses/${businessId}/contacts`, payload)).data,

  /** PUT …/contacts/{id}: the logger only. */
  updateContact: async (id: number, payload: ContactPayload): Promise<ApiResponse<OutreachContact>> =>
    (await axiosClient.put<ApiResponse<OutreachContact>>(`${BASE}/contacts/${id}`, payload)).data,

  /** POST …/contacts/{id}/proofs: one image (png/jpeg/webp) or PDF, ≤ 5 MB; the logger only. */
  uploadProof: async (contactId: number, file: File): Promise<ApiResponse<ContactProof>> => {
    const form = new FormData();
    form.append('file', file);
    return (await axiosClient.post<ApiResponse<ContactProof>>(`${BASE}/contacts/${contactId}/proofs`, form)).data;
  },

  proofFile: async (contactId: number, proofId: number): Promise<Blob> =>
    (await axiosClient.get<Blob>(`${BASE}/contacts/${contactId}/proofs/${proofId}`, { responseType: 'blob' })).data,

  removeProof: async (contactId: number, proofId: number): Promise<ApiResponse<void>> =>
    (await axiosClient.delete<ApiResponse<void>>(`${BASE}/contacts/${contactId}/proofs/${proofId}`)).data,

  /** GET …/summary: one SQL statement for the date range. */
  summary: async (from: string, to: string): Promise<ApiResponse<OutreachSummary>> =>
    (await axiosClient.get<ApiResponse<OutreachSummary>>(`${BASE}/summary`, { params: { from, to } })).data,

  /** GET …/follow-ups: due by the end of today and not superseded by a later contact; oldest first. */
  followUps: async (mine: boolean, page: number, size: number): Promise<ApiResponse<OutreachPage<OutreachContact>>> =>
    (await axiosClient.get<ApiResponse<OutreachPage<OutreachContact>>>(`${BASE}/follow-ups`, { params: { mine, page, size } })).data,
};
