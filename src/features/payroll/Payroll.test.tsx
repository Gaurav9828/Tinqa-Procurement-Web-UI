import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import type { ApiResponse } from '../../types/common.types';
import { payrollApi } from './api/payrollApi';
import { PaymentsPage } from './pages/PaymentsPage';
import { MyPayslipsPage } from './pages/MyPayslipsPage';
import type { MonthRow, MonthState, MonthView, SalaryPayment, YearSummary } from './types/payroll.types';
import { createEndpointMatcher, PROCUREMENT_ENDPOINTS } from '../../config/endpointAccess';

// Only the network layer is mocked.
vi.mock('./api/payrollApi', () => ({
  payrollApi: {
    year: vi.fn(),
    month: vi.fn(),
    record: vi.fn(),
    decide: vi.fn(),
    withdraw: vi.fn(),
    resendPayslip: vi.fn(),
    payslip: vi.fn(),
    myPayslips: vi.fn(),
    myPayslip: vi.fn(),
  },
}));

const api = vi.mocked(payrollApi);
const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });

const ME = 1;
const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: null,
    isAuthenticated: true,
    user: { userId: ME, username: 'fin', email: 'fin@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;

const payment = (id: number, employeeId: number, status: SalaryPayment['status'], recordedBy: number): SalaryPayment => ({
  id, employeeId, payYear: YEAR, payMonth: MONTH, status, currency: 'INR', monthlySalary: 30000, totalEarnings: 30000,
  totalDeductions: 0, netPay: 30000, lines: [], transferDate: `${YEAR}-${String(MONTH).padStart(2, '0')}-01`, bankReference: 'UTR1',
  note: null, recordedBy, recordedByName: recordedBy === ME ? 'fin' : 'other', recordedAt: '', decidedByName: null, decidedAt: null,
  rejectionReason: null, payslipEmailTo: null, payslipEmailedAt: null, payslipEmailError: null, payslipEmailAttempts: 0,
});

const row = (employeeId: number, name: string, extra: Partial<MonthRow> = {}): MonthRow => ({
  employeeId, userId: 100 + employeeId, employeeCode: `EMP-000${employeeId}`, name, designation: 'Delivery Rider / Courier',
  department: 'Logistics', monthlySalary: 30000, currency: 'INR', payable: true, notPayableReason: null, payment: null, ...extra,
});

const MONTH_VIEW: MonthView = {
  year: YEAR, month: MONTH, open: true, payableEmployees: 4, notRecorded: 2, pendingApproval: 2, approved: 0, pendingNetPay: 60000,
  approvedNetPay: 0,
  rows: [
    row(1, 'Asha Verma'),
    row(2, 'Ravi Kumar'),
    row(3, 'Meera Iyer', { payment: payment(31, 3, 'PENDING_APPROVAL', 7) }),
    // Recorded by the signed-in user: someone else confirms it
    row(4, 'Kabir Shah', { payment: payment(41, 4, 'PENDING_APPROVAL', ME) }),
    row(5, 'New Joiner', { payable: false, monthlySalary: null, notPayableReason: 'No monthly salary is set. Add it in Employee Management first.' }),
  ],
};

const stateOf = (month: number): MonthState => {
  if (month > MONTH) return 'UPCOMING';
  return month === MONTH ? 'IN_PROGRESS' : 'PAID';
};

const YEAR_SUMMARY: YearSummary = {
  year: YEAR,
  approvedNetPay: 0,
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, state: stateOf(i + 1), payableEmployees: 4,
    pendingApproval: i + 1 === MONTH ? 2 : 0, approved: i + 1 < MONTH ? 4 : 0, approvedNetPay: i + 1 < MONTH ? 120000 : 0,
  })),
};

const renderPage = (page: React.ReactElement) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter>
        <GlobalAlertContainer />
        {page}
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.year.mockResolvedValue(ok(YEAR_SUMMARY));
  api.month.mockResolvedValue(ok(MONTH_VIEW));
});

describe('Payments & Chalans: salaries', () => {
  it('records every unpaid employee at once, for someone else to confirm', async () => {
    signIn(['PAYMENT_VIEW', 'PAYMENT_RECORD', 'PAYMENT_APPROVE']);
    api.record.mockResolvedValue(ok([], '2 salaries recorded as transferred.'));
    renderPage(<PaymentsPage />);

    const recordAll = await screen.findByRole('button', { name: 'Record all unpaid (2)' });
    expect(screen.getByText('No monthly salary is set. Add it in Employee Management first.')).toBeInTheDocument();
    await userEvent.click(recordAll);
    const dialog = screen.getByRole('dialog', { name: 'Record 2 salaries' });
    expect(within(dialog).getByText('Asha Verma')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Bank reference'), 'BATCH-OCT');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record for confirmation' }));

    await waitFor(() => expect(api.record).toHaveBeenCalledTimes(1));
    const [year, month, payload] = api.record.mock.calls[0];
    expect([year, month]).toEqual([YEAR, MONTH]);
    expect(payload.entries.map((entry) => entry.employeeId)).toEqual([1, 2]);
    expect(payload.bankReference).toBe('BATCH-OCT');
    expect(await screen.findByText('2 salaries recorded as transferred.')).toBeInTheDocument();
  });

  it('adds a bonus and a deduction to one employee and shows the net pay', async () => {
    signIn(['PAYMENT_VIEW', 'PAYMENT_RECORD']);
    api.record.mockResolvedValue(ok([]));
    renderPage(<PaymentsPage />);

    const asha = (await screen.findByText('Asha Verma')).closest('tr')!;
    await userEvent.click(within(asha).getByRole('button', { name: /Record/ }));
    const dialog = screen.getByRole('dialog', { name: "Record Asha Verma's salary" });
    await userEvent.click(within(dialog).getByRole('button', { name: /Add earning/ }));
    await userEvent.type(within(dialog).getAllByLabelText('Description')[0], 'Festival bonus');
    await userEvent.type(within(dialog).getAllByLabelText('Amount')[0], '5000');
    await userEvent.click(within(dialog).getByRole('button', { name: /Add deduction/ }));
    await userEvent.type(within(dialog).getAllByLabelText('Description')[1], 'TDS');
    await userEvent.type(within(dialog).getAllByLabelText('Amount')[1], '2000');
    expect(within(dialog).getByText('₹33,000.00')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Record for confirmation' }));
    await waitFor(() => expect(api.record).toHaveBeenCalled());
    expect(api.record.mock.calls[0][2].entries).toEqual([{ employeeId: 1, lines: [
      { kind: 'EARNING', label: 'Festival bonus', amount: 5000 },
      { kind: 'DEDUCTION', label: 'TDS', amount: 2000 },
    ] }]);
  });

  it('confirms only salaries someone else recorded', async () => {
    signIn(['PAYMENT_VIEW', 'PAYMENT_RECORD', 'PAYMENT_APPROVE']);
    api.decide.mockResolvedValue(ok({ decided: 1, payments: [] }, 'Salary confirmed. Payslips are being emailed.'));
    renderPage(<PaymentsPage />);

    const kabir = (await screen.findByText('Kabir Shah')).closest('tr')!;
    expect(within(kabir).queryByRole('button', { name: /Confirm/ })).not.toBeInTheDocument();
    expect(within(kabir).getByText('You recorded it: someone else confirms')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm all waiting (1)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, confirm' }));
    await waitFor(() => expect(api.decide).toHaveBeenCalledWith({ paymentIds: [31], decision: 'APPROVED' }));
    expect(await screen.findByText('Salary confirmed. Payslips are being emailed.')).toBeInTheDocument();
  });

  it('is read-only without recording or approving powers', async () => {
    signIn(['PAYMENT_VIEW']);
    renderPage(<PaymentsPage />);
    await screen.findByText('Asha Verma');
    expect(screen.queryByRole('button', { name: /Record/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm/ })).not.toBeInTheDocument();
  });
});

describe('My Payslips', () => {
  it('lists the employee\'s confirmed months without touching the payroll', async () => {
    signIn(['PAYSLIP_VIEW_OWN']);
    api.myPayslips.mockResolvedValue(ok([{ id: 9, payYear: 2026, payMonth: 9, currency: 'INR', totalEarnings: 35000, totalDeductions: 2000,
      netPay: 33000, transferDate: '2026-09-30', approvedAt: '2026-10-01T05:00:00Z' }]));
    renderPage(<MyPayslipsPage />);

    expect(await screen.findByText('September 2026')).toBeInTheDocument();
    expect(screen.getByText('₹33,000.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download payslip for September 2026' })).toBeInTheDocument();
    expect(api.year).not.toHaveBeenCalled();
    expect(api.month).not.toHaveBeenCalled();
  });

  it('asks for nothing without the permission', () => {
    signIn([]);
    renderPage(<MyPayslipsPage />);
    expect(api.myPayslips).not.toHaveBeenCalled();
  });
});

describe('payroll endpoints', () => {
  const procurement = createEndpointMatcher(PROCUREMENT_ENDPOINTS);
  it('need the matching permission', () => {
    expect(procurement('get', `/v1/admin/payroll/years/2026/months/10`)).toBe('PAYMENT_VIEW');
    expect(procurement('post', '/v1/admin/payroll/years/2026/months/10/payments')).toBe('PAYMENT_RECORD');
    expect(procurement('post', '/v1/admin/payroll/payments/decision')).toBe('PAYMENT_APPROVE');
    expect(procurement('get', '/v1/payroll/my-payslips/5/pdf?download=true')).toBe('PAYSLIP_VIEW_OWN');
  });
});
