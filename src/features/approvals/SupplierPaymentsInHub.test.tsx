import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import companyProfileReducer from '../../store/companyProfileSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { ApprovalsHub } from './ApprovalsHub';
import { useAuthStore } from '../../store/useAuthStore';
import { axiosClient } from '../../api/axiosClient';
import { supplierPaymentApi } from '../order-management/api/supplierPaymentApi';
import { paymentEntry, paymentSummary, paymentsOf } from '../order-management/test/paymentFixtures';
import type { Permission } from '../../config/access';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../order-management/api/supplierPaymentApi', () => ({
  supplierPaymentApi: { waiting: vi.fn(), toMake: vi.fn(), decide: vi.fn(), forOrder: vi.fn(), timeline: vi.fn(), markPaid: vi.fn() },
}));
const procurement = vi.mocked(axiosClient);
const payments = vi.mocked(supplierPaymentApi);

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, timestamp: '', path: '', data });

// The Super Admin: approves orders (the Requests tab, opened first) and payment requests, and may also make payments
const SUPER_ADMIN: Permission[] = ['PROCUREMENT_ORDER_VIEW', 'PROCUREMENT_ORDER_APPROVE', 'SUPPLIER_PAYMENT_RECORD', 'SUPPLIER_PAYMENT_APPROVE'];
// A Finance Manager: requests and makes payments, never approves them
const FINANCE_MANAGER: Permission[] = ['PROCUREMENT_ORDER_VIEW', 'SUPPLIER_PAYMENT_RECORD'];

const renderHub = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer, companyProfile: companyProfileReducer } })}>
      <MemoryRouter>
        <GlobalAlertContainer />
        <ApprovalsHub />
      </MemoryRouter>
    </Provider>
  );

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username: 'fm_l2', email: 'fm@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

beforeEach(() => {
  vi.clearAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
  procurement.get.mockImplementation(async (url: string) => ({
    data: { success: true, message: 'OK', data: url === '/v1/approvals/summary' ? { SUPPLIER_PAYMENTS: 2, SUPPLIER_PAYMENTS_TO_MAKE: 1 } : [] },
  }));
  payments.toMake.mockResolvedValue(
    ok([paymentEntry({ id: 23, status: 'TO_PAY', reference: null, paidOn: null, recordedBy: 50, decidedByUsername: 'super.admin' })])
  );
  payments.forOrder.mockResolvedValue(paymentsOf(paymentSummary({ pendingPayments: 354 }), [
    paymentEntry({ id: 23, status: 'TO_PAY', reference: null, paidOn: null, recordedBy: 50 }),
  ]) as never);
  payments.timeline.mockResolvedValue(ok({ orderId: 1, orderNumber: 'ORD-1', events: [] }) as never);
  payments.waiting.mockResolvedValue(
    ok([
      paymentEntry({ id: 21, status: 'PENDING_APPROVAL', amount: 354, reference: null, paidOn: null, recordedBy: 50, recordedByUsername: 'fm_l1', note: 'Advance as agreed' }),
      paymentEntry({ id: 22, status: 'PENDING_APPROVAL', kind: 'REFUND', milestone: null, amount: 200, recordedBy: 9, recordedByUsername: 'fm_l2' }),
    ])
  );
  signIn(SUPER_ADMIN);
});

describe('Approvals hub: supplier payments', () => {
  it('lists payment requests only once its tab is open, shows the whole order, and approves someone else’s', async () => {
    const user = userEvent.setup();
    payments.decide.mockResolvedValue(ok(paymentEntry({ id: 21 })));
    renderHub();

    const tab = await screen.findByRole('tab', { name: /Supplier payments/ });
    // Requests to approve and payments to make, in one badge
    await waitFor(() => expect(tab).toHaveTextContent('3'));
    expect(payments.waiting).not.toHaveBeenCalled();
    expect(payments.toMake).not.toHaveBeenCalled();
    await user.click(tab);

    const queue = await screen.findByRole('region', { name: 'Supplier payments awaiting approval' });
    const theirs = within(await within(queue).findByTestId('waiting-payment-21'));
    expect(theirs.getByText(/Advance payment to the supplier/)).toBeInTheDocument();
    expect(theirs.getByText('Advance as agreed')).toBeInTheDocument();
    expect(theirs.getByText(/Nothing is paid yet/)).toBeInTheDocument();
    // The order behind it loads only when opened: its plan, payments and flow history
    expect(payments.forOrder).not.toHaveBeenCalled();
    await user.click(theirs.getByRole('button', { name: 'Review order ORD-1' }));
    expect(await theirs.findByRole('table', { name: 'Payment plan parts' })).toBeInTheDocument();
    expect(payments.forOrder).toHaveBeenCalledWith(1);
    // Read-only here: the decision is the hub's
    expect(theirs.queryByRole('button', { name: 'Record payment made' })).not.toBeInTheDocument();
    expect(theirs.getByRole('button', { name: 'Flow history' })).toBeInTheDocument();
    await user.click(theirs.getByRole('button', { name: 'Approve payment' }));
    await waitFor(() => expect(payments.decide).toHaveBeenCalledWith(21, 'APPROVED', undefined));
    // The list and the badges are read again
    await waitFor(() => expect(payments.waiting).toHaveBeenCalledTimes(2));
  });

  it('needs a reason to reject, and never offers a decision on what you recorded', async () => {
    const user = userEvent.setup();
    payments.decide.mockResolvedValue(ok(paymentEntry({ id: 21, status: 'REJECTED' })));
    renderHub();
    await user.click(await screen.findByRole('tab', { name: /Supplier payments/ }));

    const own = within(await screen.findByTestId('waiting-payment-22'));
    expect(own.getByText(/You recorded it/)).toBeInTheDocument();
    expect(own.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
    expect(own.queryByRole('button', { name: 'Approve payment' })).not.toBeInTheDocument();

    const theirs = within(screen.getByTestId('waiting-payment-21'));
    await user.click(theirs.getByRole('button', { name: 'Reject' }));
    const reject = theirs.getByRole('button', { name: 'Reject' });
    expect(reject).toBeDisabled();
    await user.type(theirs.getByLabelText('Reason to reject ORD-1'), 'Not before the delivery date');
    await user.click(reject);
    await waitFor(() => expect(payments.decide).toHaveBeenCalledWith(21, 'REJECTED', 'Not before the delivery date'));
  });

  it('shows a Finance Manager only the payments to make, and lets them pay one from the order', async () => {
    const user = userEvent.setup();
    signIn(FINANCE_MANAGER);
    renderHub();
    const tab = await screen.findByRole('tab', { name: /Supplier payments/ });
    await user.click(tab);

    const toMake = within(await screen.findByRole('region', { name: 'Payments to make' }));
    expect(screen.queryByRole('region', { name: 'Supplier payments awaiting approval' })).not.toBeInTheDocument();
    // Never asks for the Super Admin's queue
    expect(payments.waiting).not.toHaveBeenCalled();
    const entry = within(await toMake.findByTestId('payment-to-make-23'));
    expect(entry.getByText(/approved by super.admin/)).toBeInTheDocument();
    await user.click(entry.getByRole('button', { name: 'Review order ORD-1' }));
    expect(await entry.findByRole('button', { name: 'Record payment made' })).toBeInTheDocument();
  });

  it('is not offered to someone who neither approves nor makes payments', async () => {
    signIn(['PROCUREMENT_ORDER_VIEW', 'PROCUREMENT_ORDER_APPROVE']);
    renderHub();
    await screen.findByRole('tab', { name: /Requests/ });
    expect(screen.queryByRole('tab', { name: /Supplier payments/ })).not.toBeInTheDocument();
    expect(payments.waiting).not.toHaveBeenCalled();
    expect(payments.toMake).not.toHaveBeenCalled();
  });
});
