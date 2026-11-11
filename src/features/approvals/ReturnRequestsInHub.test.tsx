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
import { ecommerceAxiosClient } from '../../api/ecommerceAxiosClient';
import { orderTrackingApi } from '../order-tracking/api/orderTrackingApi';
import { ECOMMERCE_QUEUES } from './services/approvalSummaryApi';
import { APPROVAL_PERMISSIONS, type Permission } from '../../config/access';
import { DECENCY_ERROR } from '../../utils/decency';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import type { ReturnRequestRow } from '../order-tracking/types/orderTracking.types';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../order-tracking/api/orderTrackingApi', () => ({
  orderTrackingApi: { listReturnRequests: vi.fn(), approveReturn: vi.fn(), rejectReturn: vi.fn() },
}));
const ecommerce = vi.mocked(ecommerceAxiosClient);
const api = vi.mocked(orderTrackingApi);

const ok = <T,>(data: T, message = 'OK') => ({ success: true, message, errorCode: null, timestamp: '', path: '', data });

const REQUEST: ReturnRequestRow = {
  orderNumber: 'ORD-RET1',
  customerName: 'Asha Verma',
  customerEmail: 'asha@example.com',
  orderAmount: 500,
  shippingFee: 500,
  totalAmount: 1000,
  chargeAmount: 100,
  chargeReason: 'Pickup',
  // The customer's own words, picked by Customer Support from the ticket
  reason: 'Rattles when shaken, please take it back',
  ticketReference: 'TQ-Q-000031',
  staffNote: 'Box unopened',
  requestedBy: 'support1',
  requestedAt: '2026-11-09T10:00:00',
};

const STORE_MANAGER_L1: Permission[] = ['CUSTOMER_ORDER_VIEW', 'REFUND_REQUEST', 'RETURN_ENABLE'];

const renderHub = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer, companyProfile: companyProfileReducer } })}>
      <MemoryRouter>
        <GlobalAlertContainer />
        <ApprovalsHub />
      </MemoryRouter>
    </Provider>
  );

const signIn = (permissions: Permission[], username = 'manager1') =>
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username, email: `${username}@tinqa.com`, role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
  });

const axiosError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message ?? 'Request failed'), String(status), response.config, {}, response);
};

const summaryCalls = () => ecommerce.get.mock.calls.filter(([url]) => url === '/admin/approvals/summary').length;

beforeEach(() => {
  vi.clearAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
  ecommerce.get.mockImplementation(async (url: string) => ({
    data: { success: true, message: 'OK', data: url === '/admin/approvals/summary' ? { RETURN_REQUESTS: 1 } : [] },
  }));
  api.listReturnRequests.mockResolvedValue(ok({ content: [REQUEST], number: 0, size: 50, totalElements: 1, totalPages: 1, first: true, last: true, empty: false }) as never);
});

describe('Approvals Hub › Return requests', () => {
  it('mirrors the backend queue: decided and listed with RETURN_ENABLE, which opens the hub', () => {
    expect(ECOMMERCE_QUEUES.RETURN_REQUESTS).toEqual(['RETURN_ENABLE']);
    expect(APPROVAL_PERMISSIONS).toContain('RETURN_ENABLE');
  });

  it('shows a Level 1 Store Manager the waiting requests (their only tab, so it opens) and approves one with another charge', async () => {
    signIn(STORE_MANAGER_L1);
    api.approveReturn.mockResolvedValue(ok({} as never, 'Return enabled. The customer has 7 days to start it.') as never);
    const user = userEvent.setup();
    renderHub();
    const tab = await screen.findByRole('tab', { name: /Return requests/ });
    await waitFor(() => expect(tab).toHaveTextContent('1'));
    const row = await screen.findByTestId('return-request-ORD-RET1');
    expect(api.listReturnRequests).toHaveBeenCalledWith(0, 50);
    expect(row).toHaveTextContent('Asha Verma');
    expect(row).toHaveTextContent('support1');
    // The customer's own words, read-only and labelled, with the ticket they come from and the staff note
    const words = within(row).getByRole('group', { name: "Customer's reason" });
    expect(words).toHaveTextContent("Customer's reason — their own words");
    expect(within(words).getByTestId('customer-words')).toHaveTextContent('Rattles when shaken, please take it back');
    expect(within(words).getByRole('link', { name: 'TQ-Q-000031' })).toHaveAttribute('href', '/support-tickets/TQ-Q-000031');
    expect(within(words).getByTestId('return-staff-note')).toHaveTextContent('Box unopened');
    expect(within(row).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Order #ORD-RET1' })).toBeInTheDocument();

    const summaryBefore = summaryCalls();
    await user.click(within(row).getByRole('button', { name: 'Approve' }));
    const dialog = screen.getByRole('dialog', { name: 'Approve return' });
    expect(within(dialog).getByTestId('customer-words')).toHaveTextContent('Rattles when shaken, please take it back');
    const charge = within(dialog).getByLabelText('Return charge');
    await user.clear(charge);
    await user.type(charge, '600');
    // ₹600 is more than the ₹500 order amount (shipping not counted): the customer will have to pay it
    expect(within(dialog).getByTestId('charge-hint')).toHaveTextContent('must pay it before the return starts');
    await user.click(within(dialog).getByRole('button', { name: 'Approve and enable' }));

    await waitFor(() => expect(api.approveReturn).toHaveBeenCalledWith('ORD-RET1', { chargeAmount: 600, chargeReason: 'Pickup' }));
    // Only this list and the badges reload
    await waitFor(() => expect(api.listReturnRequests).toHaveBeenCalledTimes(2));
    expect(api.listReturnRequests).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(summaryCalls()).toBeGreaterThan(summaryBefore));
  });

  it('rejects a request with the reason the customer is emailed', async () => {
    signIn(STORE_MANAGER_L1);
    api.rejectReturn.mockResolvedValue(ok({} as never) as never);
    const user = userEvent.setup();
    renderHub();
    await user.click(await screen.findByRole('tab', { name: /Return requests/ }));
    const row = await screen.findByTestId('return-request-ORD-RET1');
    await user.click(within(row).getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject return request' });
    const reason = within(dialog).getByLabelText('Reason (emailed to the customer)');
    // The courtesy check blocks an offensive reason
    await user.type(reason, 'Stop wasting our time, idiot motherfucker');
    expect(within(dialog).getByText(DECENCY_ERROR)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    expect(api.rejectReturn).not.toHaveBeenCalled();
    await user.clear(reason);
    await user.type(reason, 'Used for a month');
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    await waitFor(() => expect(api.rejectReturn).toHaveBeenCalledWith('ORD-RET1', { reason: 'Used for a month' }));
  });

  it('shows the requester why they cannot decide their own request, instead of the buttons', async () => {
    signIn(STORE_MANAGER_L1, 'support1');
    renderHub();
    const row = await screen.findByTestId('return-request-ORD-RET1');
    expect(row).toHaveTextContent('You raised this request, so another Store Manager must decide it.');
    expect(within(row).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('explains a 409 RETURN_SELF_APPROVAL from the server', async () => {
    signIn(STORE_MANAGER_L1);
    api.approveReturn.mockRejectedValue(axiosError(409, { errorCode: 'RETURN_SELF_APPROVAL', message: 'x' }) as never);
    const user = userEvent.setup();
    renderHub();
    const row = await screen.findByTestId('return-request-ORD-RET1');
    await user.click(within(row).getByRole('button', { name: 'Approve' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Approve return' })).getByRole('button', { name: 'Approve and enable' }));
    expect(await screen.findByText('You raised this request, so another Store Manager must decide it.')).toBeInTheDocument();
  });

  it('has no Return requests tab, and loads no requests, for Customer Support', async () => {
    signIn(['CUSTOMER_ORDER_VIEW', 'REFUND_REQUEST', 'REFUND_APPROVE', 'REFUND_VIEW']);
    renderHub();
    await screen.findByRole('tab', { name: /Refunds/ });
    expect(screen.queryByRole('tab', { name: /Return requests/ })).not.toBeInTheDocument();
    expect(api.listReturnRequests).not.toHaveBeenCalled();
  });
});
