import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { ApprovalsHub } from './ApprovalsHub';
import { useAuthStore } from '../../store/useAuthStore';
import { axiosClient } from '../../api/axiosClient';
import { ecommerceAxiosClient } from '../../api/ecommerceAxiosClient';

vi.mock('./services/approvalService', () => ({
  approvalService: {
    getPendingDocuments: vi.fn(async () => []),
    getProfileApprovals: vi.fn(async () => []),
    getStocksApprovals: vi.fn(async () => []),
    getOrdersApprovals: vi.fn(async () => []),
    getEmployeeApprovals: vi.fn(async () => []),
  },
}));
vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { patch: vi.fn() } }));
const procurement = vi.mocked(axiosClient);
const ecom = vi.mocked(ecommerceAxiosClient);
const ok = <T,>(data: T) => ({ data: { success: true, message: 'OK', data } });

const PENDING = {
  id: 20,
  ecommerceProductId: 2,
  productTitle: 'Touch Panel',
  requestType: 'RESUBMISSION',
  status: 'PENDING',
  snapshot: { title: 'Touch Panel', price: 2999, stockQuantity: 1, components: [], warranties: [], specificationCount: 0 },
  requestedBy: 4,
  requestedByUsername: 'admin_l1',
  requestedAt: '2026-10-12T10:00:00Z',
  decidedBy: null,
  decidedByUsername: null,
  decidedAt: null,
  decisionReason: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  let pending = [PENDING];
  procurement.get.mockImplementation(async () => ok(pending));
  procurement.patch.mockImplementation(async () => {
    pending = [];
    return ok({ ...PENDING, status: 'APPROVED' });
  });
  ecom.patch.mockResolvedValue(ok({ id: 2, enabled: true }));
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username: 'admin_l2', email: 'l2@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false },
  });
});

describe('Approvals hub: products', () => {
  it('lists pending products for Admin L2 and approves them through the product review', async () => {
    const user = userEvent.setup();
    render(
      <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
        <GlobalAlertContainer />
        <ApprovalsHub />
      </Provider>
    );

    expect(await screen.findByText('Product: Touch Panel')).toBeInTheDocument();
    expect(screen.getByText('Product Approval')).toBeInTheDocument();
    expect(screen.getByText('Resubmitted after rejection')).toBeInTheDocument();
    expect(procurement.get).toHaveBeenCalledWith('/v1/product-approvals', { params: { status: 'PENDING' } });

    await user.click(screen.getByTitle('Approve Request'));
    const dialog = screen.getByRole('dialog', { name: 'Review product approval' });
    await user.click(within(dialog).getByRole('radio', { name: 'Approve' }));
    await user.click(within(dialog).getByRole('button', { name: 'Approve & activate' }));

    await waitFor(() => expect(ecom.patch).toHaveBeenCalledWith('/products/2/status', { isEnabled: true }));
    expect(procurement.patch).toHaveBeenCalledWith('/v1/product-approvals/20/decision', { decision: 'APPROVED' });
    await waitFor(() => expect(screen.queryByText('Product: Touch Panel')).not.toBeInTheDocument());
  });
});
