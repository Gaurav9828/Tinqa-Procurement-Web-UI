import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
  DecisionPayload,
  DecisionResult,
  MonthView,
  MyPayslip,
  RecordPayload,
  SalaryPayment,
  YearSummary,
} from '../types/payroll.types';

const BASE = '/v1/admin/payroll';
const MINE = '/v1/payroll/my-payslips';

/** A rendered payslip: built by the server on every request, never stored. */
const pdf = async (path: string, download: boolean): Promise<Blob> => {
  const response = await axiosClient.get<Blob>(path, { params: { download }, responseType: 'blob' });
  return new Blob([response.data], { type: 'application/pdf' });
};

export const payrollApi = {
  /** GET /v1/admin/payroll/years/{year}: each month's progress (PAYMENT_VIEW). */
  year: async (year: number): Promise<ApiResponse<YearSummary>> =>
    (await axiosClient.get<ApiResponse<YearSummary>>(`${BASE}/years/${year}`)).data,

  /** GET /v1/admin/payroll/years/{year}/months/{month}: every employee paid that month and their payment (PAYMENT_VIEW). */
  month: async (year: number, month: number): Promise<ApiResponse<MonthView>> =>
    (await axiosClient.get<ApiResponse<MonthView>>(`${BASE}/years/${year}/months/${month}`)).data,

  /** POST …/payments: records salaries as transferred, for someone else to confirm (PAYMENT_RECORD). */
  record: async (year: number, month: number, payload: RecordPayload): Promise<ApiResponse<SalaryPayment[]>> =>
    (await axiosClient.post<ApiResponse<SalaryPayment[]>>(`${BASE}/years/${year}/months/${month}/payments`, payload)).data,

  /** POST /v1/admin/payroll/payments/decision: confirms (books + emails payslips) or rejects (PAYMENT_APPROVE). */
  decide: async (payload: DecisionPayload): Promise<ApiResponse<DecisionResult>> =>
    (await axiosClient.post<ApiResponse<DecisionResult>>(`${BASE}/payments/decision`, payload)).data,

  /** POST …/payments/{id}/withdraw: takes back a recorded salary nobody decided on yet (PAYMENT_RECORD). */
  withdraw: async (id: number): Promise<ApiResponse<SalaryPayment>> =>
    (await axiosClient.post<ApiResponse<SalaryPayment>>(`${BASE}/payments/${id}/withdraw`)).data,

  /** POST …/payments/{id}/payslip/resend: emails a confirmed payslip again (PAYMENT_RECORD). */
  resendPayslip: async (id: number): Promise<ApiResponse<SalaryPayment>> =>
    (await axiosClient.post<ApiResponse<SalaryPayment>>(`${BASE}/payments/${id}/payslip/resend`)).data,

  /** GET …/payments/{id}/payslip: any employee's confirmed payslip (PAYMENT_VIEW). */
  payslip: (id: number, download: boolean): Promise<Blob> => pdf(`${BASE}/payments/${id}/payslip`, download),

  /** GET /v1/payroll/my-payslips: the signed-in employee's confirmed months (PAYSLIP_VIEW_OWN). */
  myPayslips: async (): Promise<ApiResponse<MyPayslip[]>> => (await axiosClient.get<ApiResponse<MyPayslip[]>>(MINE)).data,

  /** GET /v1/payroll/my-payslips/{id}/pdf: one of the signed-in employee's own payslips (PAYSLIP_VIEW_OWN). */
  myPayslip: (id: number, download: boolean): Promise<Blob> => pdf(`${MINE}/${id}/pdf`, download),
};
