import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
  SupplierPaymentEntry,
  OrderPayments,
  PaymentSummary,
  RecordPaymentRequest,
  MarkPaidRequest,
  ResendPaymentRequest,
  RepaymentRequest,
  RefundDuePaymentRequest,
} from '../types/supplierPayment.types';
import type { OrderTimeline } from '../types/orderTimeline.types';

const BASE_URL = '/v1/orders';

/** Multipart body of a repayment (the supplier's pay-back): method, reference unless cash, date, note, receipt. */
const repaymentForm = (payload: RepaymentRequest, amount?: number): FormData => {
  const form = new FormData();
  if (amount !== undefined) form.append('amount', String(amount));
  form.append('method', payload.method);
  if (payload.reference) form.append('reference', payload.reference);
  form.append('paidOn', payload.paidOn);
  if (payload.note) form.append('note', payload.note);
  if (payload.receipt) form.append('receipt', payload.receipt);
  return form;
};

/** Payments to suppliers against an order's payment plan, money they pay back, and refund claims (SupplierPaymentController). */
export const supplierPaymentApi = {
  forOrder: async (orderId: number): Promise<ApiResponse<OrderPayments>> =>
    (await axiosClient.get<ApiResponse<OrderPayments>>(`${BASE_URL}/${orderId}/payments`)).data,

  /** The supplier's own view: confirmed entries, and payments waiting for them to confirm receipt. */
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

  /** An approved request was paid: the reference and the date; it then waits for the supplier. */
  markPaid: async (paymentId: number, payload: MarkPaidRequest): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.patch<ApiResponse<SupplierPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/paid`, payload)).data,

  /** After the supplier said "not received": sent again, with what was checked and optionally a proof file. */
  resend: async (paymentId: number, payload: ResendPaymentRequest): Promise<ApiResponse<SupplierPaymentEntry>> => {
    const form = new FormData();
    if (payload.reference) form.append('reference', payload.reference);
    form.append('paidOn', payload.paidOn);
    form.append('note', payload.note);
    if (payload.proof) form.append('proof', payload.proof);
    // Content-Type (with boundary) is set by the browser for FormData.
    return (await axiosClient.post<ApiResponse<SupplierPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/resend`, form)).data;
  },

  /** A re-send's proof file, for staff or (supplier view) for the order's supplier. */
  downloadProof: async (paymentId: number, documentId: number, view: 'staff' | 'supplier'): Promise<Blob> => {
    const path = view === 'supplier'
      ? `/v1/supplier-portal/payments/${paymentId}/proofs/${documentId}`
      : `${BASE_URL}/payments/${paymentId}/proofs/${documentId}`;
    const response = await axiosClient.get<Blob>(path, { responseType: 'blob' });
    return new Blob([response.data], { type: (response.headers['content-type'] as string) || 'application/octet-stream' });
  },

  decide: async (paymentId: number, decision: 'APPROVED' | 'REJECTED', reason?: string): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.patch<ApiResponse<SupplierPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/decision`, { decision, reason })).data,

  /** The supplier says whether a payment reached them (it counts as paid only then). */
  confirmReceipt: async (paymentId: number, received: boolean, reason?: string): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.patch<ApiResponse<SupplierPaymentEntry>>(`/v1/supplier-portal/payments/${paymentId}/receipt`, { received, reason })).data,

  /** Approvals Hub › Payments to make: approved requests to pay, and payments the supplier said they did not receive. */
  toMake: async (): Promise<ApiResponse<SupplierPaymentEntry[]>> =>
    (await axiosClient.get<ApiResponse<SupplierPaymentEntry[]>>(`${BASE_URL}/payments/to-make`)).data,

  /** The order's flow history: quotation, approvals, the supplier's answers, payments (staff or the supplier's own view). */
  timeline: async (orderId: number, view: 'staff' | 'supplier'): Promise<ApiResponse<OrderTimeline>> =>
    (await axiosClient.get<ApiResponse<OrderTimeline>>(view === 'supplier' ? `/v1/supplier-portal/orders/${orderId}/timeline` : `${BASE_URL}/${orderId}/timeline`)).data,

  /** The Approvals Hub queue (Super Admin): payment requests, refunds and reversals to decide. */
  waiting: async (): Promise<ApiResponse<SupplierPaymentEntry[]>> =>
    (await axiosClient.get<ApiResponse<SupplierPaymentEntry[]>>(`${BASE_URL}/payments`, { params: { status: 'PENDING_APPROVAL' } })).data,

  /** Approvals Hub › Supplier repayments: money the suppliers say they paid back, for the Finance Manager to check (oldest first). */
  repaymentsToCheck: async (): Promise<ApiResponse<SupplierPaymentEntry[]>> =>
    (await axiosClient.get<ApiResponse<SupplierPaymentEntry[]>>(`${BASE_URL}/payments/repayments-to-check`)).data,

  /** The Finance Manager checks a repayment: it arrived (counts), or not (a reason; the supplier sends it again). */
  checkRepayment: async (paymentId: number, received: boolean, reason?: string): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.patch<ApiResponse<SupplierPaymentEntry>>(`${BASE_URL}/payments/${paymentId}/repayment-check`, { received, reason })).data,

  /** The supplier pays back an ask (a reversal or a return), or sends it again after "not received". Multipart. */
  submitRepayment: async (paymentId: number, payload: RepaymentRequest): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.post<ApiResponse<SupplierPaymentEntry>>(`/v1/supplier-portal/payments/${paymentId}/repayment`, repaymentForm(payload))).data,

  /** The supplier pays a refund due on the order's claim on their own. Multipart. */
  payRefundDue: async (orderId: number, payload: RefundDuePaymentRequest): Promise<ApiResponse<SupplierPaymentEntry>> =>
    (await axiosClient.post<ApiResponse<SupplierPaymentEntry>>(`/v1/supplier-portal/orders/${orderId}/repayments`, repaymentForm(payload, payload.amount))).data,

  adjustClaim: async (orderId: number, agreedAmount: number, reason: string): Promise<ApiResponse<PaymentSummary>> =>
    (await axiosClient.patch<ApiResponse<PaymentSummary>>(`${BASE_URL}/${orderId}/refund-claim`, { agreedAmount, reason })).data,
};
