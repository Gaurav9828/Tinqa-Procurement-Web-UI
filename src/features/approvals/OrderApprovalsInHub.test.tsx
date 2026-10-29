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
import { orderApi } from '../order-management/api/orderApi';
import type { OrdersApprovalRequest } from './types/approval.types';
import type { OrderStatus } from '../../types/common.types';
import type { Permission } from '../../config/access';
import { APPROVAL_PERMISSIONS } from '../../config/access';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../order-management/api/orderApi', () => ({
  orderApi: { listChangeRequests: vi.fn(), decideChangeRequest: vi.fn(), processAdminL2Approval: vi.fn(), updateOrderStatus: vi.fn() },
}));
const procurement = vi.mocked(axiosClient);
const orders = vi.mocked(orderApi);

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, timestamp: '', path: '', data });

// Dealer Managers as the backend reports them: Level 1 progresses orders, Level 2 also approves them
const DEALER_MANAGER_L1: Permission[] = [
  'DEALER_VIEW', 'PROCUREMENT_ORDER_VIEW', 'PROCUREMENT_ORDER_CREATE', 'PROCUREMENT_ORDER_UPDATE', 'PROCUREMENT_ORDER_UPDATE_STATUS',
];
const DEALER_MANAGER_L2: Permission[] = [...DEALER_MANAGER_L1, 'PROCUREMENT_ORDER_APPROVE'];

const ORDER = (id: number, orderStatus: OrderStatus, overrides: Partial<OrdersApprovalRequest> = {}): OrdersApprovalRequest => ({
  id,
  orderNumber: `ORD-${id}`,
  dealerName: 'Shree Metals',
  itemName: 'Copper Wire',
  orderQuantity: 10,
  unitType: 'KG',
  totalPrice: 1000,
  shipmentPrice: 50,
  orderDate: '2026-10-28',
  createdAt: '2026-10-28T09:00:00',
  createdBy: '4',
  orderStatus,
  ...overrides,
});

const BY_STATUS: Partial<Record<OrderStatus, OrdersApprovalRequest[]>> = {
  QUOTATION: [
    ORDER(21, 'QUOTATION', { raisedByDealer: true, additionalInfo: { dealerNote: 'Need it before Diwali' } }),
    // A staff draft isn't sent to anyone, and a frozen quotation waits on its change in the Dealers tab
    ORDER(22, 'QUOTATION', { raisedByDealer: false }),
    ORDER(23, 'QUOTATION', { raisedByDealer: true, dealerChangePending: true }),
  ],
  PENDING: [ORDER(31, 'PENDING')],
  RETURN_REQUESTED: [ORDER(41, 'RETURN_REQUESTED', { dealerName: 'Om Traders' })],
};

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username: 'dm', email: 'dm@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderHub = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer, companyProfile: companyProfileReducer } })}>
      <MemoryRouter>
        <GlobalAlertContainer />
        <ApprovalsHub />
      </MemoryRouter>
    </Provider>
  );

const orderCalls = () => procurement.get.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/v1/orders'));

const rowFor = (text: string) => screen.getByText(text).closest('tr')!;

beforeEach(() => {
  vi.clearAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
  // GET /v1/orders?status=…&status=…: the orders in any of the statuses
  procurement.get.mockImplementation(async (url: string) => {
    if (url === '/v1/approvals/summary') return { data: { success: true, message: 'OK', data: { QUOTATIONS: 1, ORDERS: 1, RETURNS: 1 } } };
    const [path, query = ''] = url.split('?');
    const statuses = path === '/v1/orders' ? (new URLSearchParams(query).getAll('status') as OrderStatus[]) : [];
    return { data: { success: true, message: 'OK', data: structuredClone(statuses.flatMap((status) => BY_STATUS[status] ?? [])) } };
  });
  orders.listChangeRequests.mockResolvedValue(ok([]));
  orders.updateOrderStatus.mockResolvedValue(ok({}) as never);
});

describe('Approvals hub: quotations, orders and returns', () => {
  it('opens the hub for whoever reviews dealer quotations', () => {
    expect(APPROVAL_PERMISSIONS).toContain('PROCUREMENT_ORDER_UPDATE_STATUS');
  });

  it("lists dealers' quotations, orders to approve and returns side by side", async () => {
    signIn(DEALER_MANAGER_L2);
    renderHub();

    expect(await screen.findByText('Quotation: ORD-21')).toBeInTheDocument();
    expect(screen.getByText('Order: ORD-31')).toBeInTheDocument();
    expect(screen.getByText('Return: ORD-41')).toBeInTheDocument();
    expect(screen.queryByText('Quotation: ORD-22')).not.toBeInTheDocument();
    expect(screen.queryByText('Quotation: ORD-23')).not.toBeInTheDocument();
    expect(within(rowFor('Quotation: ORD-21')).getByText('Dealer Quotation')).toBeInTheDocument();
    expect(within(rowFor('Return: ORD-41')).getByText('Return Request')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Requests/ })).toHaveTextContent('3');
    // All three queues in one call
    expect(orderCalls()).toEqual(['/v1/orders?status=QUOTATION&status=PENDING&status=RETURN_REQUESTED']);
  });

  it("submits a dealer's quotation for Level 2 approval from its preview", async () => {
    const user = userEvent.setup();
    signIn(DEALER_MANAGER_L2);
    renderHub();

    await screen.findByText('Quotation: ORD-21');
    await user.click(within(rowFor('Quotation: ORD-21')).getByTitle('Preview Request Details'));
    const preview = within(screen.getByText('Quotation from a Dealer').closest<HTMLElement>('.fixed')!);
    expect(preview.getByText('Need it before Diwali')).toBeInTheDocument();
    await user.click(preview.getByRole('button', { name: 'Submit for approval' }));

    expect(screen.getByText('Submit quotation for approval')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yes, submit' }));
    await waitFor(() => expect(orders.updateOrderStatus).toHaveBeenCalledWith(21, { status: 'PENDING', reason: undefined }));
    expect(orders.processAdminL2Approval).not.toHaveBeenCalled();
  });

  it('needs a reason to reject a return, and sends it with the decision', async () => {
    const user = userEvent.setup();
    signIn(DEALER_MANAGER_L2);
    renderHub();

    await screen.findByText('Return: ORD-41');
    await user.click(within(rowFor('Return: ORD-41')).getByTitle('Reject return'));
    const proceed = screen.getByRole('button', { name: 'Proceed to Confirmation' });
    expect(proceed).toBeDisabled();
    await user.type(screen.getByRole('textbox'), 'Goods were fine on inspection');
    await user.click(proceed);
    await user.click(screen.getByRole('button', { name: 'Yes, reject return' }));
    await waitFor(() =>
      expect(orders.updateOrderStatus).toHaveBeenCalledWith(41, { status: 'RETURN_REJECTED', reason: 'Goods were fine on inspection' })
    );
  });

  it('cancels a dealer quotation with a reason', async () => {
    const user = userEvent.setup();
    signIn(DEALER_MANAGER_L2);
    renderHub();

    await screen.findByText('Quotation: ORD-21');
    await user.click(within(rowFor('Quotation: ORD-21')).getByTitle('Cancel quotation'));
    await user.type(screen.getByRole('textbox'), 'Price too high');
    await user.click(screen.getByRole('button', { name: 'Proceed to Confirmation' }));
    await user.click(screen.getByRole('button', { name: 'Yes, cancel quotation' }));
    await waitFor(() => expect(orders.updateOrderStatus).toHaveBeenCalledWith(21, { status: 'CANCELLED', reason: 'Price too high' }));
  });

  it('shows a Level 1 Dealer Manager only the quotations, and never loads what they cannot decide', async () => {
    signIn(DEALER_MANAGER_L1);
    renderHub();

    expect(await screen.findByText('Quotation: ORD-21')).toBeInTheDocument();
    expect(screen.queryByText('Order: ORD-31')).not.toBeInTheDocument();
    expect(screen.queryByText('Return: ORD-41')).not.toBeInTheDocument();
    expect(orderCalls()).toEqual(['/v1/orders?status=QUOTATION']);
  });
});
