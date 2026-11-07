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
import { supplierReturnApi } from '../order-management/api/supplierReturnApi';
import { paymentEntry } from '../order-management/test/paymentFixtures';
import { supplierReturn } from '../order-management/test/returnFixtures';
import { PROCUREMENT_QUEUES } from './services/approvalSummaryApi';
import { APPROVAL_PERMISSIONS, type Permission } from '../../config/access';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../order-management/api/supplierPaymentApi', () => ({
  supplierPaymentApi: {
    waiting: vi.fn(), toMake: vi.fn(), decide: vi.fn(), forOrder: vi.fn(), timeline: vi.fn(), repaymentsToCheck: vi.fn(), checkRepayment: vi.fn(),
    downloadProof: vi.fn(),
  },
}));
vi.mock('../order-management/api/supplierReturnApi', () => ({ supplierReturnApi: { waiting: vi.fn(), decide: vi.fn() } }));
const procurement = vi.mocked(axiosClient);
const payments = vi.mocked(supplierPaymentApi);
const returns = vi.mocked(supplierReturnApi);

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, timestamp: '', path: '', data });

const SUPER_ADMIN: Permission[] = ['PROCUREMENT_ORDER_VIEW', 'PROCUREMENT_ORDER_APPROVE', 'SUPPLIER_PAYMENT_APPROVE', 'SUPPLIER_RETURN_APPROVE'];
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

const signIn = (permissions: Permission[], username = 'super.admin') =>
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username, email: 'a@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const summaryCalls = () => procurement.get.mock.calls.filter(([url]) => url === '/v1/approvals/summary').length;

beforeEach(() => {
  vi.clearAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
  procurement.get.mockImplementation(async (url: string) => ({
    data: { success: true, message: 'OK', data: url === '/v1/approvals/summary' ? { SUPPLIER_RETURNS: 2, SUPPLIER_REPAYMENTS: 1 } : [] },
  }));
  returns.waiting.mockResolvedValue(ok([
    supplierReturn({ id: 3, requestedByUsername: 'sm.one' }),
    supplierReturn({ id: 4, requestedByUsername: 'super.admin', reason: 'Cracked' }),
  ]) as never);
  payments.timeline.mockResolvedValue(ok({ orderId: 1, orderNumber: 'ORD-1', events: [] }) as never);
  payments.waiting.mockResolvedValue(ok([]) as never);
  payments.repaymentsToCheck.mockResolvedValue(ok([
    paymentEntry({
      id: 71, kind: 'REFUND', milestone: null, amount: 236, chargeAmount: 50, returnId: 3, status: 'REPAYMENT_SENT', reference: 'UTR-77',
      paidOn: '2026-10-21', events: [{ type: 'REPAYMENT_SENT', at: '2026-10-21T10:00:00Z', actorRole: 'Supplier', actorName: null, reference: 'UTR-77',
        paidOn: '2026-10-21', note: null, proofDocumentId: 5, proofFileName: 'bank.pdf' }],
    }),
  ]) as never);
});

describe('Approvals hub: supplier returns and repayments', () => {
  it('mirrors the backend queues and opens the hub for the return approver', () => {
    expect(PROCUREMENT_QUEUES.SUPPLIER_RETURNS).toEqual(['SUPPLIER_RETURN_APPROVE', 'PROCUREMENT_ORDER_VIEW']);
    expect(PROCUREMENT_QUEUES.SUPPLIER_REPAYMENTS).toEqual(['SUPPLIER_PAYMENT_RECORD', 'PROCUREMENT_ORDER_VIEW']);
    expect(APPROVAL_PERMISSIONS).toContain('SUPPLIER_RETURN_APPROVE');
  });

  it('lists returns only once their tab is open, with the whole return, and approves someone else’s', async () => {
    const user = userEvent.setup();
    signIn(SUPER_ADMIN);
    returns.decide.mockResolvedValue(ok(supplierReturn({ status: 'AWAITING_SUPPLIER' })) as never);
    renderHub();

    const tab = await screen.findByRole('tab', { name: /Supplier returns/ });
    await waitFor(() => expect(tab).toHaveTextContent('2'));
    // The Super Admin does not check repayments
    expect(screen.queryByRole('tab', { name: /Supplier repayments/ })).not.toBeInTheDocument();
    expect(returns.waiting).not.toHaveBeenCalled();
    await user.click(tab);

    const queue = within(await screen.findByRole('region', { name: 'Supplier returns awaiting approval' }));
    const theirs = within(await queue.findByTestId('waiting-return-3'));
    expect(theirs.getByText('ORD-1 · Acme Traders')).toBeInTheDocument();
    expect(theirs.getByText(/2 PCS of Copper wire · ₹236.00/)).toBeInTheDocument();
    expect(theirs.getByText('Reason: No power')).toBeInTheDocument();
    expect(theirs.getByText('Pieces: SN-1, SN-2')).toBeInTheDocument();
    expect(theirs.getByTestId('return-shipping-3')).toHaveTextContent('TinQa ships the pieces');
    // The order's flow history opens on demand
    expect(theirs.getByRole('button', { name: 'Flow history' })).toBeInTheDocument();
    expect(payments.timeline).not.toHaveBeenCalled();

    // Never on what you raised yourself
    const own = within(queue.getByTestId('waiting-return-4'));
    expect(own.getByText(/You raised it/)).toBeInTheDocument();
    expect(own.queryByRole('button', { name: 'Approve return' })).not.toBeInTheDocument();

    const before = summaryCalls();
    await user.click(theirs.getByRole('button', { name: 'Approve return' }));
    await waitFor(() => expect(returns.decide).toHaveBeenCalledWith(3, 'APPROVED', undefined));
    // Only this list and the badges are read again
    await waitFor(() => expect(returns.waiting).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(summaryCalls()).toBe(before + 1));
    expect(payments.waiting).not.toHaveBeenCalled();
    expect(payments.repaymentsToCheck).not.toHaveBeenCalled();
  });

  it('needs a reason to reject a return', async () => {
    const user = userEvent.setup();
    signIn(SUPER_ADMIN);
    returns.decide.mockResolvedValue(ok(supplierReturn({ status: 'REJECTED' })) as never);
    renderHub();
    await user.click(await screen.findByRole('tab', { name: /Supplier returns/ }));
    const theirs = within(await screen.findByTestId('waiting-return-3'));
    await user.click(theirs.getByRole('button', { name: 'Reject' }));
    const reject = theirs.getByRole('button', { name: 'Reject' });
    expect(reject).toBeDisabled();
    await user.type(theirs.getByRole('textbox', { name: 'Reason to reject the return of ORD-1' }), 'Testing was wrong');
    await user.click(reject);
    await waitFor(() => expect(returns.decide).toHaveBeenCalledWith(3, 'REJECTED', 'Testing was wrong'));
  });

  it('lets a Finance Manager check repayments: received, or not received with a reason', async () => {
    const user = userEvent.setup();
    signIn(FINANCE_MANAGER, 'fm');
    payments.toMake.mockResolvedValue(ok([]) as never);
    payments.checkRepayment.mockResolvedValue(ok(paymentEntry({ id: 71, status: 'APPROVED' })) as never);
    renderHub();

    const tab = await screen.findByRole('tab', { name: /Supplier repayments/ });
    await waitFor(() => expect(tab).toHaveTextContent('1'));
    expect(screen.queryByRole('tab', { name: /Supplier returns/ })).not.toBeInTheDocument();
    expect(payments.repaymentsToCheck).not.toHaveBeenCalled();
    await user.click(tab);

    const entry = within(await screen.findByTestId('repayment-to-check-71'));
    expect(entry.getByText('₹286.00')).toBeInTheDocument();
    expect(entry.getByText(/Repayment for returned pieces · Bank to bank transfer · Ref UTR-77/)).toBeInTheDocument();
    expect(entry.getByText('Pieces ₹236.00 + return shipping ₹50.00')).toBeInTheDocument();
    expect(entry.getByRole('button', { name: 'Receipt: bank.pdf' })).toBeInTheDocument();

    await user.click(entry.getByRole('button', { name: 'Not received' }));
    const send = entry.getByRole('button', { name: 'Send: not received' });
    expect(send).toBeDisabled();
    await user.type(entry.getByRole('textbox', { name: 'Why it was not received' }), 'Not on the statement');
    await user.click(send);
    await waitFor(() => expect(payments.checkRepayment).toHaveBeenCalledWith(71, false, 'Not on the statement'));
    await waitFor(() => expect(payments.repaymentsToCheck).toHaveBeenCalledTimes(2));

    await user.click(within(await screen.findByTestId('repayment-to-check-71')).getByRole('button', { name: 'Received' }));
    await waitFor(() => expect(payments.checkRepayment).toHaveBeenCalledWith(71, true, undefined));
    expect(returns.waiting).not.toHaveBeenCalled();
  });

  it('keeps Approve disabled on a payment request that waits for an earlier part, and shows the server’s 409', async () => {
    const user = userEvent.setup();
    signIn(SUPER_ADMIN);
    payments.waiting.mockResolvedValue(ok([
      paymentEntry({ id: 21, status: 'PENDING_APPROVAL', recordedBy: 50, paidOn: null, reference: null }),
      paymentEntry({ id: 22, milestone: 'MIDTERM', status: 'PENDING_APPROVAL', recordedBy: 50, paidOn: null, reference: null, waitsFor: 'ADVANCE' }),
    ]) as never);
    payments.decide.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 409',
      response: { status: 409, data: { success: false, errorCode: 'SUPPLIER_PAYMENT_OUT_OF_ORDER', message: 'Approve the advance payment of order ORD-1 first.' } },
    });
    renderHub();
    await user.click(await screen.findByRole('tab', { name: /Supplier payments/ }));

    const midterm = within(await screen.findByTestId('waiting-payment-22'));
    expect(midterm.getByRole('button', { name: 'Approve payment' })).toBeDisabled();
    expect(midterm.getByText(/Approve the advance first/)).toBeInTheDocument();

    // The queue only knows what waits in it; the server still enforces the whole rule
    await user.click(within(screen.getByTestId('waiting-payment-21')).getByRole('button', { name: 'Approve payment' }));
    expect(await screen.findByText('Approve the advance payment of order ORD-1 first.')).toBeInTheDocument();
  });
});
