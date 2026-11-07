import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { DispatchReturnRequest, OrderReturns, RaiseReturnRequest, SupplierReturn } from '../types/supplierReturn.types';

const BASE_URL = '/v1/orders';
const PORTAL_URL = '/v1/supplier-portal';

/** Failed-piece returns to the supplier (staff: SupplierReturnController; the supplier: the portal's own endpoints). */
export const supplierReturnApi = {
  /** An order's returns (PROCUREMENT_ORDER_VIEW), or the supplier's own view of them (SUPPLIER_PORTAL_VIEW). */
  forOrder: async (orderId: number, view: 'staff' | 'supplier'): Promise<ApiResponse<OrderReturns>> =>
    (await axiosClient.get<ApiResponse<OrderReturns>>(view === 'supplier' ? `${PORTAL_URL}/orders/${orderId}/returns` : `${BASE_URL}/${orderId}/returns`)).data,

  raise: async (orderId: number, payload: RaiseReturnRequest): Promise<ApiResponse<SupplierReturn>> =>
    (await axiosClient.post<ApiResponse<SupplierReturn>>(`${BASE_URL}/${orderId}/returns`, payload)).data,

  /** Approvals Hub › Supplier returns: returns waiting for the Super Admin, oldest first. */
  waiting: async (): Promise<ApiResponse<SupplierReturn[]>> =>
    (await axiosClient.get<ApiResponse<SupplierReturn[]>>(`${BASE_URL}/returns/waiting`)).data,

  decide: async (returnId: number, decision: 'APPROVED' | 'REJECTED', reason?: string): Promise<ApiResponse<SupplierReturn>> =>
    (await axiosClient.patch<ApiResponse<SupplierReturn>>(`${BASE_URL}/returns/${returnId}/decision`, { decision, reason })).data,

  /** After the supplier declined: sent to them again with a note. */
  resend: async (returnId: number, note: string): Promise<ApiResponse<SupplierReturn>> =>
    (await axiosClient.patch<ApiResponse<SupplierReturn>>(`${BASE_URL}/returns/${returnId}/resend`, { note })).data,

  cancel: async (returnId: number, reason: string): Promise<ApiResponse<SupplierReturn>> =>
    (await axiosClient.patch<ApiResponse<SupplierReturn>>(`${BASE_URL}/returns/${returnId}/cancel`, { reason })).data,

  dispatch: async (returnId: number, payload: DispatchReturnRequest): Promise<ApiResponse<SupplierReturn>> =>
    (await axiosClient.patch<ApiResponse<SupplierReturn>>(`${BASE_URL}/returns/${returnId}/dispatch`, payload)).data,

  /** The supplier accepts or declines (with a reason) a return sent to them. */
  respond: async (returnId: number, accepted: boolean, reason?: string): Promise<ApiResponse<SupplierReturn>> =>
    (await axiosClient.patch<ApiResponse<SupplierReturn>>(`${PORTAL_URL}/returns/${returnId}/response`, { accepted, reason })).data,

  /** The supplier confirms the pieces arrived; the repayment ask is created. */
  received: async (returnId: number, note?: string): Promise<ApiResponse<SupplierReturn>> =>
    (await axiosClient.patch<ApiResponse<SupplierReturn>>(`${PORTAL_URL}/returns/${returnId}/received`, { note })).data,
};
