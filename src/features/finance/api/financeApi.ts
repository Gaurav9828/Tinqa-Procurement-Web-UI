import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  FinanceCategory,
  FinanceOverview,
  Granularity,
  InvoiceAnalysis,
  LedgerEntry,
  LedgerListParams,
  Period,
  Voucher,
  VoucherDocument,
  VoucherDocumentKind,
  VoucherListParams,
  VoucherPayload,
} from '../types/finance.types';
import type { GstRegisterEntry, GstRegisterParams, GstSummary } from '../types/gst.types';

// Paths are relative to VITE_ECOMMERCE_API_BASE_URL (which already includes `/api`).
const BASE = '/admin/finance';
const voucherPath = (id: number) => `${BASE}/vouchers/${id}`;

/** Drops empty filters so the URL only carries what was chosen. */
const params = (values: object) =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ''));

export const financeApi = {
  /** GET /admin/finance/categories — every category with its P&L line and cash flow activity. */
  categories: async (): Promise<ApiResponse<FinanceCategory[]>> =>
    (await ecommerceAxiosClient.get<ApiResponse<FinanceCategory[]>>(`${BASE}/categories`)).data,

  /** GET /admin/finance/overview — P&L, cash flow, burn, working capital, trend and category totals for the period. */
  overview: async (period: Period, granularity?: Granularity): Promise<ApiResponse<FinanceOverview>> =>
    (await ecommerceAxiosClient.get<ApiResponse<FinanceOverview>>(`${BASE}/overview`, { params: params({ ...period, granularity }) }))
      .data,

  /** GET /admin/finance/ledger — newest first. */
  ledger: async (query: LedgerListParams): Promise<ApiResponse<PageResponse<LedgerEntry>>> =>
    (await ecommerceAxiosClient.get<ApiResponse<PageResponse<LedgerEntry>>>(`${BASE}/ledger`, { params: params(query) })).data,

  /** GET /admin/finance/ledger/export — every entry of the period, oldest first (FINANCE_REPORT_EXPORT). */
  exportLedger: async (period: Period): Promise<ApiResponse<LedgerEntry[]>> =>
    (await ecommerceAxiosClient.get<ApiResponse<LedgerEntry[]>>(`${BASE}/ledger/export`, { params: params(period) })).data,

  /** POST /admin/finance/sync/procurement — reads new supplier purchases now (idempotent). */
  syncProcurement: async (): Promise<ApiResponse<{ posted: number; read: number }>> =>
    (await ecommerceAxiosClient.post<ApiResponse<{ posted: number; read: number }>>(`${BASE}/sync/procurement`)).data,

  /** GET /admin/finance/gst/summary — output tax, input tax credit, month-by-month set-off and what is payable. */
  gstSummary: async (period: Period): Promise<ApiResponse<GstSummary>> =>
    (await ecommerceAxiosClient.get<ApiResponse<GstSummary>>(`${BASE}/gst/summary`, { params: params(period) })).data,

  /** GET /admin/finance/gst/register — the GST register rows, newest first. */
  gstRegister: async (query: GstRegisterParams): Promise<ApiResponse<PageResponse<GstRegisterEntry>>> =>
    (await ecommerceAxiosClient.get<ApiResponse<PageResponse<GstRegisterEntry>>>(`${BASE}/gst/register`, { params: params(query) })).data,

  /** GET /admin/finance/gst/register/export — every row of the period, oldest first (FINANCE_REPORT_EXPORT). */
  exportGstRegister: async (period: Period): Promise<ApiResponse<GstRegisterEntry[]>> =>
    (await ecommerceAxiosClient.get<ApiResponse<GstRegisterEntry[]>>(`${BASE}/gst/register/export`, { params: params(period) })).data,

  listVouchers: async (query: VoucherListParams): Promise<ApiResponse<PageResponse<Voucher>>> =>
    (await ecommerceAxiosClient.get<ApiResponse<PageResponse<Voucher>>>(`${BASE}/vouchers`, { params: params(query) })).data,

  createVoucher: async (payload: VoucherPayload): Promise<ApiResponse<Voucher>> =>
    (await ecommerceAxiosClient.post<ApiResponse<Voucher>>(`${BASE}/vouchers`, payload)).data,

  /** Only whoever raised it, while it waits for approval. */
  updateVoucher: async (id: number, payload: VoucherPayload): Promise<ApiResponse<Voucher>> =>
    (await ecommerceAxiosClient.put<ApiResponse<Voucher>>(voucherPath(id), payload)).data,

  cancelVoucher: async (id: number): Promise<ApiResponse<Voucher>> =>
    (await ecommerceAxiosClient.post<ApiResponse<Voucher>>(`${voucherPath(id)}/cancel`)).data,

  /** A different approver; posts the voucher to the company account. */
  approveVoucher: async (id: number, comment?: string): Promise<ApiResponse<Voucher>> =>
    (await ecommerceAxiosClient.post<ApiResponse<Voucher>>(`${voucherPath(id)}/approve`, { comment: comment || null })).data,

  rejectVoucher: async (id: number, comment: string): Promise<ApiResponse<Voucher>> =>
    (await ecommerceAxiosClient.post<ApiResponse<Voucher>>(`${voucherPath(id)}/reject`, { comment })).data,

  /**
   * Attaches a bill or receipt (only whoever raised the voucher, while it awaits approval). The server checks the type
   * from the bytes and stores it under a name built from the voucher; returns the voucher with its documents.
   */
  uploadDocument: async (
    id: number,
    file: File,
    kind: VoucherDocumentKind,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<Voucher>> => {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    return (
      await ecommerceAxiosClient.post<ApiResponse<Voucher>>(`${voucherPath(id)}/documents`, form, {
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      })
    ).data;
  },

  /** Reads an invoice PDF before it is attached: checks it and returns its details to pre-fill the form. Stores nothing. */
  analyzeInvoice: async (file: File): Promise<ApiResponse<InvoiceAnalysis>> => {
    const form = new FormData();
    form.append('file', file);
    return (await ecommerceAxiosClient.post<ApiResponse<InvoiceAnalysis>>(`${BASE}/invoices/analyze`, form)).data;
  },

  removeDocument: async (id: number, documentId: number): Promise<ApiResponse<Voucher>> =>
    (await ecommerceAxiosClient.delete<ApiResponse<Voucher>>(`${voucherPath(id)}/documents/${documentId}`)).data,

  /** The file itself (EXPENSE_VIEW), through the authenticated client. */
  downloadDocument: async (id: number, document: Pick<VoucherDocument, 'id' | 'contentType'>): Promise<Blob> => {
    const response = await ecommerceAxiosClient.get<Blob>(`${voucherPath(id)}/documents/${document.id}`, { responseType: 'blob' });
    return new Blob([response.data], { type: document.contentType });
  },

  /** GET /company/profile (public): the company's own GSTIN, to tell same-state from inter-state bills. */
  companyGstin: async (): Promise<string | null> =>
    (await ecommerceAxiosClient.get<ApiResponse<{ gstin: string | null } | null>>('/company/profile')).data.data?.gstin ?? null,

  /** Posts an equal and opposite entry; the original stays in the ledger. */
  reverseVoucher: async (id: number, comment: string): Promise<ApiResponse<Voucher>> =>
    (await ecommerceAxiosClient.post<ApiResponse<Voucher>>(`${voucherPath(id)}/reverse`, { comment })).data,
};
