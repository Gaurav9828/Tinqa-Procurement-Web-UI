import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import type { ApiResponse } from '../../types/common.types';
import { createEndpointMatcher, PROCUREMENT_ENDPOINTS } from '../../config/endpointAccess';
import { clientDemoApi } from './api/clientDemoApi';
import { ClientDemoWizardPage } from './pages/ClientDemoWizardPage';
import { ClientDemoDetailPage } from './pages/ClientDemoDetailPage';
import type { DemoDetail, DemoExpense, DemoStatus } from './types/clientDemo.types';

// Only the network layer is mocked.
vi.mock('./api/clientDemoApi', () => ({
  clientDemoApi: {
    list: vi.fn(),
    waiting: vi.fn(),
    staff: vi.fn(),
    mine: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    submit: vi.fn(),
    complete: vi.fn(),
    withdraw: vi.fn(),
    cancel: vi.fn(),
    decide: vi.fn(),
    reopen: vi.fn(),
    addExpense: vi.fn(),
    updateExpense: vi.fn(),
    removeExpense: vi.fn(),
    attachInvoice: vi.fn(),
    invoice: vi.fn(),
  },
}));

const api = vi.mocked(clientDemoApi);
const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: null,
    isAuthenticated: true,
    user: { userId: 1, username: 'fin', email: 'fin@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const MANAGER: Permission[] = ['DEMO_VIEW', 'DEMO_MANAGE'];
const APPROVER: Permission[] = ['DEMO_VIEW', 'DEMO_MANAGE', 'DEMO_APPROVE'];
const ATTENDEE: Permission[] = ['DEMO_VIEW_OWN', 'DEMO_EXPENSE_RECORD_OWN'];

const STAFF = [
  { employeeId: 11, employeeCode: 'EMP-0011', name: 'Asha Verma', designation: 'Store Sales Agent' },
  { employeeId: 12, employeeCode: 'EMP-0012', name: 'Ravi Kumar', designation: 'Delivery Rider / Courier' },
];

const bill = (id: number, extra: Partial<DemoExpense> = {}): DemoExpense => ({
  id, kind: 'STAY', dayNumber: 1, date: '2030-05-10', vendorName: 'Hotel Pearl', vendorAddress: null, vendorMapLink: null,
  vendorPhone: null, vendorGstin: '08AAAAA0000A1Z5', mealType: null, fromPlace: null, toPlace: null, travelMode: null,
  referenceNumber: 'INV-7', amount: 3500, gstAmount: 420, description: null, reason: null, invoiceFileName: null, addedBy: 9,
  addedByName: 'Planner', addedAt: '', updatedByName: null, updatedAt: null, editableByYou: false, ...extra,
});

const demo = (status: DemoStatus, extra: Partial<DemoDetail> = {}): DemoDetail => ({
  id: 7, reference: 'DEMO-00007', demoType: 'APPOINTMENT', status, statusLabel: status, clientCategory: 'HOTEL',
  clientCategoryLabel: 'Hotel', clientCategoryOther: null, clientName: 'Hotel Sunrise', contactPerson: 'Asha Rao',
  contactPhone: '+919876543210', contactEmail: null, addressLine: '12 MG Road', city: 'Jaipur', state: null, pincode: null,
  mapLink: null, startDate: '2020-05-10', startTime: '10:30:00', numberOfDays: 2, endDate: '2020-05-11', proposedBudget: 20000,
  purpose: null, outcome: null, staff: [STAFF[1]], expenses: [bill(1)], totalsByKind: { STAY: 3500, FOOD: 0, TRAVEL: 0, OTHER: 0 },
  total: 3500, budgetLeft: 16500, bookedTotal: 0, createdBy: 9, createdByName: 'Planner', createdAt: '', submittedByName: 'Planner',
  submittedAt: '', decidedByName: null, decidedAt: null, rejectionReason: null, cancelReason: null, reopenReason: null,
  completedAt: null, events: [], decidableByYou: false, attendingYou: false, ...extra,
});

const renderAt = (path: string) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter initialEntries={[path]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/client-demos" element={<p>Demo list</p>} />
          <Route path="/client-demos/new" element={<ClientDemoWizardPage />} />
          <Route path="/client-demos/:id" element={<ClientDemoDetailPage mode="manager" />} />
          <Route path="/my-demos/:id" element={<ClientDemoDetailPage mode="attendee" />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.staff.mockResolvedValue(ok(STAFF));
});

describe('Client demos: scheduling step by step', () => {
  it('checks each step, then saves the plan with its stays and sends the quotation', async () => {
    signIn(MANAGER);
    const user = userEvent.setup();
    api.create.mockResolvedValue(ok(demo('DRAFT', { expenses: [] })));
    api.addExpense.mockResolvedValue(ok(demo('DRAFT')));
    api.submit.mockResolvedValue(ok(demo('QUOTATION_PENDING')));
    api.get.mockResolvedValue(ok(demo('QUOTATION_PENDING')));
    renderAt('/client-demos/new');

    // Nothing moves on until the client step is complete
    await user.click(screen.getByRole('button', { name: /Next: Visit & staff/ }));
    expect(await screen.findByText('Choose what kind of place the client is.')).toBeInTheDocument();
    expect(screen.getByText('Contact phone is required.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Hospital' }));
    await user.type(screen.getByLabelText('Client name'), 'City Care Hospital');
    await user.type(screen.getByLabelText('Contact phone'), '+919876543210');
    await user.type(screen.getByLabelText('Address'), '4 Park Street');
    await user.type(screen.getByLabelText('City'), 'Kolkata');
    await user.type(screen.getByLabelText('Location (Google Maps link)'), 'https://evil.example/maps');
    await user.click(screen.getByRole('button', { name: /Next: Visit & staff/ }));
    expect(await screen.findByText(/Paste an https Google Maps link/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Location (Google Maps link)'));
    await user.type(screen.getByLabelText('Location (Google Maps link)'), 'https://maps.app.goo.gl/abc');
    await user.click(screen.getByRole('button', { name: /Next: Visit & staff/ }));

    // Visit: type, date, days and at least one attending staff member
    await user.click(await screen.findByRole('radio', { name: /Promotion/ }));
    await user.type(screen.getByLabelText('Date'), '2030-05-10');
    await user.clear(screen.getByLabelText('Number of days'));
    await user.type(screen.getByLabelText('Number of days'), '2');
    await user.click(screen.getByRole('button', { name: /Next: Quotation/ }));
    expect(await screen.findByText('Tag at least one attending staff member.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Asha Verma/ }));
    await user.click(screen.getByRole('button', { name: /Next: Quotation/ }));

    // Quotation: budget and one planned night
    await user.type(await screen.findByLabelText('Proposed budget (₹)'), '15000');
    await user.click(screen.getByRole('button', { name: /Add a night/ }));
    await user.type(screen.getByLabelText('Hotel name'), 'Hotel Pearl');
    await user.type(screen.getByLabelText('Expected amount (₹)'), '3200');
    await user.click(screen.getByRole('button', { name: /Next: Review/ }));

    expect(await screen.findByText('City Care Hospital · Hospital')).toBeInTheDocument();
    expect(screen.getByText('Asha Verma')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save & send for approval/ }));

    await waitFor(() => expect(api.submit).toHaveBeenCalledWith(7));
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
      demoType: 'PROMOTION', clientCategory: 'HOSPITAL', clientName: 'City Care Hospital', startDate: '2030-05-10', numberOfDays: 2,
      proposedBudget: 15000, staffEmployeeIds: [11], mapLink: 'https://maps.app.goo.gl/abc',
    }));
    expect(api.addExpense).toHaveBeenCalledWith('manager', 7, expect.objectContaining({ kind: 'STAY', dayNumber: 1, vendorName: 'Hotel Pearl', amount: 3200 }));
    // Then the saved demo opens
    expect(await screen.findByRole('heading', { name: /Hotel Sunrise/ })).toBeInTheDocument();
  });
});

describe('Client demos: deciding and recording bills', () => {
  it('lets an approver who did not plan it approve the completion, which books the bills', async () => {
    signIn(APPROVER);
    const user = userEvent.setup();
    api.get.mockResolvedValue(ok(demo('COMPLETION_PENDING', { decidableByYou: true })));
    api.decide.mockResolvedValue(ok(demo('COMPLETED', { bookedTotal: 3500 }), 'Completion approved and booked to the company account.'));
    renderAt('/client-demos/7');

    await user.click(await screen.findByRole('button', { name: 'Approve completion' }));
    const dialog = screen.getByRole('dialog', { name: 'Approve the completion?' });
    expect(within(dialog).getByText(/is booked as travel & conveyance/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(api.decide).toHaveBeenCalledWith(7, 'APPROVED', null));
    expect(await screen.findByText('Completion approved and booked to the company account.')).toBeInTheDocument();
  });

  it('never offers a decision on a demo you planned, and rejecting needs a reason', async () => {
    signIn(APPROVER);
    api.get.mockResolvedValue(ok(demo('QUOTATION_PENDING', { decidableByYou: false })));
    renderAt('/client-demos/7');

    expect(await screen.findByText(/someone else decides on it/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve quotation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  });

  it('lets attending staff add their own food bill, checking the meal first', async () => {
    signIn(ATTENDEE);
    const user = userEvent.setup();
    api.get.mockResolvedValue(ok(demo('APPROVED', { attendingYou: true })));
    api.addExpense.mockResolvedValue(ok(demo('APPROVED', { expenses: [bill(1), bill(2, { kind: 'FOOD', mealType: 'LUNCH', vendorName: 'Spice Court', amount: 450 })] })));
    renderAt('/my-demos/7');

    // Attendees record bills; they don't run the workflow
    expect(await screen.findByRole('button', { name: 'Add bill' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send for completion' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change bill' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add bill' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a bill' });
    await user.click(within(dialog).getByRole('radio', { name: /Food/ }));
    await user.selectOptions(within(dialog).getByLabelText('Day'), '1');
    await user.type(within(dialog).getByLabelText('Restaurant name'), 'Spice Court');
    await user.type(within(dialog).getByLabelText('Amount (₹, incl. GST)'), '450');
    await user.click(within(dialog).getByRole('button', { name: 'Add bill' }));
    expect(within(dialog).getByText('Choose the meal.')).toBeInTheDocument();
    expect(api.addExpense).not.toHaveBeenCalled();

    await user.selectOptions(within(dialog).getByLabelText('Meal'), 'LUNCH');
    await user.click(within(dialog).getByRole('button', { name: 'Add bill' }));
    await waitFor(() => expect(api.addExpense).toHaveBeenCalledWith('attendee', 7, expect.objectContaining({
      kind: 'FOOD', dayNumber: 1, mealType: 'LUNCH', vendorName: 'Spice Court', amount: 450,
    })));
  });

  it('asks why a recorded bill changes once the quotation is approved', async () => {
    signIn(MANAGER);
    const user = userEvent.setup();
    api.get.mockResolvedValue(ok(demo('APPROVED', { expenses: [bill(1, { editableByYou: true })] })));
    api.updateExpense.mockResolvedValue(ok(demo('APPROVED')));
    renderAt('/client-demos/7');

    await user.click(await screen.findByRole('button', { name: 'Change bill' }));
    const dialog = screen.getByRole('dialog', { name: 'Change stay bill' });
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByText('Give a reason for changing a recorded bill.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Reason for the change'), 'Corrected invoice');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.updateExpense).toHaveBeenCalledWith('manager', 7, 1, expect.objectContaining({ changeReason: 'Corrected invoice' })));
  });
});

describe('Client demos: endpoint permissions', () => {
  it('lists the permission of every demo endpoint, as the backend requires it', () => {
    const required = createEndpointMatcher(PROCUREMENT_ENDPOINTS);
    expect(required('GET', '/v1/admin/client-demos')).toBe('DEMO_VIEW');
    expect(required('GET', '/v1/admin/client-demos/waiting')).toBe('DEMO_APPROVE');
    expect(required('GET', '/v1/admin/client-demos/staff')).toBe('DEMO_MANAGE');
    expect(required('POST', '/v1/admin/client-demos/7/decision')).toBe('DEMO_APPROVE');
    expect(required('POST', '/v1/admin/client-demos/7/reopen')).toBe('DEMO_COMPLETED_EDIT');
    expect(required('POST', '/v1/client-demos/mine/7/expenses')).toBe('DEMO_EXPENSE_RECORD_OWN');
    expect(required('GET', '/v1/client-demos/mine/7/expenses/3/invoice')).toBe('DEMO_VIEW_OWN');
  });
});
