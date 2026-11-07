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
import { supplierLoginApi } from '../supplier-management/api/supplierLoginApi';
import { orderApi } from '../order-management/api/orderApi';
import type { SupplierLogin } from '../supplier-management/types/supplierLogin.types';
import type { OrderChangeRequest } from '../order-management/types/order.types';
import type { Permission } from '../../config/access';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../supplier-management/api/supplierLoginApi', () => ({ supplierLoginApi: { listLogins: vi.fn(), decide: vi.fn() } }));
vi.mock('../order-management/api/orderApi', () => ({
  orderApi: { listChangeRequests: vi.fn(), decideChangeRequest: vi.fn(), processAdminL2Approval: vi.fn() },
}));
const procurement = vi.mocked(axiosClient);
const logins = vi.mocked(supplierLoginApi);
const orders = vi.mocked(orderApi);

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, timestamp: '', path: '', data });

// A Level 2 Supplier Manager, as the backend reports it
const SUPPLIER_MANAGER_L2: Permission[] = [
  'SUPPLIER_VIEW', 'SUPPLIER_CREATE', 'SUPPLIER_UPDATE', 'SUPPLIER_TOGGLE_STATUS', 'SUPPLIER_CATEGORY_MANAGE', 'SUPPLIER_DELETE',
  'SUPPLIER_LOGIN_MANAGE', 'SUPPLIER_LOGIN_APPROVE',
  'PROCUREMENT_ORDER_VIEW', 'PROCUREMENT_ORDER_CREATE', 'PROCUREMENT_ORDER_UPDATE', 'PROCUREMENT_ORDER_UPDATE_STATUS',
  'PROCUREMENT_ORDER_APPROVE', 'SUPPLIER_QUOTATION_CHANGE_APPROVE',
];

const LOGIN = (overrides: Partial<SupplierLogin> = {}): SupplierLogin => ({
  id: 1,
  supplierId: 3,
  supplierName: 'Shree Metals',
  supplierActive: true,
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
  supplierId: 3,
  supplierName: 'Shree Metals',
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
  procurement.get.mockImplementation(async (url: string) => ({
    data: { success: true, message: 'OK', data: url === '/v1/approvals/summary' ? { SUPPLIER_LOGINS: 2, QUOTATION_CHANGES: 1 } : [] },
  }));
  logins.listLogins.mockResolvedValue(ok([LOGIN(), LOGIN({ id: 2, supplierId: 8, supplierName: 'Own Supplier', createdBy: 9 })]));
  orders.listChangeRequests.mockResolvedValue(ok([CHANGE]));
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username: 'dm_l2', email: 'dm@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions: SUPPLIER_MANAGER_L2 },
  });
});

describe('Approvals hub: suppliers', () => {
  it('shows what suppliers are waiting on, and applies an approved quotation change', async () => {
    const user = userEvent.setup();
    orders.decideChangeRequest.mockResolvedValue(ok({ ...CHANGE, status: 'APPROVED' }));
    renderHub();

    const tab = await screen.findByRole('tab', { name: /Suppliers/ });
    await waitFor(() => expect(tab).toHaveTextContent('3'));
    expect(logins.listLogins).not.toHaveBeenCalled();
    await user.click(tab);

    const changes = await screen.findByRole('region', { name: 'Quotation changes from suppliers' });
    expect(within(changes).getByText('Bulk discount')).toBeInTheDocument();
    expect(within(changes).getByTestId('change-unitPrice')).toHaveTextContent('₹90.00');
    await user.click(within(changes).getByRole('button', { name: /Approve & apply/ }));
    await waitFor(() => expect(orders.decideChangeRequest).toHaveBeenCalledWith(40, 'APPROVED'));
  });

  it('needs a reason to reject, and never offers a decision on a login you created', async () => {
    const user = userEvent.setup();
    logins.decide.mockResolvedValue(ok(LOGIN({ status: 'REJECTED' })));
    renderHub();
    await user.click(await screen.findByRole('tab', { name: /Suppliers/ }));

    const section = await screen.findByRole('region', { name: 'Supplier logins waiting for approval' });
    const own = within(section).getByText('Own Supplier').closest('article')!;
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
