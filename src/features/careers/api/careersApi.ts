import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  AdminOpening,
  AdminOpeningRow,
  ApplicationDetail,
  ApplicationListParams,
  ApplicationRow,
  CareerCategory,
  InterviewRequest,
  MatchRequest,
  OpeningListParams,
  OpeningRequest,
  OutcomeRequest, CareersSettings } from '../types/careers.types';

const BASE = '/admin/careers';
const app = (id: number) => `${BASE}/applications/${id}`;

type Detail = Promise<ApiResponse<ApplicationDetail>>;

const post = async <T,>(url: string, body?: unknown): Promise<ApiResponse<T>> => (await ecommerceAxiosClient.post<ApiResponse<T>>(url, body)).data;

/** Staff careers API (docs/careers.md). Each call's permission is in config/endpointAccess.ts. */
export const careersApi = {
  /** GET /settings (CAREER_OPENING_VIEW): whether the website shows the Careers tab. */
  settings: async (): Promise<ApiResponse<CareersSettings>> =>
    (await ecommerceAxiosClient.get<ApiResponse<CareersSettings>>(`${BASE}/settings`)).data,

  /** PUT /settings (STOREFRONT_FEATURE_TOGGLE, Super Admin): hide the Careers tab or bring it back. */
  updateSettings: async (careersEnabled: boolean): Promise<ApiResponse<CareersSettings>> =>
    (await ecommerceAxiosClient.put<ApiResponse<CareersSettings>>(`${BASE}/settings`, { careersEnabled })).data,

  /** GET /categories (CAREER_OPENING_VIEW): small by design. */
  categories: async (): Promise<ApiResponse<CareerCategory[]>> =>
    (await ecommerceAxiosClient.get<ApiResponse<CareerCategory[]>>(`${BASE}/categories`)).data,

  /** GET /openings (CAREER_OPENING_VIEW): a page, filtered by status, category and search. */
  openings: async ({ status, categoryId, q, page, size }: OpeningListParams): Promise<ApiResponse<PageResponse<AdminOpeningRow>>> =>
    (
      await ecommerceAxiosClient.get<ApiResponse<PageResponse<AdminOpeningRow>>>(`${BASE}/openings`, {
        params: { ...(status ? { status } : {}), ...(categoryId ? { categoryId } : {}), ...(q ? { q } : {}), page, size },
      })
    ).data,

  opening: async (id: number): Promise<ApiResponse<AdminOpening>> =>
    (await ecommerceAxiosClient.get<ApiResponse<AdminOpening>>(`${BASE}/openings/${id}`)).data,

  /** POST /openings (CAREER_OPENING_MANAGE): saved as a draft; the job ID is assigned by the server. */
  createOpening: (request: OpeningRequest) => post<AdminOpening>(`${BASE}/openings`, request),

  /** PUT /openings/{id} with the version read, so a change made meanwhile is refused (CAREER_STALE_VERSION). */
  updateOpening: async (id: number, request: OpeningRequest): Promise<ApiResponse<AdminOpening>> =>
    (await ecommerceAxiosClient.put<ApiResponse<AdminOpening>>(`${BASE}/openings/${id}`, request)).data,

  /** Publishes a draft, or reopens a closed opening. */
  publishOpening: (id: number) => post<AdminOpening>(`${BASE}/openings/${id}/publish`),
  closeOpening: (id: number) => post<AdminOpening>(`${BASE}/openings/${id}/close`),

  /** GET /applications (CAREER_APPLICATION_VIEW): a page, one opening's or every opening's. */
  applications: async ({ openingId, status, match, q, sort, page, size }: ApplicationListParams): Promise<ApiResponse<PageResponse<ApplicationRow>>> =>
    (
      await ecommerceAxiosClient.get<ApiResponse<PageResponse<ApplicationRow>>>(`${BASE}/applications`, {
        params: {
          ...(openingId ? { openingId } : {}),
          ...(status?.length ? { status: status.join(',') } : {}),
          ...(match ? { match } : {}),
          ...(q ? { q } : {}),
          sort,
          page,
          size,
        },
      })
    ).data,

  application: async (id: number): Detail => (await ecommerceAxiosClient.get<ApiResponse<ApplicationDetail>>(app(id))).data,

  /** GET /applications/{id}/resume: the PDF itself, through the authenticated client (never a bare link). */
  resume: async (id: number): Promise<Blob> => {
    const response = await ecommerceAxiosClient.get<Blob>(`${app(id)}/resume`, { responseType: 'blob' });
    return new Blob([response.data], { type: 'application/pdf' });
  },

  saveMatch: (id: number, match: MatchRequest): Detail => post(`${app(id)}/match`, match),
  shortlist: (id: number, note: string | null): Detail => post(`${app(id)}/shortlist`, { note }),
  select: (id: number, note: string | null): Detail => post(`${app(id)}/select`, { note }),
  reject: (id: number, reason: string, notifyCandidate: boolean): Detail => post(`${app(id)}/reject`, { reason, notifyCandidate }),
  withdraw: (id: number, reason: string): Detail => post(`${app(id)}/withdraw`, { reason }),
  approve: (id: number, note: string | null): Detail => post(`${app(id)}/decision/approve`, { note }),
  returnDecision: (id: number, note: string): Detail => post(`${app(id)}/decision/return`, { note }),

  scheduleInterview: (id: number, request: InterviewRequest): Detail => post(`${app(id)}/interviews`, request),
  rescheduleInterview: async (id: number, interviewId: number, request: InterviewRequest): Detail =>
    (await ecommerceAxiosClient.put<ApiResponse<ApplicationDetail>>(`${app(id)}/interviews/${interviewId}`, request)).data,
  cancelInterview: (id: number, interviewId: number, reason: string): Detail => post(`${app(id)}/interviews/${interviewId}/cancel`, { reason }),
  recordOutcome: (id: number, interviewId: number, outcome: OutcomeRequest): Detail =>
    post(`${app(id)}/interviews/${interviewId}/outcome`, outcome),
};
