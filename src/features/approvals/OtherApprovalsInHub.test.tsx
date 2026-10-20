import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { ApprovalsHub } from './ApprovalsHub';
import { useAuthStore } from '../../store/useAuthStore';
import { orderTrackingApi } from '../order-tracking/api/orderTrackingApi';
import { companyProfileApi } from '../company-profile/api/companyProfileApi';
import type { AdminOrderSummary } from '../order-tracking/types/orderTracking.types';
import type { CompanyProfileVersion } from '../company-profile/types/companyProfile.types';
import type { Permission } from '../../config/access';
import { APPROVAL_PERMISSIONS } from '../../config/access';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../order-tracking/api/orderTrackingApi', () => ({ orderTrackingApi: { listOrders: vi.fn() } }));
vi.mock('../company-profile/api/companyProfileApi', () => ({ companyProfileApi: { getOverview: vi.fn() } }));
const tracking = vi.mocked(orderTrackingApi);
const company = vi.mocked(companyProfileApi);

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, timestamp: '', path: '', data });

const PRE_ORDER: AdminOrderSummary = {
  id: 7,
  orderNumber: 'TQ-1007',
  orderStatus: 'PRE_ORDER_PENDING',
  paymentMethod: 'UPI',
  paymentStatus: 'PAID',
  totalAmount: 2499,
  itemCount: 1,
  createdAt: '2026-10-18T09:30:00',
  updatedAt: null,
  updatedBy: null,
  customer: { id: 3, name: 'Asha Rao', email: 'asha@example.test' },
  items: [{ productId: 5, title: 'Steel Rack', price: 2499, quantity: 1, totalPrice: 2499, preOrder: true }],
  currentTracking: null,
};

const PENDING_VERSION = (overrides: Partial<CompanyProfileVersion> = {}) =>
  ({ id: 12, versionNo: 4, status: 'PENDING_APPROVAL', brandName: 'TinQa', createdBy: 'maker1', submittedBy: 'maker1', submittedAt: '2026-10-19T10:00:00', ...overrides }) as CompanyProfileVersion;

const signIn = (username: string, permissions: Permission[]) =>
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username, email: `${username}@tinqa.com`, role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderHub = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
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
  tracking.listOrders.mockResolvedValue(ok({ content: [PRE_ORDER], totalElements: 1, totalPages: 1, number: 0, size: 100 }) as never);
  company.getOverview.mockResolvedValue(ok({ live: null, pending: PENDING_VERSION(), myDrafts: [] }));
});

describe('Approvals hub: pre-orders and company profile', () => {
  it('opens the hub for pre-order approvers', () => {
    expect(APPROVAL_PERMISSIONS).toContain('CUSTOMER_ORDER_PRE_ORDER_APPROVE');
  });

  it('lists waiting pre-orders, oldest first, with a link to review each one', async () => {
    const user = userEvent.setup();
    signIn('store_l2', ['CUSTOMER_ORDER_VIEW', 'CUSTOMER_ORDER_PRE_ORDER_APPROVE']);
    renderHub();

    const tab = await screen.findByRole('tab', { name: /Pre-orders/ });
    await waitFor(() => expect(tab).toHaveTextContent('1'));
    expect(screen.queryByRole('tab', { name: /Company profile/ })).not.toBeInTheDocument();
    expect(tracking.listOrders).toHaveBeenCalledWith(expect.objectContaining({ status: 'PRE_ORDER_PENDING', sort: 'createdAt,asc' }));
    expect(company.getOverview).not.toHaveBeenCalled();

    await user.click(tab);
    const panel = await screen.findByRole('region', { name: 'Pre-orders awaiting approval' });
    expect(within(panel).getByText('Asha Rao')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Review pre-order TQ-1007' })).toHaveAttribute('href', '/order-tracking/TQ-1007');
  });

  it('shows the pending company profile change, and says when it is your own', async () => {
    const user = userEvent.setup();
    signIn('maker1', ['COMPANY_PROFILE_VIEW', 'COMPANY_PROFILE_APPROVE']);
    renderHub();

    const tab = await screen.findByRole('tab', { name: /Company profile/ });
    await waitFor(() => expect(tab).toHaveTextContent('1'));
    expect(tracking.listOrders).not.toHaveBeenCalled();

    await user.click(tab);
    const panel = await screen.findByRole('region', { name: 'Company profile change awaiting approval' });
    expect(within(panel).getByText(/You made this change/)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Review company profile version 4' })).toHaveAttribute(
      'href',
      '/settings/company-profile/versions/12'
    );
  });
});
