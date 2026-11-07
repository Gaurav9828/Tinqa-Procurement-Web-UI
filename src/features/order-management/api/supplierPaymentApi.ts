import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { SupplierPaymentEntry, OrderPayments, PaymentSummary, RecordPaymentRequest } from '../types/supplierPayment.types';

const BASE_URL = '/v1/orders';

/** Payments to suppliers against an order's payment plan, refunds from them, and refund claims (SupplierPaymentController). */
export const supplierPaymentApi = {
  forOrder: async (orderId: number): Promise<ApiResponse<OrderPayments>> =>
    (await axiosClient.get<ApiResponse<OrderPayments>>(`${BASE_URL}/${orderId}/payments`)).data,

  /** The supplier's own view: confirmed entries only. */
  forSupplier: async (orderId: number): Promise<ApiResponse<OrderPayments>> =>
    (await axiosClient.get<ApiResponse<OrderPayments>>(`/v1/supplier-portal/orders/${orderId}/payments`)).data,

  record: async (orderId: number, payload: RecordPaymentRequest): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.post<ApiResponse<SupplierPaymentEntry>>(`${BASE_URL}/${orderId}/payments`, payload)).data,

  update: async (paymentId: number, payload: RecordPaymentRequest): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.put<ApiResponse<SupplierPaymentEntry>>(`${BASE_URL}/payments/${paymentId}`, payload)).data,

  withdraw: async (paymentId: number): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.patch<ApiResponse<SupplierPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/withdraw`)).data,

  reverse: async (paymentId: number, reason: string): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.post<ApiResponse<SupplierPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/reversal`, { reason })).data,

  decide: async (paymentId: number, decision: 'APPROVED' | 'REJECTED', reason?: string): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.patch<ApiResponse<SupplierPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/decision`, { decision, reason })).data,

  /** The Approvals Hub queue. */
  waiting: async (): Promise<ApiResponse<SupplierPaymentEntry[]>> =>
    (await axiosClient.get<ApiResponse<SupplierPaymentEntry[]>>(`${BASE_URL}/payments`, { params: { status: 'PENDING_APPROVAL' } })).data,

  adjustClaim: async (orderId: number, agreedAmount: number, reason: string): Promise<ApiResponse<PaymentSummary>> =>
    (await axiosClient.patch<ApiResponse<PaymentSummary>>(`${BASE_URL}/${orderId}/refund-claim`, { agreedAmount, reason })).data,
};
