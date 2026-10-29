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
import { ecommerceAxiosClient } from '../../api/ecommerceAxiosClient';
import { refundApi } from '../refunds/api/refundApi';
import type { Refund } from '../refunds/types/refund.types';
import type { PageResponse } from '../../types/common.types';
import { superAdminPermissions } from '../../test/access';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../refunds/api/refundApi', () => ({
  refundApi: { listRefunds: vi.fn(), approveRefund: vi.fn(), rejectRefund: vi.fn(), syncRefund: vi.fn() },
}));
const procurement = vi.mocked(axiosClient);
const refunds = vi.mocked(refundApi);
const ecommerce = vi.mocked(ecommerceAxiosClient);
// What GET /admin/approvals/summary reports for the refunds queue
let waitingRefunds = 1;

const REQUESTED: Refund = {
  id: 23,
  orderNumber: 'ORD-C30CF8AF',
  paymentId: 1,
  razorpayPaymentId: 'pay_ABC123',
  amountPaise: 229700,
  currency: 'INR',
  speed: 'normal',
  status: 'REQUESTED',
  reason: 'Customer cancelled',
  requestedBy: 'admin_l1',
  requestedAt: '2026-10-14T17:21:18',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  reviewComment: null,
  receipt: 'RF-23',
  razorpayRefundId: null,
  speedProcessed: null,
  failureReason: null,
  processedAt: null,
  createdAt: '2026-10-14T17:21:18',
  updatedAt: '2026-10-14T17:21:18',
};

const page = (content: Refund[]) => ({
  success: true,
  message: 'OK',
  errorCode: null,
  timestamp: '',
  path: '',
  data: { content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true, empty: !content.length } as PageResponse<Refund>,
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

beforeEach(() => {
  vi.clearAllMocks();
  procurement.get.mockResolvedValue({ data: { success: true, message: 'OK', data: [] } });
  refunds.listRefunds.mockResolvedValue(page([REQUESTED]));
  waitingRefunds = 1;
  ecommerce.get.mockImplementation(async () => ({ data: { success: true, message: 'OK', data: { REFUNDS: waitingRefunds } } }));
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username: 'admin_l2', email: 'l2@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions: superAdminPermissions('ADMIN_L2') },
  });
});

describe('Approvals hub: refunds', () => {
  it('points L2 from the Requests tab to refunds awaiting approval, where they can approve', async () => {
    const user = userEvent.setup();
    refunds.approveRefund.mockResolvedValue({ success: true, message: 'Refund approved and sent to Razorpay', errorCode: null, timestamp: '', path: '', data: { ...REQUESTED, status: 'PENDING' } });
    renderHub();

    const note = await screen.findByRole('note', { name: 'Refunds awaiting approval' });
    expect(note).toHaveTextContent('1 refund is awaiting approval.');
    expect(screen.getByRole('tab', { name: /Refunds/ })).toHaveTextContent('1');

    await user.click(within(note).getByRole('button', { name: /Review refunds/ }));
    expect(screen.getByRole('tab', { name: /Refunds/ })).toHaveAttribute('aria-selected', 'true');
    const table = await screen.findByRole('table', { name: 'Refunds' });

    refunds.listRefunds.mockResolvedValue(page([]));
    waitingRefunds = 0;
    await user.click(within(table).getByRole('button', { name: 'Approve' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Approve' }));
    await waitFor(() => expect(refunds.approveRefund).toHaveBeenCalledWith(23));
    // The badge follows the queue.
    await waitFor(() => expect(screen.getByRole('tab', { name: /Refunds/ })).not.toHaveTextContent('1'));
  });

  it('shows no refund prompt when nothing is waiting', async () => {
    waitingRefunds = 0;
    renderHub();
    await waitFor(() => expect(ecommerce.get).toHaveBeenCalledWith('/admin/approvals/summary'));
    // The Refunds tab isn't open, so its list isn't loaded
    expect(refunds.listRefunds).not.toHaveBeenCalled();
    expect(screen.queryByRole('note', { name: 'Refunds awaiting approval' })).not.toBeInTheDocument();
  });
});
