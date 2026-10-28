import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import { OrderTrackingDetailPage } from '../order-tracking/pages/OrderTrackingDetailPage';
import { orderTrackingApi } from '../order-tracking/api/orderTrackingApi';
import { resetTrackingStatusCache } from '../order-tracking/hooks/useTrackingStatuses';
import type { AdminOrderDetail } from '../order-tracking/types/orderTracking.types';
import { refundApi } from './api/refundApi';
import { RefundsQueue } from './components/RefundsQueue';
import type { OrderRefundSummary, Refund, RefundablePayment } from './types/refund.types';
import type { ApiResponse, PageResponse } from '../../types/common.types';
import { superAdminPermissions } from '../../test/access';

// Only the network layer is mocked.
vi.mock('../order-tracking/api/orderTrackingApi', () => ({
  orderTrackingApi: { listOrders: vi.fn(), getOrder: vi.fn(), getTrackingStatuses: vi.fn(), updateTracking: vi.fn(), approvePreOrder: vi.fn() },
}));
vi.mock('./api/refundApi', () => ({
  refundApi: {
    getOrderRefunds: vi.fn(),
    requestRefund: vi.fn(),
    approveRefund: vi.fn(),
    rejectRefund: vi.fn(),
    syncRefund: vi.fn(),
    listRefunds: vi.fn(),
    getRefund: vi.fn(),
  },
}));
// The order page's profit panel is not part of these tests: it stays loading, without a network call
vi.mock('../products-management/api/costingApi', () => ({
  costingApi: { getOrderProfit: vi.fn(() => new Promise(() => {})) },
}));

const orders = vi.mocked(orderTrackingApi);
const api = vi.mocked(refundApi);
type User = ReturnType<typeof userEvent.setup>;

// ---------- fixtures ----------
const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });

const axiosError = (status: number, data: Record<string, unknown> = {}) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message ?? 'Request failed'), String(status), response.config, {}, response);
};

const ORDER: AdminOrderDetail = {
  id: 1,
  orderNumber: 'ORD-1001',
  orderStatus: 'CANCELLED',
  paymentMethod: 'RAZORPAY',
  paymentStatus: 'PAID',
  totalAmount: 2297,
  itemCount: 1,
  createdAt: '2026-10-01T09:00:00',
  updatedAt: '2026-10-01T11:00:00',
  updatedBy: 'asha@example.com',
  customer: { id: 7, name: 'Asha Verma', email: 'asha@example.com' },
  items: [{ productId: 11, title: 'Smart Plug', price: 2297, quantity: 1, totalPrice: 2297 }],
  currentTracking: null,
  addressId: null,
  subtotal: 2297,
  shippingFee: 0,
  notes: null,
  tracking: [
    { id: 1, status: 'ORDER_RECEIVED', stage: null, notes: null, current: false, updatedBy: null, createdAt: '2026-10-01T09:00:00', updatedAt: null },
    { id: 2, status: 'CANCELLED', stage: null, notes: 'Wrong size', current: true, updatedBy: 'asha@example.com', createdAt: '2026-10-01T11:00:00', updatedAt: null },
  ],
};

const PAYMENT: RefundablePayment = {
  paymentId: 1,
  razorpayPaymentId: 'pay_ABC123',
  razorpayOrderId: 'order_XYZ',
  amountPaise: 229700,
  amountRefundedPaise: 0,
  refundablePaise: 229700,
  currency: 'INR',
  paymentInstrument: 'UPI',
  paidAt: '2026-10-01T09:05:00',
  refundWindowEndsAt: '2027-03-30T09:05:00',
  refundWindowOpen: true,
  refundInProgress: false,
};

const refund = (overrides: Partial<Refund> = {}): Refund => ({
  id: 41,
  orderNumber: 'ORD-1001',
  paymentId: 1,
  razorpayPaymentId: 'pay_ABC123',
  amountPaise: 229700,
  currency: 'INR',
  speed: 'normal',
  status: 'REQUESTED',
  reason: 'Customer cancelled before dispatch',
  requestedBy: 'maker',
  requestedAt: '2026-10-02T10:00:00',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  reviewComment: null,
  receipt: 'RF-41',
  razorpayRefundId: null,
  speedProcessed: null,
  failureReason: null,
  processedAt: null,
  createdAt: '2026-10-02T10:00:00',
  updatedAt: '2026-10-02T10:00:00',
  ...overrides,
});

const summary = (overrides: Partial<OrderRefundSummary> = {}): ApiResponse<OrderRefundSummary> =>
  ok({
    orderNumber: 'ORD-1001',
    orderStatus: 'CANCELLED',
    paymentStatus: 'PAID',
    payments: [PAYMENT],
    refunds: [],
    canRequestRefund: true,
    refundBlockedReason: null,
    ...overrides,
  });

const signInAs = (role: 'ADMIN_L1' | 'ADMIN_L2', username = role === 'ADMIN_L1' ? 'maker' : 'checker') =>
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: { userId: 7, username, email: `${username}@tinqa.com`, role, authClient: 'web', isFirstLogin: false, permissions: superAdminPermissions(role) },
  });

// ---------- helpers ----------
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderOrder = () => {
  const user = userEvent.setup();
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter initialEntries={['/order-tracking/ORD-1001']}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/order-tracking/:orderNumber" element={<OrderTrackingDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return { user };
};

const findPanel = () => screen.findByRole('region', { name: 'Refunds' });
const history = async () => within(await findPanel()).findByRole('list', { name: 'Refund history' });
const refundItem = async (id = 41) => within(await history()).getByRole('listitem', { name: `Refund ${id}` });
const dialog = (name: string) => screen.getByRole('dialog', { name });

const openRequestForm = async (user: User) => {
  await user.click(within(await findPanel()).getByRole('button', { name: 'Request refund' }));
  return dialog('Request refund');
};

beforeEach(() => {
  vi.clearAllMocks();
  resetTrackingStatusCache();
  orders.getOrder.mockResolvedValue(ok(ORDER));
  orders.getTrackingStatuses.mockResolvedValue(ok(['ORDER_RECEIVED', 'CANCELLED', 'REFUND_REQUESTED'].map((status) => ({ status, stage: status }))));
  api.getOrderRefunds.mockResolvedValue(summary());
  signInAs('ADMIN_L1');
});

// ---------- tests ----------
describe('Refund panel on the order page', () => {
  it('shows the Razorpay payment with paid / refunded / refundable in ₹ and a copyable payment ID', async () => {
    api.getOrderRefunds.mockResolvedValue(summary({ payments: [{ ...PAYMENT, amountRefundedPaise: 50000, refundablePaise: 179700 }] }));
    renderOrder();
    const panel = await findPanel();
    expect(within(panel).getByText('pay_ABC123')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Copy Payment ID' })).toBeInTheDocument();
    expect(within(panel).getByTestId('refund-paid')).toHaveTextContent('₹2,297.00');
    expect(within(panel).getByTestId('refund-refunded')).toHaveTextContent('₹500.00');
    expect(within(panel).getByTestId('refund-refundable')).toHaveTextContent('₹1,797.00');
    expect(panel).toHaveTextContent('UPI');
  });

  it('is not shown for an order with no payments and no refunds', async () => {
    api.getOrderRefunds.mockResolvedValue(summary({ payments: [], canRequestRefund: false, refundBlockedReason: 'Nothing was paid.' }));
    renderOrder();
    await screen.findByRole('region', { name: 'Payment' });
    await waitFor(() => expect(api.getOrderRefunds).toHaveBeenCalledWith('ORD-1001'));
    expect(screen.queryByRole('region', { name: 'Refunds' })).not.toBeInTheDocument();
  });

  describe('roles', () => {
    it('L1 sees Request refund but not Approve / Reject', async () => {
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [refund({ requestedBy: 'someone_else' })] }));
      renderOrder();
      const panel = await findPanel();
      expect(within(panel).getByRole('button', { name: 'Request refund' })).toBeInTheDocument();
      const item = await refundItem();
      expect(within(item).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
      expect(within(item).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    });

    it('an approver without REFUND_REQUEST sees Approve / Reject but not Request refund', async () => {
      signInAs('ADMIN_L2');
      useAuthStore.setState((state) => ({
        user: state.user && { ...state.user, permissions: ['CUSTOMER_ORDER_VIEW', 'REFUND_VIEW', 'REFUND_APPROVE'] },
      }));
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [refund()] }));
      renderOrder();
      const item = await refundItem();
      expect(within(item).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
      expect(within(item).getByRole('button', { name: 'Reject' })).toBeInTheDocument();
      expect(within(await findPanel()).queryByRole('button', { name: 'Request refund' })).not.toBeInTheDocument();
    });

    it('hides Approve on your own request and says another L2 must approve', async () => {
      signInAs('ADMIN_L2', 'checker');
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [refund({ requestedBy: 'Checker' })] }));
      renderOrder();
      const item = await refundItem();
      expect(within(item).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
      expect(item).toHaveTextContent('You requested this refund. Another approver must approve it.');
    });

    it('shows L1 why a refund cannot be requested', async () => {
      api.getOrderRefunds.mockResolvedValue(summary({ canRequestRefund: false, refundBlockedReason: 'A refund is already waiting for approval.' }));
      renderOrder();
      const panel = await findPanel();
      expect(within(panel).getByRole('note', { name: 'Refund not available' })).toHaveTextContent('A refund is already waiting for approval.');
      expect(within(panel).queryByRole('button', { name: 'Request refund' })).not.toBeInTheDocument();
    });
  });

  describe('L1 requests a refund', () => {
    it('defaults to the refundable amount and sends paise, reason and speed after confirmation, then reloads order and refunds', async () => {
      api.requestRefund.mockResolvedValue(ok(refund(), 'Refund #41 requested'));
      const { user } = renderOrder();
      const form = await openRequestForm(user);

      const amount = within(form).getByLabelText('Refund amount');
      expect(amount).toHaveValue('2297.00');
      await user.clear(amount);
      await user.type(amount, '0.3');
      await user.type(within(form).getByLabelText('Refund reason'), '  Customer cancelled  ');
      expect(form).toHaveTextContent('22/500');
      await user.click(within(form).getByRole('radio', { name: /Instant/ }));
      await user.click(within(form).getByRole('button', { name: 'Request refund' }));

      // Nothing is sent until the confirmation.
      expect(api.requestRefund).not.toHaveBeenCalled();
      expect(screen.getByText(/₹0\.30 \(instant speed\) will be refunded to the customer for order ORD-1001/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Yes, Submit' }));

      await waitFor(() =>
        expect(api.requestRefund).toHaveBeenCalledWith('ORD-1001', { reason: 'Customer cancelled', amountPaise: 30, speed: 'optimum' })
      );
      expect(await screen.findByText('Refund #41 requested')).toBeInTheDocument();
      await waitFor(() => expect(orders.getOrder).toHaveBeenCalledTimes(2));
      expect(api.getOrderRefunds).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('dialog', { name: 'Request refund' })).not.toBeInTheDocument();
    });

    it('validates amount and reason before anything is sent', async () => {
      const { user } = renderOrder();
      const form = await openRequestForm(user);
      const amount = within(form).getByLabelText('Refund amount');
      await user.clear(amount);
      await user.type(amount, '2297.01');
      await user.type(within(form).getByLabelText('Refund reason'), 'no');
      await user.click(within(form).getByRole('button', { name: 'Request refund' }));

      expect(form).toHaveTextContent('The amount cannot be more than ₹2,297.00.');
      expect(form).toHaveTextContent('Reason must be at least 3 characters.');
      expect(screen.queryByRole('button', { name: 'Yes, Submit' })).not.toBeInTheDocument();
      expect(api.requestRefund).not.toHaveBeenCalled();
    });

    it('sends the chosen payment only when the order has more than one', async () => {
      const second = { ...PAYMENT, paymentId: 2, razorpayPaymentId: 'pay_DEF456', amountPaise: 10000, refundablePaise: 10000 };
      api.getOrderRefunds.mockResolvedValue(summary({ payments: [PAYMENT, second] }));
      api.requestRefund.mockResolvedValue(ok(refund()));
      const { user } = renderOrder();
      const form = await openRequestForm(user);
      await user.selectOptions(within(form).getByLabelText('Payment'), '2');
      expect(within(form).getByLabelText('Refund amount')).toHaveValue('100.00');
      await user.type(within(form).getByLabelText('Refund reason'), 'Duplicate payment');
      await user.click(within(form).getByRole('button', { name: 'Request refund' }));
      await user.click(screen.getByRole('button', { name: 'Yes, Submit' }));
      await waitFor(() =>
        expect(api.requestRefund).toHaveBeenCalledWith('ORD-1001', { reason: 'Duplicate payment', amountPaise: 10000, speed: 'normal', paymentId: 2 })
      );
    });

    it('shows 400 field errors on the fields and keeps the form open', async () => {
      api.requestRefund.mockRejectedValue(
        axiosError(400, { message: 'Validation failed', errorCode: 'VALIDATION_FAILED', errors: [{ field: 'reason', message: 'Reason must not contain markup' }] })
      );
      const { user } = renderOrder();
      const form = await openRequestForm(user);
      await user.type(within(form).getByLabelText('Refund reason'), 'Customer cancelled');
      await user.click(within(form).getByRole('button', { name: 'Request refund' }));
      await user.click(screen.getByRole('button', { name: 'Yes, Submit' }));

      await waitFor(() => expect(dialog('Request refund')).toHaveTextContent('Reason must not contain markup'));
      expect(api.getOrderRefunds).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['REFUND_WINDOW_EXPIRED', 'The refund window for this payment has closed.'],
      ['REFUND_ALREADY_IN_PROGRESS', 'A refund for this payment is already in progress.'],
      ['NOTHING_TO_REFUND', 'Nothing is left to refund on this payment.'],
      ['NO_CAPTURED_PAYMENT', 'This order has no captured payment to refund.'],
      ['REFUND_NOT_ALLOWED_FOR_STATUS', "This order can't be refunded in its current status."],
    ])('409 %s shows the message and reloads the summary', async (errorCode, message) => {
      api.requestRefund.mockRejectedValue(axiosError(409, { errorCode }));
      const { user } = renderOrder();
      const form = await openRequestForm(user);
      await user.type(within(form).getByLabelText('Refund reason'), 'Customer cancelled');
      await user.click(within(form).getByRole('button', { name: 'Request refund' }));
      await user.click(screen.getByRole('button', { name: 'Yes, Submit' }));

      expect(await screen.findByText(message)).toBeInTheDocument();
      await waitFor(() => expect(api.getOrderRefunds).toHaveBeenCalledTimes(2));
    });
  });

  describe('L2 approves or rejects', () => {
    beforeEach(() => signInAs('ADMIN_L2'));

    it('confirms the amount and that money goes via Razorpay, then approves and reloads', async () => {
      api.getOrderRefunds.mockResolvedValueOnce(summary({ refunds: [refund()] }));
      api.approveRefund.mockResolvedValue(ok(refund({ status: 'PENDING' }), 'Refund sent to Razorpay'));
      const { user } = renderOrder();
      await user.click(within(await refundItem()).getByRole('button', { name: 'Approve' }));

      expect(
        screen.getByText("₹2,297.00 will be sent back to the customer via Razorpay for order ORD-1001 (payment pay_ABC123). This can't be undone.")
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Yes, Approve' }));

      await waitFor(() => expect(api.approveRefund).toHaveBeenCalledWith(41));
      expect(await screen.findByText('Refund sent to Razorpay')).toBeInTheDocument();
      await waitFor(() => expect(orders.getOrder).toHaveBeenCalledTimes(2));
      expect(api.getOrderRefunds).toHaveBeenCalledTimes(2);
    });

    it('sends one approval however often the confirm button is clicked', async () => {
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [refund()] }));
      let resolve!: (value: ApiResponse<Refund>) => void;
      api.approveRefund.mockReturnValue(new Promise((r) => (resolve = r)));
      const { user } = renderOrder();
      await user.click(within(await refundItem()).getByRole('button', { name: 'Approve' }));
      const confirm = screen.getByRole('button', { name: 'Yes, Approve' });
      await user.click(confirm);
      await user.click(screen.getByRole('button', { name: /Processing/ }));
      expect(api.approveRefund).toHaveBeenCalledTimes(1);
      expect(within(await refundItem()).getByRole('button', { name: 'Reject' })).toBeDisabled();
      resolve(ok(refund({ status: 'PENDING' })));
      await waitFor(() => expect(api.getOrderRefunds).toHaveBeenCalledTimes(2));
    });

    it.each([
      [403, 'REFUND_SELF_APPROVAL_NOT_ALLOWED', 'Not allowed', 'Another approver must approve this refund — you requested it.', false],
      [409, 'REFUND_NOT_AWAITING_APPROVAL', undefined, 'Another admin has already acted on this refund. Showing its latest state.', true],
      [409, 'PAYMENT_NOT_CAPTURED', 'Payment pay_ABC123 is not captured', 'Payment pay_ABC123 is not captured', true],
      [409, 'REFUND_EXCEEDS_BALANCE', undefined, 'The refund is more than the amount still refundable. The refund is marked failed.', true],
      [502, 'REFUND_REJECTED_BY_RAZORPAY', 'Razorpay: The refund amount is invalid', 'Razorpay: The refund amount is invalid', true],
    ])('%s %s shows the right message', async (status, errorCode, serverMessage, shown, reloads) => {
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [refund()] }));
      api.approveRefund.mockRejectedValue(axiosError(status, { errorCode, ...(serverMessage ? { message: serverMessage } : {}) }));
      const { user } = renderOrder();
      await user.click(within(await refundItem()).getByRole('button', { name: 'Approve' }));
      await user.click(screen.getByRole('button', { name: 'Yes, Approve' }));

      expect(await screen.findByText(shown)).toBeInTheDocument();
      if (reloads) await waitFor(() => expect(api.getOrderRefunds).toHaveBeenCalledTimes(2));
      else expect(api.getOrderRefunds).toHaveBeenCalledTimes(1);
    });

    it('shows the failure reason of a refund Razorpay rejected', async () => {
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [refund({ status: 'FAILED', failureReason: 'The refund amount is invalid.' })] }));
      renderOrder();
      expect(within(await refundItem()).getByTestId('refund-failure')).toHaveTextContent('Failed: The refund amount is invalid.');
    });

    it('502 RAZORPAY_UNAVAILABLE keeps the refund APPROVED and offers Retry approval (the same approve call)', async () => {
      api.getOrderRefunds
        .mockResolvedValueOnce(summary({ refunds: [refund()] }))
        .mockResolvedValue(summary({ refunds: [refund({ status: 'APPROVED', approvedBy: 'checker', failureReason: 'Razorpay timed out.' })] }));
      api.approveRefund.mockRejectedValueOnce(axiosError(502, { errorCode: 'RAZORPAY_UNAVAILABLE', message: 'Bad gateway' }));
      const { user } = renderOrder();
      await user.click(within(await refundItem()).getByRole('button', { name: 'Approve' }));
      await user.click(screen.getByRole('button', { name: 'Yes, Approve' }));

      expect(await screen.findByText("Couldn't reach Razorpay. The refund is still approved — use Retry approval to try again.")).toBeInTheDocument();
      const retry = await within(await refundItem()).findByRole('button', { name: 'Retry approval' });
      expect(within(await refundItem()).getByTestId('refund-failure')).toHaveTextContent('Razorpay timed out.');

      api.approveRefund.mockResolvedValue(ok(refund({ status: 'PENDING' })));
      await user.click(retry);
      await user.click(screen.getByRole('button', { name: 'Yes, Approve' }));
      await waitFor(() => expect(api.approveRefund).toHaveBeenCalledTimes(2));
      expect(api.approveRefund).toHaveBeenLastCalledWith(41);
    });

    it('rejects with a required comment', async () => {
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [refund()] }));
      api.rejectRefund.mockResolvedValue(ok(refund({ status: 'REJECTED' }), 'Refund rejected'));
      const { user } = renderOrder();
      await user.click(within(await refundItem()).getByRole('button', { name: 'Reject' }));
      const form = dialog('Reject refund');

      expect(within(form).getByRole('button', { name: 'Reject refund' })).toBeDisabled();
      await user.type(within(form).getByLabelText('Rejection comment'), 'a<b');
      await user.click(within(form).getByRole('button', { name: 'Reject refund' }));
      expect(form).toHaveTextContent('Comment cannot contain < or >.');
      expect(api.rejectRefund).not.toHaveBeenCalled();

      await user.clear(within(form).getByLabelText('Rejection comment'));
      await user.type(within(form).getByLabelText('Rejection comment'), ' Not eligible: delivered item ');
      await user.click(within(form).getByRole('button', { name: 'Reject refund' }));
      await waitFor(() => expect(api.rejectRefund).toHaveBeenCalledWith(41, 'Not eligible: delivered item'));
      expect(await screen.findByText('Refund rejected')).toBeInTheDocument();
      expect(screen.queryByRole('dialog', { name: 'Reject refund' })).not.toBeInTheDocument();
    });

    it('shows who rejected it and the review comment in the history', async () => {
      api.getOrderRefunds.mockResolvedValue(
        summary({ refunds: [refund({ status: 'REJECTED', rejectedBy: 'checker', rejectedAt: '2026-10-02T12:00:00', reviewComment: 'Not eligible' })] })
      );
      renderOrder();
      const item = await refundItem();
      expect(item).toHaveTextContent('Rejected');
      expect(item).toHaveTextContent('by checker');
      expect(within(item).getByTestId('refund-review-comment')).toHaveTextContent('Not eligible');
      expect(within(item).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    });
  });

  describe('payment status follows each refund step', () => {
    const paymentStatusAfter = async (paymentStatus: string) => {
      orders.getOrder.mockResolvedValueOnce(ok(ORDER)).mockResolvedValue(ok({ ...ORDER, paymentStatus }));
    };

    it('request → the reloaded order shows "Refund requested"', async () => {
      await paymentStatusAfter('REFUND_REQUESTED');
      api.requestRefund.mockResolvedValue(ok(refund()));
      const { user } = renderOrder();
      expect(await screen.findByTestId('payment-status')).toHaveTextContent('Paid');
      const form = await openRequestForm(user);
      await user.type(within(form).getByLabelText('Refund reason'), 'Customer cancelled');
      await user.click(within(form).getByRole('button', { name: 'Request refund' }));
      await user.click(screen.getByRole('button', { name: 'Yes, Submit' }));
      await waitFor(() => expect(screen.getByTestId('payment-status')).toHaveTextContent('Refund requested'));
    });

    it.each([
      ['approve', 'REFUND_INITIATED', 'Refund initiated'],
      ['reject', 'PAID', 'Paid'],
    ])('L2 %s → the reloaded order shows "%s"', async (action, paymentStatus, label) => {
      signInAs('ADMIN_L2');
      orders.getOrder
        .mockResolvedValueOnce(ok({ ...ORDER, paymentStatus: 'REFUND_REQUESTED' }))
        .mockResolvedValue(ok({ ...ORDER, paymentStatus }));
      api.getOrderRefunds.mockResolvedValue(summary({ paymentStatus: 'REFUND_REQUESTED', refunds: [refund()] }));
      api.approveRefund.mockResolvedValue(ok(refund({ status: 'PENDING' })));
      api.rejectRefund.mockResolvedValue(ok(refund({ status: 'REJECTED' })));
      const { user } = renderOrder();
      expect(await screen.findByTestId('payment-status')).toHaveTextContent('Refund requested');

      if (action === 'approve') {
        await user.click(within(await refundItem()).getByRole('button', { name: 'Approve' }));
        await user.click(screen.getByRole('button', { name: 'Yes, Approve' }));
      } else {
        await user.click(within(await refundItem()).getByRole('button', { name: 'Reject' }));
        await user.type(within(dialog('Reject refund')).getByLabelText('Rejection comment'), 'Not eligible');
        await user.click(within(dialog('Reject refund')).getByRole('button', { name: 'Reject refund' }));
      }
      await waitFor(() => expect(screen.getByTestId('payment-status')).toHaveTextContent(label));
    });

    it('sync → the reloaded order shows "Refunded"', async () => {
      orders.getOrder
        .mockResolvedValueOnce(ok({ ...ORDER, paymentStatus: 'REFUND_INITIATED' }))
        .mockResolvedValue(ok({ ...ORDER, paymentStatus: 'REFUNDED' }));
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [refund({ status: 'PENDING', approvedBy: 'checker' })] }));
      api.syncRefund.mockResolvedValue(ok(refund({ status: 'PROCESSED' })));
      const { user } = renderOrder();
      expect(await screen.findByTestId('payment-status')).toHaveTextContent('Refund initiated');
      await user.click(within(await refundItem()).getByRole('button', { name: 'Refresh status' }));
      await waitFor(() => expect(screen.getByTestId('payment-status')).toHaveTextContent('Refunded'));
    });
  });

  describe('waiting on Razorpay', () => {
    const pending = refund({ status: 'PENDING', approvedBy: 'checker', approvedAt: '2026-10-02T11:00:00', razorpayRefundId: 'rfnd_123' });

    it.each(['ADMIN_L1', 'ADMIN_L2'] as const)('%s can refresh a PENDING refund', async (role) => {
      signInAs(role);
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [pending] }));
      api.syncRefund.mockResolvedValue(ok({ ...pending, status: 'PROCESSED' }, 'Refund processed'));
      const { user } = renderOrder();
      const item = await refundItem();
      expect(item).toHaveTextContent('Waiting for Razorpay to complete the refund.');
      expect(item).toHaveTextContent('rfnd_123');
      await user.click(within(item).getByRole('button', { name: 'Refresh status' }));
      await waitFor(() => expect(api.syncRefund).toHaveBeenCalledWith(41));
      expect(await screen.findByText('Refund processed')).toBeInTheDocument();
      await waitFor(() => expect(orders.getOrder).toHaveBeenCalledTimes(2));
    });

    it('502 RAZORPAY_UNAVAILABLE on refresh says to try again', async () => {
      api.getOrderRefunds.mockResolvedValue(summary({ refunds: [pending] }));
      api.syncRefund.mockRejectedValue(axiosError(502, { errorCode: 'RAZORPAY_UNAVAILABLE', message: 'Bad gateway' }));
      const { user } = renderOrder();
      await user.click(within(await refundItem()).getByRole('button', { name: 'Refresh status' }));
      expect(await screen.findByText("Couldn't reach Razorpay, try again.")).toBeInTheDocument();
    });
  });
});

describe('Refunds approvals queue', () => {
  const page = (content: Refund[], overrides: Partial<PageResponse<Refund>> = {}) =>
    ok<PageResponse<Refund>>({
      content,
      number: 0,
      size: 20,
      totalElements: content.length,
      totalPages: content.length ? 1 : 0,
      first: true,
      last: true,
      empty: !content.length,
      ...overrides,
    });

  const renderQueue = () => {
    const user = userEvent.setup();
    render(
      <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
        <MemoryRouter initialEntries={['/approvals']}>
          <GlobalAlertContainer />
          <Routes>
            <Route path="/approvals" element={<RefundsQueue />} />
            <Route path="/order-tracking/:orderNumber" element={<p>Order page</p>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </Provider>
    );
    return { user };
  };

  beforeEach(() => signInAs('ADMIN_L2'));

  it('lists refunds awaiting approval, links to the order and approves inline', async () => {
    api.listRefunds.mockResolvedValue(page([refund()]));
    api.approveRefund.mockResolvedValue(ok(refund({ status: 'PENDING' }), 'Refund sent to Razorpay'));
    const { user } = renderQueue();

    const table = await screen.findByRole('table', { name: 'Refunds' });
    expect(api.listRefunds).toHaveBeenCalledWith({ status: 'REQUESTED', page: 0, size: 20 });
    expect(table).toHaveTextContent('₹2,297.00');
    expect(table).toHaveTextContent('Customer cancelled before dispatch');

    await user.click(within(table).getByRole('button', { name: 'Approve' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Approve' }));
    await waitFor(() => expect(api.approveRefund).toHaveBeenCalledWith(41));
    await waitFor(() => expect(api.listRefunds).toHaveBeenCalledTimes(2));

    await user.click(within(table).getByRole('link', { name: 'ORD-1001' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/order-tracking/ORD-1001');
  });

  it('filters by status and pages through results', async () => {
    api.listRefunds.mockResolvedValue(page([refund()], { totalPages: 3, totalElements: 41, last: false }));
    const { user } = renderQueue();
    await screen.findByRole('table', { name: 'Refunds' });

    await user.selectOptions(screen.getByLabelText('Refund status'), 'FAILED');
    await waitFor(() => expect(api.listRefunds).toHaveBeenLastCalledWith({ status: 'FAILED', page: 0, size: 20 }));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(api.listRefunds).toHaveBeenLastCalledWith({ status: 'FAILED', page: 1, size: 20 }));
    await user.selectOptions(screen.getByLabelText('Refund status'), 'ALL');
    await waitFor(() => expect(api.listRefunds).toHaveBeenLastCalledWith({ status: undefined, page: 0, size: 20 }));
  });

  it('says when nothing is waiting', async () => {
    api.listRefunds.mockResolvedValue(page([]));
    renderQueue();
    expect(await screen.findByText('No refunds are awaiting approval.')).toBeInTheDocument();
  });

  it('L1 sees the queue without approve / reject', async () => {
    signInAs('ADMIN_L1');
    api.listRefunds.mockResolvedValue(page([refund({ requestedBy: 'someone_else' })]));
    renderQueue();
    const table = await screen.findByRole('table', { name: 'Refunds' });
    expect(within(table).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });
});
