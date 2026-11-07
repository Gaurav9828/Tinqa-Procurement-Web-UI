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
import { paymentEntry } from '../order-management/test/paymentFixtures';
import type { Permission } from '../../config/access';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../order-management/api/supplierPaymentApi', () => ({ supplierPaymentApi: { waiting: vi.fn(), decide: vi.fn() } }));
const procurement = vi.mocked(axiosClient);
const payments = vi.mocked(supplierPaymentApi);

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, timestamp: '', path: '', data });

// A Level 2 Supplier Manager: approves orders (the Requests tab, opened first) and confirms supplier payments
const SUPPLIER_MANAGER_L2: Permission[] = ['PROCUREMENT_ORDER_VIEW', 'PROCUREMENT_ORDER_APPROVE', 'SUPPLIER_PAYMENT_RECORD', 'SUPPLIER_PAYMENT_APPROVE'];

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
    data: { success: true, message: 'OK', data: url === '/v1/approvals/summary' ? { SUPPLIER_PAYMENTS: 2 } : [] },
  }));
  payments.waiting.mockResolvedValue(
    ok([
      paymentEntry({ id: 21, status: 'PENDING_APPROVAL', amount: 354, recordedBy: 50, recordedByUsername: 'dm_l1', note: 'Advance as agreed' }),
      paymentEntry({ id: 22, status: 'PENDING_APPROVAL', kind: 'REFUND', milestone: null, amount: 200, recordedBy: 9, recordedByUsername: 'fm_l2' }),
    ])
  );
  signIn(SUPPLIER_MANAGER_L2);
});

describe('Approvals hub: supplier payments', () => {
  it('lists waiting payments only once its tab is open, and confirms someone else’s', async () => {
    const user = userEvent.setup();
    payments.decide.mockResolvedValue(ok(paymentEntry({ id: 21 })));
    renderHub();

    const tab = await screen.findByRole('tab', { name: /Supplier payments/ });
    await waitFor(() => expect(tab).toHaveTextContent('2'));
    expect(payments.waiting).not.toHaveBeenCalled();
    await user.click(tab);

    const queue = await screen.findByRole('region', { name: 'Supplier payments awaiting confirmation' });
    const theirs = within(await within(queue).findByTestId('waiting-payment-21'));
    expect(theirs.getByText(/Advance payment to the supplier/)).toBeInTheDocument();
    expect(theirs.getByText('Advance as agreed')).toBeInTheDocument();
    await user.click(theirs.getByRole('button', { name: 'Confirm' }));
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

    const theirs = within(screen.getByTestId('waiting-payment-21'));
    await user.click(theirs.getByRole('button', { name: 'Reject' }));
    const reject = theirs.getByRole('button', { name: 'Reject' });
    expect(reject).toBeDisabled();
    await user.type(theirs.getByLabelText('Reason to reject ORD-1'), 'Wrong UTR');
    await user.click(reject);
    await waitFor(() => expect(payments.decide).toHaveBeenCalledWith(21, 'REJECTED', 'Wrong UTR'));
  });

  it('is not offered to someone who only records payments', async () => {
    signIn(['PROCUREMENT_ORDER_VIEW', 'SUPPLIER_PAYMENT_RECORD', 'PROCUREMENT_ORDER_APPROVE']);
    renderHub();
    await screen.findByRole('tab', { name: /Requests/ });
    expect(screen.queryByRole('tab', { name: /Supplier payments/ })).not.toBeInTheDocument();
    expect(payments.waiting).not.toHaveBeenCalled();
  });
});
