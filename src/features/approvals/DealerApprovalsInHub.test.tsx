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
import { dealerLoginApi } from '../dealer-management/api/dealerLoginApi';
import { orderApi } from '../order-management/api/orderApi';
import type { DealerLogin } from '../dealer-management/types/dealerLogin.types';
import type { OrderChangeRequest } from '../order-management/types/order.types';
import type { Permission } from '../../config/access';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../dealer-management/api/dealerLoginApi', () => ({ dealerLoginApi: { listLogins: vi.fn(), decide: vi.fn() } }));
vi.mock('../order-management/api/orderApi', () => ({
  orderApi: { listChangeRequests: vi.fn(), decideChangeRequest: vi.fn(), processAdminL2Approval: vi.fn() },
}));
const procurement = vi.mocked(axiosClient);
const logins = vi.mocked(dealerLoginApi);
const orders = vi.mocked(orderApi);

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, timestamp: '', path: '', data });

// A Level 2 Dealer Manager, as the backend reports it
const DEALER_MANAGER_L2: Permission[] = [
  'DEALER_VIEW', 'DEALER_CREATE', 'DEALER_UPDATE', 'DEALER_TOGGLE_STATUS', 'DEALER_CATEGORY_MANAGE', 'DEALER_DELETE',
  'DEALER_LOGIN_MANAGE', 'DEALER_LOGIN_APPROVE',
  'PROCUREMENT_ORDER_VIEW', 'PROCUREMENT_ORDER_CREATE', 'PROCUREMENT_ORDER_UPDATE', 'PROCUREMENT_ORDER_UPDATE_STATUS',
  'PROCUREMENT_ORDER_APPROVE', 'DEALER_QUOTATION_CHANGE_APPROVE',
];

const LOGIN = (overrides: Partial<DealerLogin> = {}): DealerLogin => ({
  id: 1,
  dealerId: 3,
  dealerName: 'Shree Metals',
  dealerActive: true,
  username: 'shree',
  email: 'sales@shree.test',
  status: 'APPROVAL_PENDING',
  passwordChangePending: true,
  createdBy: 4,
  createdByUsername: 'dm_l1',
  createdAt: '2026-10-19T10:00:00Z',
  decidedByUsername: null,
  decidedAt: null,
  rejectionReason: null,
  ...overrides,
});

const CHANGE: OrderChangeRequest = {
  id: 40,
  orderId: 12,
  orderNumber: 'ORD-12',
  orderStatus: 'QUOTATION',
  dealerId: 3,
  dealerName: 'Shree Metals',
  changes: { unitPrice: 90 },
  previous: { unitPrice: 100 },
  proposedTotalPrice: 950,
  currentTotalPrice: 1050,
  note: 'Bulk discount',
  status: 'PENDING',
  requestedByUsername: 'shree',
  requestedAt: '2026-10-19T11:00:00Z',
  decidedByUsername: null,
  decidedAt: null,
  decisionReason: null,
};

const renderHub = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer, companyProfile: companyProfileReducer } })}>
      <MemoryRouter>
        <GlobalAlertContainer />
        <ApprovalsHub />
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
  procurement.get.mockResolvedValue({ data: { success: true, message: 'OK', data: [] } });
  logins.listLogins.mockResolvedValue(ok([LOGIN(), LOGIN({ id: 2, dealerId: 8, dealerName: 'Own Dealer', createdBy: 9 })]));
  orders.listChangeRequests.mockResolvedValue(ok([CHANGE]));
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username: 'dm_l2', email: 'dm@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions: DEALER_MANAGER_L2 },
  });
});

describe('Approvals hub: dealers', () => {
  it('shows what dealers are waiting on, and applies an approved quotation change', async () => {
    const user = userEvent.setup();
    orders.decideChangeRequest.mockResolvedValue(ok({ ...CHANGE, status: 'APPROVED' }));
    renderHub();

    const tab = await screen.findByRole('tab', { name: /Dealers/ });
    await waitFor(() => expect(tab).toHaveTextContent('3'));
    await user.click(tab);

    const changes = await screen.findByRole('region', { name: 'Quotation changes from dealers' });
    expect(within(changes).getByText('Bulk discount')).toBeInTheDocument();
    expect(within(changes).getByTestId('change-unitPrice')).toHaveTextContent('₹90.00');
    await user.click(within(changes).getByRole('button', { name: /Approve & apply/ }));
    await waitFor(() => expect(orders.decideChangeRequest).toHaveBeenCalledWith(40, 'APPROVED'));
  });

  it('needs a reason to reject, and never offers a decision on a login you created', async () => {
    const user = userEvent.setup();
    logins.decide.mockResolvedValue(ok(LOGIN({ status: 'REJECTED' })));
    renderHub();
    await user.click(await screen.findByRole('tab', { name: /Dealers/ }));

    const section = await screen.findByRole('region', { name: 'Dealer logins waiting for approval' });
    const own = within(section).getByText('Own Dealer').closest('article')!;
    expect(within(own).getByText(/You created this login/)).toBeInTheDocument();
    expect(within(own).queryByRole('button', { name: /Approve login/ })).not.toBeInTheDocument();

    const other = within(section).getByText('Shree Metals').closest('article')!;
    await user.click(within(other).getByRole('button', { name: /Reject/ }));
    const confirm = within(other).getByRole('button', { name: 'Reject' });
    expect(confirm).toBeDisabled();
    await user.type(within(other).getByLabelText('Reason for rejecting'), 'GSTIN mismatch');
    await user.click(confirm);
    await waitFor(() => expect(logins.decide).toHaveBeenCalledWith(3, 'REJECTED', 'GSTIN mismatch'));
  });
});
