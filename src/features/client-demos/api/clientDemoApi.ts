import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
  DemoDetail,
  DemoMode,
  DemoPayload,
  DemoStatus,
  DemoSummary,
  DemoUnitOption,
  ExpensePayload,
  StaffMember,
} from '../types/clientDemo.types';

const BASE = '/v1/admin/client-demos';
const MINE = '/v1/client-demos/mine';

const root = (mode: DemoMode) => (mode === 'manager' ? BASE : MINE);

export interface DemoListFilter {
  from?: string;
  to?: string;
  status?: DemoStatus[];
}

export const clientDemoApi = {
  /** GET /v1/admin/client-demos: demos starting in [from, to] in the given statuses, newest visit first (DEMO_VIEW). */
  list: async (filter: DemoListFilter): Promise<ApiResponse<DemoSummary[]>> => {
    const params = new URLSearchParams();
    if (filter.from) params.append('from', filter.from);
    if (filter.to) params.append('to', filter.to);
    filter.status?.forEach((status) => params.append('status', status));
    return (await axiosClient.get<ApiResponse<DemoSummary[]>>(BASE, { params })).data;
  },

  /** GET …/waiting: quotations, completions and corrections waiting for a decision (DEMO_APPROVE). */
  waiting: async (): Promise<ApiResponse<DemoSummary[]>> => (await axiosClient.get<ApiResponse<DemoSummary[]>>(`${BASE}/waiting`)).data,

  /** GET …/staff: employees who can be tagged as attending staff (DEMO_MANAGE). */
  staff: async (): Promise<ApiResponse<StaffMember[]>> => (await axiosClient.get<ApiResponse<StaffMember[]>>(`${BASE}/staff`)).data,

  /**
   * GET …/units: the product's units in stock, each saying whether it can be picked for a demo on these days (DEMO_MANAGE).
   * `demoId`: the demo being changed, whose own units don't count as taken.
   */
  unitOptions: async (productId: number, startDate: string, days: number, demoId: number | null): Promise<ApiResponse<DemoUnitOption[]>> =>
    (await axiosClient.get<ApiResponse<DemoUnitOption[]>>(`${BASE}/units`, { params: { productId, startDate, days, ...(demoId ? { demoId } : {}) } })).data,

  /** GET …/units/lookup: one unit by its barcode (typed or scanned), with its product (DEMO_MANAGE). */
  unitLookup: async (code: string, startDate: string, days: number, demoId: number | null): Promise<ApiResponse<DemoUnitOption>> =>
    (await axiosClient.get<ApiResponse<DemoUnitOption>>(`${BASE}/units/lookup`, { params: { code, startDate, days, ...(demoId ? { demoId } : {}) } })).data,

  /** POST …/{id}/units/hand-out: units leave stock on a day of the demo (DEMO_MANAGE, or DEMO_UNITS_HANDLE_OWN on your own). */
  handOut: async (mode: DemoMode, id: number, barcodes: string[]): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${root(mode)}/${id}/units/hand-out`, { barcodes })).data,

  /** POST …/{id}/units/hand-back: units come back into stock (DEMO_MANAGE, or DEMO_UNITS_HANDLE_OWN on your own). */
  handBack: async (mode: DemoMode, id: number, barcodes: string[]): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${root(mode)}/${id}/units/hand-back`, { barcodes })).data,

  /** POST …/{id}/units/write-off: a unit that did not come back leaves stock for good (DEMO_UNIT_WRITE_OFF, Super Admin). */
  writeOff: async (id: number, barcode: string, reason: string): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${BASE}/${id}/units/write-off`, { barcode, reason })).data,

  /** GET /v1/client-demos/mine: the demos you attend (DEMO_VIEW_OWN). */
  mine: async (): Promise<ApiResponse<DemoSummary[]>> => (await axiosClient.get<ApiResponse<DemoSummary[]>>(MINE)).data,

  /** One demo: GET …/{id} (DEMO_VIEW), or one you attend (DEMO_VIEW_OWN). */
  get: async (mode: DemoMode, id: number): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.get<ApiResponse<DemoDetail>>(`${root(mode)}/${id}`)).data,

  /** POST: saves a new demo as a draft (DEMO_MANAGE). */
  create: async (payload: DemoPayload): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(BASE, payload)).data,

  /** PUT …/{id}: changes the plan; a reason once approved (DEMO_MANAGE). */
  update: async (id: number, payload: DemoPayload): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.put<ApiResponse<DemoDetail>>(`${BASE}/${id}`, payload)).data,

  /** DELETE …/{id}: a draft never sent for approval (DEMO_MANAGE). */
  remove: async (id: number): Promise<ApiResponse<void>> => (await axiosClient.delete<ApiResponse<void>>(`${BASE}/${id}`)).data,

  submit: async (id: number): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${BASE}/${id}/submit`)).data,

  complete: async (id: number, outcome: string): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${BASE}/${id}/complete`, { outcome })).data,

  withdraw: async (id: number): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${BASE}/${id}/withdraw`)).data,

  cancel: async (id: number, reason: string): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${BASE}/${id}/cancel`, { reason })).data,

  /** POST …/{id}/decision: approves or rejects the waiting quotation / completion (DEMO_APPROVE). */
  decide: async (id: number, decision: 'APPROVED' | 'REJECTED', reason: string | null): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${BASE}/${id}/decision`, { decision, reason })).data,

  /** POST …/{id}/reopen: a Super Admin opens a completed demo for correction (DEMO_COMPLETED_EDIT). */
  reopen: async (id: number, reason: string): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${BASE}/${id}/reopen`, { reason })).data,

  addExpense: async (mode: DemoMode, id: number, payload: ExpensePayload): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.post<ApiResponse<DemoDetail>>(`${root(mode)}/${id}/expenses`, payload)).data,

  updateExpense: async (mode: DemoMode, id: number, expenseId: number, payload: ExpensePayload): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.put<ApiResponse<DemoDetail>>(`${root(mode)}/${id}/expenses/${expenseId}`, payload)).data,

  removeExpense: async (mode: DemoMode, id: number, expenseId: number, reason: string | null): Promise<ApiResponse<DemoDetail>> =>
    (await axiosClient.delete<ApiResponse<DemoDetail>>(`${root(mode)}/${id}/expenses/${expenseId}`, { params: reason ? { reason } : {} })).data,

  /** POST …/expenses/{expenseId}/invoice: the bill's invoice or ticket, a PDF or a photo. */
  attachInvoice: async (mode: DemoMode, id: number, expenseId: number, file: File): Promise<ApiResponse<DemoDetail>> => {
    const form = new FormData();
    form.append('file', file);
    return (await axiosClient.post<ApiResponse<DemoDetail>>(`${root(mode)}/${id}/expenses/${expenseId}/invoice`, form)).data;
  },

  invoice: async (mode: DemoMode, id: number, expenseId: number): Promise<Blob> =>
    (await axiosClient.get<Blob>(`${root(mode)}/${id}/expenses/${expenseId}/invoice`, { responseType: 'blob' })).data,
};
