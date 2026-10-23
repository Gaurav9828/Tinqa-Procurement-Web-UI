/** Monthly salaries (Procurement /v1/admin/payroll, /v1/payroll/my-payslips). Amounts are rupees, as the server sends them. */

export type SalaryPaymentStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type SalaryLineKind = 'EARNING' | 'DEDUCTION';
export type MonthState = 'UPCOMING' | 'NO_EMPLOYEES' | 'NOT_STARTED' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'PAID';

export interface SalaryLine {
  kind: SalaryLineKind;
  label: string;
  amount: number;
}

export interface SalaryPayment {
  id: number;
  employeeId: number;
  payYear: number;
  payMonth: number;
  status: SalaryPaymentStatus;
  currency: string;
  monthlySalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  lines: SalaryLine[];
  transferDate: string;
  bankReference: string | null;
  note: string | null;
  recordedBy: number;
  recordedByName: string | null;
  recordedAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  payslipEmailTo: string | null;
  payslipEmailedAt: string | null;
  payslipEmailError: string | null;
  payslipEmailAttempts: number;
}

export interface MonthRow {
  employeeId: number;
  userId: number | null;
  employeeCode: string;
  name: string;
  designation: string | null;
  department: string | null;
  monthlySalary: number | null;
  currency: string;
  payable: boolean;
  notPayableReason: string | null;
  payment: SalaryPayment | null;
}

export interface MonthView {
  year: number;
  month: number;
  open: boolean;
  payableEmployees: number;
  notRecorded: number;
  pendingApproval: number;
  approved: number;
  pendingNetPay: number;
  approvedNetPay: number;
  rows: MonthRow[];
}

export interface MonthSummary {
  month: number;
  state: MonthState;
  payableEmployees: number;
  pendingApproval: number;
  approved: number;
  approvedNetPay: number;
}

export interface YearSummary {
  year: number;
  months: MonthSummary[];
  approvedNetPay: number;
}

export interface RecordEntry {
  employeeId: number;
  bankReference?: string | null;
  lines?: SalaryLine[];
}

export interface RecordPayload {
  transferDate: string;
  bankReference?: string | null;
  note?: string | null;
  entries: RecordEntry[];
}

export interface DecisionPayload {
  paymentIds: number[];
  decision: 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
}

export interface DecisionResult {
  decided: number;
  payments: SalaryPayment[];
}

export interface MyPayslip {
  id: number;
  payYear: number;
  payMonth: number;
  currency: string;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  transferDate: string;
  approvedAt: string;
}
