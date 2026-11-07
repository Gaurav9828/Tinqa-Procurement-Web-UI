import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { DealerPaymentEntry, OrderPayments, PaymentSummary, RecordPaymentRequest } from '../types/dealerPayment.types';

const BASE_URL = '/v1/orders';

/** Payments to dealers against an order's payment plan, refunds from them, and refund claims (DealerPaymentController). */
export const dealerPaymentApi = {
  forOrder: async (orderId: number): Promise<ApiResponse<OrderPayments>> =>
    (await axiosClient.get<ApiResponse<OrderPayments>>(`${BASE_URL}/${orderId}/payments`)).data,

  /** The dealer's own view: confirmed entries only. */
  forDealer: async (orderId: number): Promise<ApiResponse<OrderPayments>> =>
    (await axiosClient.get<ApiResponse<OrderPayments>>(`/v1/dealer-portal/orders/${orderId}/payments`)).data,

  record: async (orderId: number, payload: RecordPaymentRequest): Promise<ApiResponse<DealerPaymentEntry>> =>
    (await axiosClient.post<ApiResponse<DealerPaymentEntry>>(`${BASE_URL}/${orderId}/payments`, payload)).data,

  update: async (paymentId: number, payload: RecordPaymentRequest): Promise<ApiResponse<DealerPaymentEntry>> =>
    (await axiosClient.put<ApiResponse<DealerPaymentEntry>>(`${BASE_URL}/payments/${paymentId}`, payload)).data,

  withdraw: async (paymentId: number): Promise<ApiResponse<DealerPaymentEntry>> =>
    (await axiosClient.patch<ApiResponse<DealerPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/withdraw`)).data,

  reverse: async (paymentId: number, reason: string): Promise<ApiResponse<DealerPaymentEntry>> =>
    (await axiosClient.post<ApiResponse<DealerPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/reversal`, { reason })).data,

  decide: async (paymentId: number, decision: 'APPROVED' | 'REJECTED', reason?: string): Promise<ApiResponse<DealerPaymentEntry>> =>
    (await axiosClient.patch<ApiResponse<DealerPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/decision`, { decision, reason })).data,

  /** The Approvals Hub queue. */
  waiting: async (): Promise<ApiResponse<DealerPaymentEntry[]>> =>
    (await axiosClient.get<ApiResponse<DealerPaymentEntry[]>>(`${BASE_URL}/payments`, { params: { status: 'PENDING_APPROVAL' } })).data,

  adjustClaim: async (orderId: number, agreedAmount: number, reason: string): Promise<ApiResponse<PaymentSummary>> =>
    (await axiosClient.patch<ApiResponse<PaymentSummary>>(`${BASE_URL}/${orderId}/refund-claim`, { agreedAmount, reason })).data,
};
