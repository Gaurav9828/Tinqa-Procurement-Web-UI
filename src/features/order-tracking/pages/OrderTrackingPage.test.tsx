import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../../store/useAuthStore';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { OrderTrackingPage } from './OrderTrackingPage';
import { OrderTrackingDetailPage } from './OrderTrackingDetailPage';
import { orderTrackingApi } from '../api/orderTrackingApi';
import { refundApi } from '../../refunds/api/refundApi';
import { resetTrackingStatusCache } from '../hooks/useTrackingStatuses';
import { resetAdminOrdersCache } from '../hooks/useAdminOrders';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  OrderPaymentAttempt,
  OrderTrackingEntry,
  TrackingStatusOption,
} from '../types/orderTracking.types';
import { formatDateTime } from '../utils/orderTracking.utils';
import { superAdminPermissions } from '../../../test/access';

// Only the network layer is mocked.
vi.mock('../api/orderTrackingApi', () => ({
  orderTrackingApi: {
    listOrders: vi.fn(),
    getOrder: vi.fn(),
    getTrackingStatuses: vi.fn(),
    updateTracking: vi.fn(),
    updateDeliveryStatus: vi.fn(),
    approvePreOrder: vi.fn(),
  },
}));

// The refund panel has its own suite (features/refunds); here it just loads an order with no refunds.
vi.mock('../../refunds/api/refundApi', () => ({
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

const api = vi.mocked(orderTrackingApi);
const refunds = vi.mocked(refundApi);
type User = ReturnType<typeof userEvent.setup>;

// ---------- fixtures ----------
const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({
  success: true,
  message,
  errorCode: null,
  data,
  timestamp: '',
  path: '',
});

const entry = (
  id: number,
  status: string,
  createdAt: string,
  { current = false, notes = null, updatedBy = 'admin_l1' }: { current?: boolean; notes?: string | null; updatedBy?: string | null } = {}
): OrderTrackingEntry => ({ id, status, stage: status, notes, current, updatedBy, createdAt, updatedAt: createdAt });

const SUMMARY: AdminOrderSummary = {
  id: 1,
  orderNumber: 'ORD-1001',
  orderStatus: 'PACKED',
  paymentMethod: 'UPI',
  paymentStatus: 'PAID',
  totalAmount: 2297,
  itemCount: 2,
  createdAt: '2026-10-01T09:00:00',
  updatedAt: '2026-10-02T12:00:00',
  updatedBy: 'admin_l1',
  customer: { id: 7, name: 'Asha Verma', email: 'asha@example.com' },
  items: [
    { productId: 11, title: 'Smart Plug', price: 999, quantity: 2, totalPrice: 1998 },
    { productId: 12, title: 'LED Bulb', price: 299, quantity: 1, totalPrice: 299 },
  ],
  currentTracking: entry(3, 'PACKED', '2026-10-02T12:00:00', { current: true, notes: 'Packed at warehouse' }),
};

// Older order: no customer row, no tracking events, no updater attribution.
const LEGACY: AdminOrderSummary = {
  ...SUMMARY,
  id: 2,
  orderNumber: 'ORD-2002',
  orderStatus: 'CONFIRMED',
  updatedBy: null,
  customer: null,
  currentTracking: null,
};

// Deliberately out of order to prove the timeline sorts by createdAt ascending.
const HISTORY: OrderTrackingEntry[] = [
  entry(3, 'PACKED', '2026-10-02T12:00:00', { current: true, notes: 'Packed at warehouse' }),
  entry(1, 'ORDER_RECEIVED', '2026-10-01T09:00:00', { updatedBy: null }),
  entry(2, 'CONFIRMED', '2026-10-01T10:30:00'),
];

const DETAIL: AdminOrderDetail = {
  ...SUMMARY,
  addressId: 5,
  subtotal: 2297,
  shippingFee: 0,
  notes: 'Leave at reception',
  tracking: HISTORY,
};

/** Detail whose latest event is `status` (previous event: PACKED). */
const withCurrent = (status: string): AdminOrderDetail => ({
  ...DETAIL,
  orderStatus: status,
  tracking: [
    entry(1, 'ORDER_RECEIVED', '2026-10-01T09:00:00'),
    entry(2, 'PACKED', '2026-10-02T12:00:00'),
    entry(3, status, '2026-10-03T08:00:00', { current: true }),
  ],
});

const STATUSES: TrackingStatusOption[] = [
  'ORDER_RECEIVED',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERY_FAILED',
  'CUSTOMER_UNAVAILABLE',
  'INVALID_ADDRESS',
  'CUSTOMER_CANCELLED_DELIVERY',
  'DELIVERY_REATTEMPT',
  'DELIVERED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_REJECTED',
  'OUT_FOR_PICKUP',
  'RETURN_PICKED_UP',
  'RETURN_IN_TRANSIT',
  'RETURN_RECEIVED',
  'RETURN_INSPECTION',
  'RETURN_INSPECTION_FAILED',
  'RETURN_CANCELLED',
  'RETURN_COMPLETED',
  'REFUND_REQUESTED',
  'REFUND_INITIATED',
  'REFUND_FAILED',
  'REFUND_COMPLETED',
  'CANCELLED',
].map((status) => ({ status, stage: status }));

const page = (content: AdminOrderSummary[], overrides: Partial<PageResponse<AdminOrderSummary>> = {}) =>
  ok<PageResponse<AdminOrderSummary>>({
    content,
    number: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    first: true,
    last: true,
    empty: content.length === 0,
    ...overrides,
  });

const axiosError = (status: number, data: Record<string, unknown> = {}) => {
  const response = {
    status,
    statusText: String(status),
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  return new AxiosError(String(data.message ?? 'Request failed'), String(status), response.config, {}, response);
};

const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK', { headers: new AxiosHeaders() }, {});

const trackingOk = (message = 'Order status updated successfully') =>
  ok<OrderTrackingEntry>(entry(9, 'SHIPPED', '2026-10-03T09:00:00', { current: true }), message);

// ---------- helpers ----------
/** Renders the current URL so tests can assert navigation. */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
};

const renderPage = (initialEntry: string | { pathname: string; state?: unknown } = '/order-tracking') => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/order-tracking" element={<OrderTrackingPage />} />
          <Route path="/order-tracking/:orderNumber" element={<OrderTrackingDetailPage />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </Provider>
  );
  return { user };
};

const currentUrl = () => screen.getByTestId('location').textContent;
const detailPage = (orderNumber = 'ORD-1001') => screen.getByRole('region', { name: `Order ${orderNumber} details` });

const lastListParams = () => api.listOrders.mock.calls.at(-1)?.[0];

const openOrder = async (user: User, orderNumber = 'ORD-1001') => {
  const table = await screen.findByRole('table');
  await user.click(within(table).getByRole('link', { name: orderNumber }));
  const panel = detailPage(orderNumber);
  await within(panel).findByRole('list', { name: 'Tracking history' });
  // Next steps load from the API.
  await within(panel).findByRole('radiogroup', { name: 'Next step' });
  return panel;
};

/** The next-step cards on offer, by status value. */
const stepValues = (panel: HTMLElement) =>
  within(within(panel).getByRole('radiogroup', { name: 'Next step' }))
    .getAllByRole('radio')
    .map((radio) => radio.getAttribute('value'));

const chooseStep = (user: User, panel: HTMLElement, status: string) =>
  user.click(within(within(panel).getByRole('radiogroup', { name: 'Next step' })).getAllByRole('radio').find((r) => r.getAttribute('value') === status)!);

const updateButton = (panel: HTMLElement) => within(panel).getByRole('button', { name: 'Update status' });

const historyItems = (container: HTMLElement) =>
  within(within(container).getByRole('list', { name: 'Tracking history' })).getAllByRole('listitem');

beforeEach(() => {
  resetTrackingStatusCache();
  resetAdminOrdersCache();
  api.listOrders.mockResolvedValue(page([SUMMARY, LEGACY]));
  api.getOrder.mockResolvedValue(ok(DETAIL));
  api.getTrackingStatuses.mockResolvedValue(ok(STATUSES));
  api.updateTracking.mockResolvedValue(trackingOk());
  api.updateDeliveryStatus.mockResolvedValue(trackingOk('Delivery status updated successfully'));
  refunds.getOrderRefunds.mockImplementation(async (orderNumber: string) =>
    ok({
      orderNumber,
      orderStatus: 'PACKED',
      paymentStatus: 'PAID',
      payments: [],
      refunds: [],
      canRequestRefund: false,
      refundBlockedReason: 'Only cancelled or returned orders can be refunded.',
    })
  );
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: { userId: 7, username: 'admin1', email: 'a@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions: superAdminPermissions('ADMIN_L1') },
  });
});

// ---------- tests ----------
describe('OrderTrackingPage', () => {
  describe('order list', () => {
    it('shows a loading state while the first page is fetched', () => {
      api.listOrders.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(screen.getByText('Loading orders...')).toBeInTheDocument();
    });

    it('requests the first page with default paging and sort', async () => {
      renderPage();
      await screen.findByRole('table');
      expect(api.listOrders).toHaveBeenCalledWith({
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
        search: '',
        status: '',
        paymentStatus: '',
        fromDate: '',
        toDate: '',
      });
    });

    it('renders order number, customer, items, order status, tracking status, last update and updater', async () => {
      renderPage();
      const table = await screen.findByRole('table');
      const row = within(table).getByRole('link', { name: 'ORD-1001' }).closest('tr')!;
      const cells = within(row).getAllByRole('cell');

      expect(within(row).getByText('Asha Verma')).toBeInTheDocument();
      expect(within(row).getByText('asha@example.com')).toBeInTheDocument();
      expect(within(row).getByText(/Smart Plug ×2, LED Bulb ×1/)).toBeInTheDocument();
      expect(within(row).getByText('₹2,297.00')).toBeInTheDocument();
      expect(cells[4]).toHaveTextContent('Paid'); // payment status
      expect(cells[4]).toHaveTextContent('UPI'); // payment method
      expect(cells[5]).toHaveTextContent('Packed'); // order status
      expect(cells[6]).toHaveTextContent('Packed'); // tracking status
      expect(cells[7]).toHaveTextContent('by admin_l1');
      expect(screen.getByText(/\(2 orders\)/)).toBeInTheDocument();
    });

    it('labels missing audit data neutrally instead of showing null', async () => {
      renderPage();
      const table = await screen.findByRole('table');
      const row = within(table).getByRole('link', { name: 'ORD-2002' }).closest('tr')!;
      expect(within(row).getByText('Unknown customer')).toBeInTheDocument();
      expect(within(row).getByText('No tracking yet')).toBeInTheDocument();
      expect(within(row).getByText('by Unknown / historical update')).toBeInTheDocument();
      expect(row).not.toHaveTextContent('null');
    });

    it('shows "No orders yet" when the store has no orders', async () => {
      api.listOrders.mockResolvedValue(page([]));
      renderPage();
      expect(await screen.findByText('No orders yet')).toBeInTheDocument();
    });

    it('sends a debounced, trimmed search and resets to page 0', async () => {
      api.listOrders.mockResolvedValue(page([SUMMARY], { totalPages: 3, totalElements: 41, last: false }));
      const { user } = renderPage();
      await screen.findByRole('table');
      await user.click(screen.getByRole('button', { name: 'Next page' }));
      await waitFor(() => expect(lastListParams()?.page).toBe(1));

      await user.type(screen.getByLabelText('Search orders'), '  asha  ');
      await waitFor(() => expect(lastListParams()).toMatchObject({ search: 'asha', page: 0 }));
      expect(api.listOrders.mock.calls.filter(([p]) => p.search && p.search !== 'asha')).toHaveLength(0);
    });

    it('shows "No orders found" when filters match nothing', async () => {
      const { user } = renderPage();
      await screen.findByRole('table');
      api.listOrders.mockResolvedValue(page([]));
      await user.type(screen.getByLabelText('Search orders'), 'zzz');
      expect(await screen.findByText('No orders found')).toBeInTheDocument();
    });

    it('filters by status using the status list from the API', async () => {
      const { user } = renderPage();
      await screen.findByRole('table');
      const statusFilter = screen.getByLabelText('Filter by status');
      await waitFor(() => expect(within(statusFilter).getAllByRole('option')).toHaveLength(STATUSES.length + 1));

      await user.selectOptions(statusFilter, 'OUT_FOR_DELIVERY');
      await waitFor(() => expect(lastListParams()).toMatchObject({ status: 'OUT_FOR_DELIVERY', page: 0 }));
    });

    it('shows each order\'s payment status, and "Not recorded" when it is missing', async () => {
      api.listOrders.mockResolvedValue(
        page([
          SUMMARY,
          { ...LEGACY, paymentStatus: 'REFUND_REQUESTED', paymentMethod: null },
          { ...LEGACY, id: 3, orderNumber: 'ORD-3003', paymentStatus: null },
        ])
      );
      renderPage();
      const table = await screen.findByRole('table');
      const payment = (orderNumber: string) =>
        within(within(table).getByRole('link', { name: orderNumber }).closest('tr')!).getByTestId('payment-status');
      expect(payment('ORD-1001')).toHaveTextContent('Paid');
      expect(payment('ORD-2002')).toHaveTextContent('Refund requested');
      expect(payment('ORD-3003')).toHaveTextContent('Not recorded');
    });

    it('filters by payment status (server-side, kept in the URL) and clears with the other filters', async () => {
      const { user } = renderPage();
      await screen.findByRole('table');
      const paymentFilter = screen.getByLabelText('Filter by payment status');
      expect(within(paymentFilter).getAllByRole('option').map((o) => o.textContent)).toEqual([
        'All payments',
        'Pending',
        'Paid',
        'Failed',
        'Refund requested',
        'Refund initiated',
        'Refund failed',
        'Refunded',
        'Cancelled',
      ]);

      await user.selectOptions(paymentFilter, 'REFUND_REQUESTED');
      await waitFor(() => expect(lastListParams()).toMatchObject({ paymentStatus: 'REFUND_REQUESTED', page: 0 }));
      expect(currentUrl()).toBe('/order-tracking?payment=REFUND_REQUESTED');

      // An icon-only ✕ button, named for screen readers and with a tooltip.
      const clear = screen.getByRole('button', { name: 'Clear filters' });
      expect(clear).toHaveTextContent('');
      expect(clear).toHaveAttribute('title', 'Clear filters');
      await user.click(clear);
      await waitFor(() => expect(lastListParams()).toMatchObject({ paymentStatus: '' }));
      expect(currentUrl()).toBe('/order-tracking');
    });

    it('reads the payment filter from the URL, case-insensitively', async () => {
      renderPage('/order-tracking?payment=paid&status=PACKED');
      await screen.findByRole('table');
      expect(lastListParams()).toMatchObject({ paymentStatus: 'PAID', status: 'PACKED' });
      expect(screen.getByLabelText('Filter by payment status')).toHaveValue('PAID');
    });

    it('ignores a payment filter value it does not know', async () => {
      renderPage('/order-tracking?payment=BOGUS');
      await screen.findByRole('table');
      expect(lastListParams()).toMatchObject({ paymentStatus: '' });
    });

    it('sends the date range and sort, and blocks an inverted range client-side', async () => {
      const { user } = renderPage();
      await screen.findByRole('table');

      await user.selectOptions(screen.getByLabelText('Sort orders'), 'totalAmount,desc');
      await waitFor(() => expect(lastListParams()?.sort).toBe('totalAmount,desc'));

      await user.type(screen.getByLabelText('From date'), '2026-10-05');
      await user.type(screen.getByLabelText('To date'), '2026-10-01');
      expect(await screen.findByText('"From date" must be on or before "To date".')).toBeInTheDocument();
      expect(api.listOrders.mock.calls.some(([p]) => p.fromDate === '2026-10-05' && p.toDate === '2026-10-01')).toBe(false);

      await user.clear(screen.getByLabelText('To date'));
      await user.type(screen.getByLabelText('To date'), '2026-10-31');
      await waitFor(() => expect(lastListParams()).toMatchObject({ fromDate: '2026-10-05', toDate: '2026-10-31' }));
    });

    it('pages through results', async () => {
      api.listOrders.mockResolvedValue(page([SUMMARY], { totalPages: 2, totalElements: 21, last: false }));
      const { user } = renderPage();
      await screen.findByText('Page 1 of 2');
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Next page' }));
      await waitFor(() => expect(lastListParams()?.page).toBe(1));
    });

    it('shows a retryable error on server failure and recovers on retry', async () => {
      api.listOrders.mockRejectedValueOnce(axiosError(500)).mockResolvedValueOnce(page([SUMMARY]));
      const { user } = renderPage();
      expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Retry' }));
      expect(await screen.findByRole('table')).toBeInTheDocument();
    });

    it('shows a retryable error on network failure', async () => {
      api.listOrders.mockRejectedValue(networkError());
      renderPage();
      expect(await screen.findByText('Unable to reach the server')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('shows a permission message on 403 without retry and without logging out', async () => {
      api.listOrders.mockRejectedValue(axiosError(403, { message: 'Access denied' }));
      renderPage();
      expect(await screen.findByText('Permission denied')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('shows the backend validation message for a rejected query (400)', async () => {
      api.listOrders.mockRejectedValue(
        axiosError(400, { message: 'Validation failed', errors: [{ field: 'sort', message: 'Unsupported sort field or format.' }] })
      );
      renderPage();
      // Field errors are shown (each as its own alert) instead of the generic summary.
      const alerts = await screen.findByRole('list', { name: 'Notifications' });
      expect(within(alerts).getByText('Unsupported sort field or format.')).toBeInTheDocument();
      expect(within(alerts).queryByText('Validation failed')).not.toBeInTheDocument();
      expect(screen.getByText('Request rejected')).toBeInTheDocument();
    });
  });

  describe('order detail and history', () => {
    it('shows order status, current tracking, last update and the timeline oldest-first with updaters', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);

      expect(api.getOrder).toHaveBeenCalledWith('ORD-1001');
      expect(within(panel).getByTestId('order-status')).toHaveTextContent('Packed');
      expect(within(panel).getByTestId('current-tracking')).toHaveTextContent('Packed');
      expect(within(panel).getByTestId('last-updated')).toHaveTextContent('by admin_l1');
      expect(within(panel).getByText('Leave at reception')).toBeInTheDocument();

      const items = historyItems(panel);
      expect(items.map((li) => li.textContent)).toEqual([
        expect.stringContaining('Order Received'),
        expect.stringContaining('Confirmed'),
        expect.stringContaining('Packed'),
      ]);
      expect(items[2]).toHaveAttribute('data-current', 'true');
      expect(within(items[2]).getByText('Current')).toBeInTheDocument();
      expect(items[2]).toHaveTextContent('by admin_l1');
      expect(items[0]).toHaveAttribute('data-current', 'false');
      // Pre-audit record.
      expect(within(items[0]).getByText('Unknown / historical update')).toBeInTheDocument();
    });

    it('shows "Order not found" when the detail request returns 404', async () => {
      api.getOrder.mockRejectedValue(axiosError(404, { message: 'Order not found', errorCode: 'ORDER_NOT_FOUND' }));
      const { user } = renderPage();
      const table = await screen.findByRole('table');
      await user.click(within(table).getByRole('link', { name: 'ORD-1001' }));
      const panel = detailPage();
      expect(await within(panel).findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
    });
  });

  describe('status changes', () => {
    it('offers only the valid next steps as cards — no list of every status', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user); // current: PACKED
      expect(within(panel).queryByRole('combobox')).not.toBeInTheDocument();
      expect(stepValues(panel)).toEqual(['SHIPPED', 'CANCELLED']);
      expect(within(panel).getByRole('radio', { name: /Mark shipped/ })).toBeInTheDocument();
      expect(within(panel).getByText('Handed over to the courier.')).toBeInTheDocument();
    });

    it('does not offer a step the server does not support yet', async () => {
      api.getTrackingStatuses.mockResolvedValue(ok(STATUSES.filter((s) => s.status !== 'SHIPPED')));
      const { user } = renderPage();
      const panel = await openOrder(user);
      expect(stepValues(panel)).toEqual(['CANCELLED']);
    });

    it('keeps actions disabled with a retry when the status list fails to load', async () => {
      api.getTrackingStatuses.mockRejectedValueOnce(axiosError(500)).mockResolvedValueOnce(ok(STATUSES));
      const { user } = renderPage('/order-tracking/ORD-1001');
      const panel = detailPage();

      expect(await within(panel).findByText('Status options could not be loaded.')).toBeInTheDocument();
      expect(updateButton(panel)).toBeDisabled();

      await user.click(within(panel).getByRole('button', { name: 'Retry' }));
      await waitFor(() => expect(within(panel).getByLabelText('Notes')).toBeEnabled());
      // Still disabled until a step is chosen.
      expect(updateButton(panel)).toBeDisabled();
      await chooseStep(user, panel, 'SHIPPED');
      expect(updateButton(panel)).toBeEnabled();
    });

    it('requires a step and sends nothing without one', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);
      expect(updateButton(panel)).toBeDisabled();
      await user.click(updateButton(panel));
      expect(api.updateTracking).not.toHaveBeenCalled();
    });

    it('sends one PATCH /tracking with { status, trimmed notes }', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseStep(user, panel, 'SHIPPED');
      await user.type(within(panel).getByLabelText('Notes'), '   Handed to courier   ');
      await user.click(updateButton(panel));

      await waitFor(() => expect(api.updateTracking).toHaveBeenCalledTimes(1));
      expect(api.updateTracking).toHaveBeenCalledWith('ORD-1001', { status: 'SHIPPED', notes: 'Handed to courier' });
    });

    it('sends blank notes as null', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);
      await chooseStep(user, panel, 'SHIPPED');
      await user.type(within(panel).getByLabelText('Notes'), '    ');
      await user.click(updateButton(panel));
      await waitFor(() => expect(api.updateTracking).toHaveBeenCalledWith('ORD-1001', { status: 'SHIPPED', notes: null }));
    });

    it('asks for confirmation before cancelling and sends nothing if dismissed', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseStep(user, panel, 'CANCELLED');
      await user.click(updateButton(panel));
      expect(await screen.findByText(/will be cancelled\. It can never move forward/)).toBeInTheDocument();
      expect(screen.getByText(/the payment will then be refunded/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText(/will be cancelled/)).not.toBeInTheDocument();
      expect(api.updateTracking).not.toHaveBeenCalled();

      await user.click(updateButton(panel));
      await user.click(await screen.findByRole('button', { name: 'Yes, Cancel' }));
      await waitFor(() => expect(api.updateTracking).toHaveBeenCalledTimes(1));
      expect(api.updateTracking).toHaveBeenCalledWith('ORD-1001', { status: 'CANCELLED', notes: null });
    });

    it('asks for confirmation before marking delivered', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('OUT_FOR_DELIVERY')));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseStep(user, panel, 'DELIVERED');
      await user.click(updateButton(panel));
      expect(await screen.findByText('Move order to "Delivered"?')).toBeInTheDocument();
      expect(api.updateTracking).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      await waitFor(() => expect(api.updateTracking).toHaveBeenCalledWith('ORD-1001', { status: 'DELIVERED', notes: null }));
    });

    it('on success shows the API message and re-fetches the order, displaying only server values', async () => {
      const refreshedHistory = [
        ...HISTORY.map((e) => ({ ...e, current: false })),
        entry(4, 'SHIPPED', '2026-10-03T09:00:00', { current: true, updatedBy: 'admin_l2', notes: 'Handed to courier' }),
      ];
      api.getOrder
        .mockResolvedValueOnce(ok(DETAIL))
        .mockResolvedValueOnce(ok({ ...DETAIL, orderStatus: 'SHIPPED', updatedBy: 'admin_l2', updatedAt: '2026-10-03T09:00:00', tracking: refreshedHistory }));
      // The PATCH response's audit fields must not be used to fabricate the display.
      api.updateTracking.mockResolvedValue(
        ok({ ...entry(99, 'SHIPPED', '2099-01-01T00:00:00', { current: true, updatedBy: 'not-from-refresh' }) }, 'Order status updated successfully')
      );
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseStep(user, panel, 'SHIPPED');
      await user.click(updateButton(panel));

      expect(await screen.findByText('Order status updated successfully')).toBeInTheDocument();
      await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));

      const stillOpen = detailPage();
      await waitFor(() => expect(within(stillOpen).getByTestId('order-status')).toHaveTextContent('Shipped'));
      expect(within(stillOpen).getByTestId('current-tracking')).toHaveTextContent('Shipped');
      expect(within(stillOpen).getByTestId('last-updated')).toHaveTextContent('by admin_l2');

      const items = historyItems(stillOpen);
      expect(items).toHaveLength(4);
      expect(items[3]).toHaveAttribute('data-current', 'true');
      expect(items[3]).toHaveTextContent('by admin_l2');
      expect(stillOpen).not.toHaveTextContent('not-from-refresh');
      // The next steps now follow Shipped.
      await waitFor(() => expect(stepValues(stillOpen)).toEqual(['IN_TRANSIT', 'OUT_FOR_DELIVERY']));
    });

    it('prevents duplicate submissions while saving', async () => {
      let resolve!: (value: ApiResponse<OrderTrackingEntry>) => void;
      api.updateTracking.mockImplementation(() => new Promise((r) => (resolve = r)));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseStep(user, panel, 'SHIPPED');
      await user.click(updateButton(panel));
      await user.click(within(panel).getByRole('button', { name: /Saving/ }));

      expect(api.updateTracking).toHaveBeenCalledTimes(1);
      expect(within(panel).getByRole('button', { name: /Saving/ })).toBeDisabled();
      resolve(trackingOk('done'));
      // Back to idle; disabled again until the next step is chosen.
      expect(await within(panel).findByRole('button', { name: 'Update status' })).toBeDisabled();
    });

    it('on 403 shows the permission message and keeps the user signed in', async () => {
      api.updateTracking.mockRejectedValue(axiosError(403, { message: 'You do not have permission to perform this action.' }));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseStep(user, panel, 'SHIPPED');
      await user.click(updateButton(panel));

      expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(detailPage()).toBeInTheDocument();
    });

    it('on 400 shows the backend message and field errors', async () => {
      api.updateTracking.mockRejectedValue(
        axiosError(400, { message: 'Validation failed', errors: [{ field: 'notes', message: 'Notes must be at most 500 characters.' }] })
      );
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseStep(user, panel, 'SHIPPED');
      await user.click(updateButton(panel));

      const alerts = await screen.findByRole('list', { name: 'Notifications' });
      expect(within(alerts).getByText('Notes must be at most 500 characters.')).toBeInTheDocument();
      expect(within(alerts).queryByText('Validation failed')).not.toBeInTheDocument();
      expect(await within(panel).findByText('Notes must be at most 500 characters.')).toBeInTheDocument();
    });

    it('on 404 shows the backend "not found" message', async () => {
      api.updateTracking.mockRejectedValue(axiosError(404, { message: 'Order not found', errorCode: 'ORDER_NOT_FOUND' }));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseStep(user, panel, 'SHIPPED');
      await user.click(updateButton(panel));

      expect(await screen.findByText('Order not found')).toBeInTheDocument();
    });

    it('on 5xx shows a generic, retryable failure and keeps the choice', async () => {
      api.updateTracking.mockRejectedValue(axiosError(500));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseStep(user, panel, 'SHIPPED');
      await user.click(updateButton(panel));

      expect(await screen.findByText('Request failed')).toBeInTheDocument();
      expect(within(panel).getByRole('radio', { name: /Mark shipped/ })).toBeChecked();
      expect(updateButton(panel)).toBeEnabled();
    });

    it('hides the status actions for a role without the permission (UX only)', async () => {
      useAuthStore.setState({
        user: { userId: 9, username: 'viewer', email: 'v@tinqa.com', role: 'VIEWER', authClient: 'web', isFirstLogin: false, permissions: [] },
      });
      const { user } = renderPage();
      const table = await screen.findByRole('table');
      await user.click(within(table).getByRole('link', { name: 'ORD-1001' }));
      const panel = detailPage();
      await within(panel).findByRole('list', { name: 'Tracking history' });
      expect(within(panel).queryByRole('radiogroup', { name: 'Next step' })).not.toBeInTheDocument();
      expect(within(panel).queryByRole('button', { name: 'Update status' })).not.toBeInTheDocument();
    });
  });

  describe('stage-based status rules', () => {
    it('does not offer Confirmed until the order is fully paid, and says why', async () => {
      api.getOrder.mockResolvedValue(ok({ ...withCurrent('ORDER_RECEIVED'), paymentStatus: 'PENDING' }));
      renderPage('/order-tracking/ORD-1001');
      const panel = detailPage();
      await within(panel).findByRole('radiogroup', { name: 'Next step' });
      expect(stepValues(panel)).not.toContain('CONFIRMED');
      expect(stepValues(panel)).toContain('CANCELLED');
      expect(within(panel).getByRole('note', { name: 'Payment required' })).toHaveTextContent(
        "This order can't be confirmed until it is fully paid (payment status: pending)."
      );
    });

    it('offers Confirmed for a paid order, with no payment notice', async () => {
      api.getOrder.mockResolvedValue(ok({ ...withCurrent('ORDER_RECEIVED'), paymentStatus: 'PAID' }));
      renderPage('/order-tracking/ORD-1001');
      const panel = detailPage();
      await within(panel).findByRole('radiogroup', { name: 'Next step' });
      expect(stepValues(panel)).toContain('CONFIRMED');
      expect(within(panel).queryByRole('note', { name: 'Payment required' })).not.toBeInTheDocument();
    });

    it('shows the order stage with the current stage highlighted', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user); // PACKED → Fulfilment
      const stage = within(panel).getByLabelText('Order stage');
      expect(stage).toHaveAttribute('data-stage', 'FULFILMENT');
      expect(within(stage).getByText('Fulfilment').closest('li')).toHaveAttribute('aria-current', 'step');
      expect(within(stage).getByText('Confirmed').closest('li')).toHaveAttribute('data-done', 'true');
    });

    it('locks a cancelled, unpaid order: no update form, no requests possible', async () => {
      api.getOrder.mockResolvedValue(ok({ ...withCurrent('CANCELLED'), paymentStatus: 'PENDING' }));
      const { user } = renderPage();
      const table = await screen.findByRole('table');
      await user.click(within(table).getByRole('link', { name: 'ORD-1001' }));
      const panel = detailPage();

      const locked = await within(panel).findByRole('status', { name: 'Status locked' });
      expect(locked).toHaveTextContent('This order is cancelled');
      expect(within(panel).queryByRole('radiogroup', { name: 'Next step' })).not.toBeInTheDocument();
      expect(within(panel).getByLabelText('Order stage')).toHaveAttribute('data-stage', 'CANCELLED');
      expect(api.updateTracking).not.toHaveBeenCalled();
    });

    it('a paid order cancelled before confirmation shows the customer\'s reason and is refunded from the Refunds section, not the form', async () => {
      // Paid, cancelled by the customer before any admin confirmed it.
      const cancelled: AdminOrderDetail = {
        ...DETAIL,
        orderStatus: 'CANCELLED',
        paymentStatus: 'PAID',
        tracking: [
          entry(1, 'ORDER_RECEIVED', '2026-10-01T09:00:00'),
          entry(2, 'CANCELLED', '2026-10-01T11:00:00', { current: true, updatedBy: 'asha@example.com', notes: 'Ordered the wrong size by mistake' }),
        ],
      };
      api.getOrder.mockResolvedValue(ok(cancelled));
      renderPage('/order-tracking/ORD-1001');
      const panel = detailPage();

      const reason = await within(panel).findByRole('region', { name: 'Cancellation' });
      expect(within(reason).getByTestId('cancellation-reason')).toHaveTextContent('Ordered the wrong size by mistake');
      expect(reason).toHaveTextContent('by asha@example.com');
      expect(reason).toHaveTextContent('Check the reason, then use Request refund in the Refunds section');

      const stage = within(panel).getByLabelText('Order stage');
      expect(stage).toHaveAttribute('data-stage', 'CANCELLED');
      const refund = within(stage).getByRole('list', { name: 'Refund stages' });
      expect(within(refund).getByText('Cancelled').closest('li')).toHaveAttribute('aria-current', 'step');

      // The status form never offers "Refund requested"; it points to the Refunds section instead.
      const locked = await within(panel).findByRole('status', { name: 'Status locked' });
      expect(locked).toHaveTextContent('To refund the customer, use Request refund in the Refunds section.');
      expect(within(panel).queryByRole('radiogroup', { name: 'Next step' })).not.toBeInTheDocument();
      expect(api.updateTracking).not.toHaveBeenCalled();
    });

    it.each([
      ['REFUND_REQUESTED', 'REFUND_REQUESTED', 'An approver approves or rejects it in the Refunds section'],
      ['REFUND_INITIATED', 'REFUND_REQUESTED', 'The refund is with Razorpay'],
      ['REFUND_FAILED', 'REFUND_FAILED', 'It can be requested again'],
    ])('an order at %s points to the Refunds section; the cancellation reason and refund track stay visible', async (status, paymentStatus, text) => {
      const history = [
        entry(1, 'ORDER_RECEIVED', '2026-10-01T09:00:00'),
        entry(2, 'CANCELLED', '2026-10-01T11:00:00', { notes: 'Found it cheaper elsewhere' }),
        entry(3, status, '2026-10-01T12:00:00', { current: true }),
      ];
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, orderStatus: status, paymentStatus, tracking: history }));
      renderPage('/order-tracking/ORD-1001');
      const panel = detailPage();

      expect(await within(panel).findByRole('status', { name: 'Status locked' })).toHaveTextContent(text);
      expect(within(panel).getByTestId('cancellation-reason')).toHaveTextContent('Found it cheaper elsewhere');
      expect(within(within(panel).getByLabelText('Order stage')).getByRole('list', { name: 'Refund stages' })).toBeInTheDocument();
      expect(within(panel).queryByRole('radiogroup', { name: 'Next step' })).not.toBeInTheDocument();
    });

    it('a cancelled unpaid order has no refund track and no cancellation refund prompt', async () => {
      api.getOrder.mockResolvedValue(ok({ ...withCurrent('CANCELLED'), paymentStatus: 'PENDING' }));
      renderPage('/order-tracking/ORD-1001');
      const panel = detailPage();
      await within(panel).findByRole('status', { name: 'Status locked' });
      expect(within(panel).queryByRole('list', { name: 'Refund stages' })).not.toBeInTheDocument();
      expect(within(panel).getByRole('region', { name: 'Cancellation' })).not.toHaveTextContent('record the refund request');
    });

    it.each([
      ['RETURN_COMPLETED', 'return for this order is completed'],
      ['REFUND_COMPLETED', 'refund for this order is completed'],
      ['RETURN_REJECTED', 'return request was rejected'],
    ])('locks an order closed as %s', async (status, text) => {
      api.getOrder.mockResolvedValue(ok(withCurrent(status)));
      const { user } = renderPage();
      const table = await screen.findByRole('table');
      await user.click(within(table).getByRole('link', { name: 'ORD-1001' }));
      const panel = detailPage();
      expect(await within(panel).findByRole('status', { name: 'Status locked' })).toHaveTextContent(text);
    });

    it('once out for delivery: no cancelling and no going back — deliver or record a failed attempt', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('OUT_FOR_DELIVERY')));
      const { user } = renderPage();
      const panel = await openOrder(user);
      expect(stepValues(panel)).toEqual(['DELIVERED', 'DELIVERY_FAILED', 'CUSTOMER_UNAVAILABLE', 'INVALID_ADDRESS', 'CUSTOMER_CANCELLED_DELIVERY']);
      expect(within(panel).getByLabelText('Order stage')).toHaveAttribute('data-stage', 'DELIVERY');
    });

    it('a failed delivery is re-attempted or sent back to the warehouse', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('DELIVERY_FAILED')));
      const { user } = renderPage();
      const panel = await openOrder(user);
      expect(stepValues(panel)).toEqual(['OUT_FOR_DELIVERY', 'DELIVERY_REATTEMPT', 'RETURN_IN_TRANSIT']);
    });

    it('after delivery only a return can be requested', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('DELIVERED')));
      const { user } = renderPage();
      const panel = await openOrder(user);
      expect(stepValues(panel)).toEqual(['RETURN_REQUESTED']);
    });

    it('shows the return track while a return is in progress', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('RETURN_RECEIVED')));
      const { user } = renderPage();
      const panel = await openOrder(user);
      const stage = within(panel).getByLabelText('Order stage');
      expect(stage).toHaveAttribute('data-stage', 'RETURNS');
      const returnTrack = within(stage).getByRole('list', { name: 'Return stages' });
      expect(within(returnTrack).getByText('At warehouse').closest('li')).toHaveAttribute('aria-current', 'step');
      expect(stepValues(panel)).toEqual(['RETURN_INSPECTION']);
    });

    it('after inspection a paid return can only fail inspection here; the refund goes through the Refunds section', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('RETURN_INSPECTION')));
      const { user } = renderPage();
      const panel = await openOrder(user);
      expect(stepValues(panel)).toEqual(['RETURN_INSPECTION_FAILED']);
      expect(within(panel).getByRole('note', { name: 'Refund handled separately' })).toHaveTextContent('use Request refund in the Refunds section');
    });

    it('on 409 (order changed elsewhere) shows the message and reloads the order', async () => {
      api.updateTracking.mockRejectedValue(
        axiosError(409, { message: 'Invalid status transition from CANCELLED to SHIPPED', errorCode: 'INVALID_STATUS_TRANSITION' })
      );
      const { user } = renderPage();
      const panel = await openOrder(user);
      expect(api.getOrder).toHaveBeenCalledTimes(1);

      await chooseStep(user, panel, 'SHIPPED');
      await user.click(updateButton(panel));

      expect(await screen.findByText('Invalid status transition from CANCELLED to SHIPPED')).toBeInTheDocument();
      await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));
    });
  });

  describe('payment', () => {
    const paymentSection = (panel: HTMLElement) => within(panel).getByRole('region', { name: 'Payment' });

    it('shows the order payment status and method from the detail response', async () => {
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, paymentMethod: 'RAZORPAY', paymentStatus: 'PAID' }));
      const { user } = renderPage();
      const section = paymentSection(await openOrder(user));
      expect(within(section).getByTestId('payment-status')).toHaveTextContent('Paid');
      expect(within(section).getByTestId('payment-method')).toHaveTextContent('Razorpay');
    });

    it.each([
      ['FAILED', 'Failed'],
      ['REFUND_REQUESTED', 'Refund requested'],
      ['REFUND_INITIATED', 'Refund initiated'],
      ['REFUNDED', 'Refunded'],
      ['CANCELLED', 'Cancelled'],
      ['PENDING', 'Pending'],
    ])('labels payment status %s as "%s"', async (paymentStatus, label) => {
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, paymentMethod: 'RAZORPAY', paymentStatus }));
      const { user } = renderPage();
      const section = paymentSection(await openOrder(user));
      expect(within(section).getByTestId('payment-status')).toHaveTextContent(label);
    });

    it('says "Not recorded" instead of inventing values when status and method are missing', async () => {
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, paymentMethod: null, paymentStatus: null }));
      const { user } = renderPage();
      const section = paymentSection(await openOrder(user));
      expect(within(section).getByTestId('payment-status')).toHaveTextContent('Not recorded');
      expect(within(section).getByTestId('payment-method')).toHaveTextContent('Not recorded');
      expect(section).not.toHaveTextContent('null');
    });

    const attempt = (overrides: Partial<OrderPaymentAttempt>): OrderPaymentAttempt => ({
      provider: 'RAZORPAY',
      status: 'CREATED',
      transactionId: null,
      paymentInstrument: null,
      amountPaise: 229700,
      currency: 'INR',
      createdAt: '2026-10-06T10:00:00',
      paidAt: null,
      ...overrides,
    });
    const PAID_ATTEMPT = attempt({
      status: 'PAID',
      transactionId: 'pay_TEST123',
      paymentInstrument: 'UPI',
      createdAt: '2026-10-06T10:15:00',
      paidAt: '2026-10-06T10:20:00',
    });

    it('shows the transaction ID, payment date and amount (paise → rupees) for a paid order', async () => {
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, paymentMethod: 'RAZORPAY', paymentStatus: 'PAID', payments: [PAID_ATTEMPT] }));
      const { user } = renderPage();
      const section = paymentSection(await openOrder(user));
      expect(within(section).getByTestId('payment-transaction-id')).toHaveTextContent('pay_TEST123');
      expect(within(section).getByTestId('payment-date')).toHaveTextContent(formatDateTime('2026-10-06T10:20:00'));
      expect(within(section).getByTestId('payment-amount')).toHaveTextContent('₹2,297.00');
      expect(within(section).getByTestId('payment-amount')).not.toHaveTextContent('2,29,700');
      expect(within(section).getByTestId('payment-method')).toHaveTextContent('Razorpay · UPI');
    });

    it('lists every attempt of a failed-then-retried payment and uses the paid one for the summary', async () => {
      const failed = attempt({ status: 'FAILED', transactionId: 'pay_FAILED1', createdAt: '2026-10-06T10:00:00' });
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, paymentStatus: 'PAID', payments: [failed, PAID_ATTEMPT] }));
      const { user } = renderPage();
      const section = paymentSection(await openOrder(user));
      expect(within(section).getByTestId('payment-transaction-id')).toHaveTextContent('pay_TEST123');

      const rows = within(within(section).getByRole('table', { name: 'Payment attempts' })).getAllByRole('row').slice(1);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('Failed');
      expect(rows[0]).toHaveTextContent('pay_FAILED1');
      expect(rows[0]).toHaveTextContent('₹2,297.00');
      expect(rows[1]).toHaveTextContent('Paid');
      expect(rows[1]).toHaveTextContent('pay_TEST123');
      expect(rows[1]).toHaveTextContent(formatDateTime('2026-10-06T10:20:00'));
    });

    it('shows "Not paid yet" when no attempt has succeeded, and dashes for missing IDs and dates', async () => {
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, paymentStatus: 'PENDING', payments: [attempt({ status: 'CREATED' })] }));
      const { user } = renderPage();
      const section = paymentSection(await openOrder(user));
      expect(within(section).getByTestId('payment-transaction-id')).toHaveTextContent('Not paid yet');
      expect(within(section).getByTestId('payment-date')).toHaveTextContent('Not paid yet');
      const row = within(within(section).getByRole('table', { name: 'Payment attempts' })).getAllByRole('row')[1];
      expect(row).toHaveTextContent('Created');
      expect(row).not.toHaveTextContent('null');
    });

    it('says so when the order has no payment attempts', async () => {
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, paymentStatus: 'PENDING', payments: [] }));
      const { user } = renderPage();
      const section = paymentSection(await openOrder(user));
      expect(within(section).getByText('No payment attempts recorded for this order.')).toBeInTheDocument();
      expect(within(section).queryByRole('table')).not.toBeInTheDocument();
    });

    it('explains when the server does not send transaction details, rather than implying there were none', async () => {
      // Older backend: AdminOrderDetailDTO without `payments`.
      const { user } = renderPage();
      const section = paymentSection(await openOrder(user));
      expect(within(section).getByText("Transaction details aren't available from the server yet.")).toBeInTheDocument();
      expect(within(section).queryByTestId('payment-transaction-id')).not.toBeInTheDocument();
    });

    it('is not rendered when the order fails to load', async () => {
      api.getOrder.mockRejectedValue(axiosError(404, { message: 'Order not found', errorCode: 'ORDER_NOT_FOUND' }));
      renderPage('/order-tracking/ORD-1001');
      const panel = detailPage();
      expect(await within(panel).findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
      expect(within(panel).queryByRole('region', { name: 'Payment' })).not.toBeInTheDocument();
    });
  });

  describe('shipping address', () => {
    const ADDRESS = {
      recipientName: 'Asha Verma',
      phoneNumber: '+91 98765 43210',
      addressLine1: '12 MG Road',
      addressLine2: 'Near City Mall',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    };

    it('reveals the order\'s shipping address when the link is clicked, and hides it again', async () => {
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, shippingAddress: ADDRESS }));
      const { user } = renderPage();
      const panel = await openOrder(user);

      const link = within(panel).getByRole('button', { name: 'Shipping address' });
      expect(link).toHaveAttribute('aria-expanded', 'false');
      expect(within(panel).queryByLabelText('Shipping address', { selector: 'address' })).not.toBeInTheDocument();

      await user.click(link);
      expect(link).toHaveAttribute('aria-expanded', 'true');
      const address = within(panel).getByLabelText('Shipping address', { selector: 'address' });
      expect(address).toHaveTextContent('Asha Verma');
      expect(address).toHaveTextContent('12 MG Road');
      expect(address).toHaveTextContent('Near City Mall');
      expect(address).toHaveTextContent('Bengaluru, Karnataka, 560001');
      expect(address).toHaveTextContent('India');
      expect(within(address).getByRole('link', { name: /98765 43210/ })).toHaveAttribute('href', 'tel:+919876543210');

      await user.click(link);
      expect(within(panel).queryByLabelText('Shipping address', { selector: 'address' })).not.toBeInTheDocument();
    });

    it('explains when the server does not send the address yet, without inventing one', async () => {
      // Current backend: AdminOrderDetailDTO has addressId but no shippingAddress.
      const { user } = renderPage();
      const panel = await openOrder(user);
      await user.click(within(panel).getByRole('button', { name: 'Shipping address' }));
      expect(within(panel).getByText(/isn't available from the server yet \(customer address #5\)/)).toBeInTheDocument();
    });

    it('says so when the order has no address recorded', async () => {
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, shippingAddress: null }));
      const { user } = renderPage();
      const panel = await openOrder(user);
      await user.click(within(panel).getByRole('button', { name: 'Shipping address' }));
      expect(within(panel).getByText('No shipping address was recorded for this order.')).toBeInTheDocument();
    });

    it('skips empty address lines', async () => {
      api.getOrder.mockResolvedValue(ok({ ...DETAIL, shippingAddress: { ...ADDRESS, addressLine2: null, phoneNumber: null } }));
      const { user } = renderPage();
      const panel = await openOrder(user);
      await user.click(within(panel).getByRole('button', { name: 'Shipping address' }));
      const address = within(panel).getByLabelText('Shipping address', { selector: 'address' });
      expect(address).not.toHaveTextContent('null');
      expect(within(address).queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('list ↔ detail navigation', () => {
    it('opens the full-page detail when any part of a row is clicked, replacing the list', async () => {
      const { user } = renderPage();
      const table = await screen.findByRole('table');
      const row = within(table).getByRole('link', { name: 'ORD-1001' }).closest('tr')!;

      await user.click(within(row).getByText('Asha Verma')); // not the link itself

      expect(currentUrl()).toBe('/order-tracking/ORD-1001');
      expect(detailPage()).toBeInTheDocument();
      // The list (and its filters) is replaced, not shown alongside.
      expect(screen.queryByLabelText('Search orders')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to orders' })).toBeInTheDocument();
    });

    it('keeps filters and page in the URL so they survive navigation and refresh', async () => {
      renderPage('/order-tracking?q=asha&status=PACKED&sort=totalAmount%2Cdesc&page=2');
      await screen.findByRole('table');
      expect(api.listOrders).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'asha', status: 'PACKED', sort: 'totalAmount,desc', page: 2 })
      );
      expect(screen.getByLabelText('Search orders')).toHaveValue('asha');
      expect(screen.getByLabelText('Filter by status')).toHaveValue('PACKED');
    });

    it('writes filter changes to the URL and resets the page', async () => {
      const { user } = renderPage('/order-tracking?page=3');
      await screen.findByRole('table');
      await user.selectOptions(screen.getByLabelText('Filter by status'), 'DELIVERED');
      expect(currentUrl()).toBe('/order-tracking?status=DELIVERED');
    });

    it('Back returns to the same list view — filters, page, scroll position — and highlights the order', async () => {
      api.listOrders.mockResolvedValue(page([SUMMARY, LEGACY], { totalPages: 3, totalElements: 45, last: false, number: 1 }));
      const { user } = renderPage('/order-tracking?status=PACKED&page=1');
      const table = await screen.findByRole('table');

      // Admin has scrolled down the list before opening an order.
      Object.defineProperty(window, 'scrollY', { value: 1234, configurable: true });
      await user.click(within(table).getByRole('link', { name: 'ORD-2002' }));
      expect(currentUrl()).toBe('/order-tracking/ORD-2002');
      expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0); // detail starts at the top

      const callsBeforeBack = api.listOrders.mock.calls.length;
      // The background refresh never answers here, so anything shown must come from the cache.
      api.listOrders.mockReturnValue(new Promise(() => {}));
      await user.click(screen.getByRole('button', { name: 'Back to orders' }));

      expect(currentUrl()).toBe('/order-tracking?status=PACKED&page=1');
      // Shown instantly from cache (no loading state), then refreshed in the background.
      expect(screen.queryByText('Loading orders...')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Filter by status')).toHaveValue('PACKED');
      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
      expect(window.scrollTo).toHaveBeenLastCalledWith(0, 1234);
      const returnedTable = screen.getByRole('table');
      expect(within(returnedTable).getByRole('link', { name: 'ORD-2002' }).closest('tr')).toHaveAttribute('data-highlighted', 'true');
      await waitFor(() => expect(api.listOrders.mock.calls.length).toBe(callsBeforeBack + 1));
      expect(lastListParams()).toMatchObject({ status: 'PACKED', page: 1 });
    });

    it('a detail page opened directly goes back to the order list', async () => {
      const { user } = renderPage('/order-tracking/ORD-1001');
      expect(await within(detailPage()).findByRole('list', { name: 'Tracking history' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Back to orders' }));
      expect(currentUrl()).toBe('/order-tracking');
      expect(await screen.findByRole('table')).toBeInTheDocument();
    });

    it('does not apply a saved position to a different list view', async () => {
      sessionStorage.setItem(
        'tinqa.listPosition.orderTracking',
        JSON.stringify({ search: '?status=PACKED', scrollY: 900, itemId: 'ORD-1001' })
      );
      vi.mocked(window.scrollTo).mockClear();
      renderPage('/order-tracking?status=DELIVERED');
      await screen.findByRole('table');
      expect(window.scrollTo).not.toHaveBeenCalledWith(0, 900);
      expect(screen.getByRole('table').querySelector('[data-highlighted]')).toBeNull();
    });

    it('the detail page offers Back even when the order is not found', async () => {
      api.getOrder.mockRejectedValue(axiosError(404, { message: 'Order not found', errorCode: 'ORDER_NOT_FOUND' }));
      renderPage('/order-tracking/ORD-404');
      expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to orders' })).toBeInTheDocument();
    });
  });
});

describe('delivery riders', () => {
  // What the Procurement backend reports for a Delivery Rider: view orders, record delivery outcomes
  const signInAsRider = () =>
    useAuthStore.setState({
      token: 'test-token',
      isAuthenticated: true,
      user: {
        userId: 9,
        username: 'rider1',
        email: 'rider1@tinqa.com',
        role: 'ADMIN_L1',
        authClient: 'web',
        isFirstLogin: false,
        permissions: ['CUSTOMER_ORDER_VIEW', 'DELIVERY_STATUS_UPDATE'],
      },
    });

  const openAsRider = async (status: string) => {
    signInAsRider();
    api.getOrder.mockResolvedValue(ok(withCurrent(status)));
    const { user } = renderPage('/order-tracking/ORD-1001');
    const panel = detailPage();
    await within(panel).findByRole('list', { name: 'Tracking history' });
    return { user, panel };
  };

  it('offers only delivery outcomes, never return to origin or failure codes for the store team', async () => {
    const { panel } = await openAsRider('OUT_FOR_DELIVERY');
    await within(panel).findByRole('radiogroup', { name: 'Next step' });
    expect(within(panel).getByRole('heading', { name: 'Delivery update' })).toBeInTheDocument();
    expect(stepValues(panel)).toEqual(['DELIVERED', 'CUSTOMER_UNAVAILABLE', 'INVALID_ADDRESS', 'CUSTOMER_CANCELLED_DELIVERY']);
  });

  it('re-attempts a delivery after the customer was unavailable', async () => {
    const { user, panel } = await openAsRider('CUSTOMER_UNAVAILABLE');
    await within(panel).findByRole('radiogroup', { name: 'Next step' });
    expect(stepValues(panel)).toEqual(['DELIVERY_REATTEMPT']);

    await chooseStep(user, panel, 'DELIVERY_REATTEMPT');
    await user.type(within(panel).getByLabelText('Notes'), 'Customer asked for tomorrow');
    await user.click(updateButton(panel));

    await waitFor(() =>
      expect(api.updateDeliveryStatus).toHaveBeenCalledWith('ORD-1001', { status: 'DELIVERY_REATTEMPT', notes: 'Customer asked for tomorrow' })
    );
    expect(api.updateTracking).not.toHaveBeenCalled();
  });

  it('confirms before recording that the customer cancelled the delivery', async () => {
    const { user, panel } = await openAsRider('OUT_FOR_DELIVERY');
    await within(panel).findByRole('radiogroup', { name: 'Next step' });

    await chooseStep(user, panel, 'CUSTOMER_CANCELLED_DELIVERY');
    await user.click(updateButton(panel));
    expect(await screen.findByText(/recorded as refused by the customer/)).toBeInTheDocument();
    expect(api.updateDeliveryStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(api.updateDeliveryStatus).toHaveBeenCalledWith('ORD-1001', { status: 'CUSTOMER_CANCELLED_DELIVERY', notes: null })
    );
  });

  it('has nothing to record before the order ships or once it is coming back', async () => {
    for (const status of ['PACKED', 'CUSTOMER_CANCELLED_DELIVERY']) {
      const { panel } = await openAsRider(status);
      expect(await within(panel).findByRole('status', { name: 'No delivery update' })).toHaveTextContent('the store team updates this order');
      expect(within(panel).queryByRole('radiogroup', { name: 'Next step' })).not.toBeInTheDocument();
      cleanup();
    }
    expect(api.updateDeliveryStatus).not.toHaveBeenCalled();
  });

  it('admins who may change any status keep the full set and the general endpoint', async () => {
    api.getOrder.mockResolvedValue(ok(withCurrent('CUSTOMER_UNAVAILABLE')));
    const { user } = renderPage('/order-tracking/ORD-1001');
    const panel = detailPage();
    await within(panel).findByRole('radiogroup', { name: 'Next step' });
    expect(within(panel).getByRole('heading', { name: 'Next step' })).toBeInTheDocument();
    expect(stepValues(panel)).toEqual(['DELIVERY_REATTEMPT', 'RETURN_IN_TRANSIT']);

    await chooseStep(user, panel, 'DELIVERY_REATTEMPT');
    await user.click(updateButton(panel));
    await waitFor(() => expect(api.updateTracking).toHaveBeenCalledWith('ORD-1001', { status: 'DELIVERY_REATTEMPT', notes: null }));
    expect(api.updateDeliveryStatus).not.toHaveBeenCalled();
  });
});

describe('405 METHOD_NOT_ALLOWED handling', () => {
  const RAW = "Request method 'GET' is not supported";
  const methodNotAllowed = () => axiosError(405, { success: false, message: RAW, errorCode: 'METHOD_NOT_ALLOWED' });
  const FRIENDLY = /This action isn't supported by the server/;

  it('order list: shows a friendly, non-retryable state instead of raw framework text', async () => {
    api.listOrders.mockRejectedValue(methodNotAllowed());
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Action not supported' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(await screen.findByText(FRIENDLY)).toBeInTheDocument();
    expect(screen.queryByText(RAW)).not.toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('order detail: shows the same state with a way back, no crash or blank page', async () => {
    api.getOrder.mockRejectedValue(methodNotAllowed());
    renderPage('/order-tracking/ORD-1001');
    expect(await screen.findByRole('heading', { name: 'Action not supported' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to orders' })).toBeInTheDocument();
    expect(screen.queryByText(RAW)).not.toBeInTheDocument();
  });

  it('tracking update (PATCH …/tracking): friendly alert, choice kept, page intact', async () => {
    api.updateTracking.mockRejectedValue(methodNotAllowed());
    const { user } = renderPage();
    const panel = await openOrder(user);
    await chooseStep(user, panel, 'SHIPPED');
    await user.click(updateButton(panel));

    expect(await screen.findByText(FRIENDLY)).toBeInTheDocument();
    expect(screen.queryByText(RAW)).not.toBeInTheDocument();
    expect(within(detailPage()).getByRole('radio', { name: /Mark shipped/ })).toBeChecked();
    expect(within(detailPage()).getByRole('list', { name: 'Tracking history' })).toBeInTheDocument();
    expect(api.getOrder).toHaveBeenCalledTimes(1); // no pointless reload
  });

  it('status options (GET …/tracking-statuses): actions stay disabled with a retry', async () => {
    api.getTrackingStatuses.mockRejectedValue(methodNotAllowed());
    renderPage('/order-tracking/ORD-1001');
    const panel = await screen.findByRole('region', { name: 'Order ORD-1001 details' });
    expect(await within(panel).findByText('Status options could not be loaded.')).toBeInTheDocument();
    expect(updateButton(panel)).toBeDisabled();
  });
});

describe('Pre-order review and approval', () => {
  const PRE_STATUSES = [...STATUSES, { status: 'PRE_ORDER_PENDING', stage: 'PRE_ORDER_PENDING' }, { status: 'PRE_ORDER_CONFIRMED', stage: 'PRE_ORDER_CONFIRMED' }];

  /** A waiting pre-order: 2 × Smart Plug requested (pre-order), 1 × LED Bulb in stock. */
  const preOrder = (overrides: Partial<AdminOrderDetail> = {}, availableStock = 1): AdminOrderDetail => ({
    ...DETAIL,
    orderStatus: 'PRE_ORDER_PENDING',
    preOrderReady: false,
    canApprovePreOrder: false,
    items: [
      { productId: 11, title: 'Smart Plug', price: 999, quantity: 2, totalPrice: 1998, preOrder: true, availableStock },
      { productId: 12, title: 'LED Bulb', price: 299, quantity: 1, totalPrice: 299, preOrder: false },
    ],
    tracking: [
      entry(1, 'PRE_ORDER_RECEIVED', '2026-10-01T09:00:00'),
      entry(2, 'PRE_ORDER_PENDING', '2026-10-01T10:00:00', { current: true }),
    ],
    ...overrides,
  });
  const ready = () => preOrder({ preOrderReady: true, canApprovePreOrder: true }, 5);
  const approved = (): AdminOrderDetail =>
    preOrder({
      orderStatus: 'PRE_ORDER_CONFIRMED',
      preOrderReady: true,
      canApprovePreOrder: false,
      tracking: [
        entry(1, 'PRE_ORDER_RECEIVED', '2026-10-01T09:00:00'),
        entry(2, 'PRE_ORDER_PENDING', '2026-10-01T10:00:00'),
        entry(3, 'PRE_ORDER_CONFIRMED', '2026-10-03T10:00:00', { current: true, notes: 'Pre-order approved after stock availability check.' }),
      ],
    }, 3);

  const card = () => screen.getByRole('region', { name: 'Pre-order review' });
  const approveButton = () => within(card()).getByRole('button', { name: 'Approve pre-order' });

  const openPreOrder = async (detail: AdminOrderDetail) => {
    api.getTrackingStatuses.mockResolvedValue(ok(PRE_STATUSES));
    api.getOrder.mockResolvedValue(ok(detail));
    const ctx = renderPage('/order-tracking/ORD-1001');
    await within(detailPage()).findByRole('region', { name: 'Pre-order review' });
    await within(detailPage()).findByRole('radiogroup', { name: 'Next step' });
    return ctx;
  };

  it('waiting pre-orders are found through the status filter — there is no separate shortcut', async () => {
    api.getTrackingStatuses.mockResolvedValue(ok(PRE_STATUSES));
    const { user } = renderPage('/order-tracking?page=2');
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Waiting pre-orders' })).not.toBeInTheDocument();

    const statusFilter = screen.getByLabelText('Filter by status');
    await waitFor(() => expect(within(statusFilter).getByRole('option', { name: 'Pre Order Pending' })).toBeInTheDocument());
    await user.selectOptions(statusFilter, 'PRE_ORDER_PENDING');
    await waitFor(() => expect(lastListParams()).toMatchObject({ status: 'PRE_ORDER_PENDING', page: 0 }));
    expect(currentUrl()).toBe('/order-tracking?status=PRE_ORDER_PENDING');
  });

  it('shows requested vs. available stock, "Waiting for stock", and a disabled approval when not ready', async () => {
    await openPreOrder(preOrder());
    expect(within(card()).getByTestId('pre-order-readiness')).toHaveTextContent('Waiting for stock');
    const rows = within(within(card()).getByRole('table', { name: 'Pre-order lines' })).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1); // only pre-order lines
    expect(rows[0]).toHaveTextContent('Smart Plug');
    expect(rows[0].children[1]).toHaveTextContent('2'); // requested
    expect(rows[0].children[2]).toHaveTextContent('1'); // available now
    expect(rows[0]).toHaveAttribute('data-short', 'true');
    expect(approveButton()).toBeDisabled();
    expect(card()).toHaveTextContent('Approval becomes available once every pre-order product has enough stock');
    // Customer / payment details are on the same page.
    expect(detailPage()).toHaveTextContent('Asha Verma');
    const payment = within(detailPage()).getByRole('region', { name: 'Payment' });
    expect(payment).toHaveTextContent('UPI');
    expect(payment).toHaveTextContent('Paid');
  });

  it('cannot approve a ready pre-order until it is fully paid', async () => {
    await openPreOrder({ ...ready(), paymentStatus: 'PENDING' });
    expect(approveButton()).toBeDisabled();
    expect(card()).toHaveTextContent("This order can't be confirmed until it is fully paid (payment status: pending).");
    expect(api.approvePreOrder).not.toHaveBeenCalled();
  });

  it('never offers Pre-order Confirmed in the generic status form (approval is a dedicated action)', async () => {
    await openPreOrder(ready());
    expect(stepValues(detailPage())).toEqual(['CANCELLED']);
  });

  it('approves through PATCH …/pre-order/approve after confirmation, then shows the server state', async () => {
    api.approvePreOrder.mockResolvedValue(ok(approved(), 'Pre-order approved successfully'));
    const { user } = await openPreOrder(ready());
    expect(within(card()).getByTestId('pre-order-readiness')).toHaveTextContent('Stock ready');
    api.getOrder.mockResolvedValue(ok(approved()));

    await user.click(approveButton());
    expect(screen.getByText('Approve this pre-order?')).toBeInTheDocument();
    expect(api.approvePreOrder).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(api.approvePreOrder).toHaveBeenCalledTimes(1);
    expect(api.approvePreOrder).toHaveBeenCalledWith('ORD-1001');
    expect(api.updateTracking).not.toHaveBeenCalled();
    expect(await screen.findByText('Pre-order approved successfully')).toBeInTheDocument();

    await waitFor(() => expect(within(detailPage()).getByTestId('order-status')).toHaveTextContent('Pre Order Confirmed'));
    expect(api.getOrder).toHaveBeenCalledTimes(2); // reloaded from the server
    expect(within(card()).getByTestId('pre-order-readiness')).toHaveTextContent('Approved — stock reserved');
    expect(within(card()).queryByRole('button', { name: 'Approve pre-order' })).not.toBeInTheDocument();
    // Normal fulfilment continues through the usual next steps.
    expect(stepValues(detailPage())).toEqual(['PROCESSING', 'CANCELLED']);
  });

  it('on PRE_ORDER_STOCK_NOT_READY: clear message, reload, stays waiting, no success shown', async () => {
    api.approvePreOrder.mockRejectedValue(
      axiosError(409, { message: 'Pre-order items are still waiting for sufficient stock.', errorCode: 'PRE_ORDER_STOCK_NOT_READY' })
    );
    const { user } = await openPreOrder(ready());
    api.getOrder.mockResolvedValue(ok(preOrder({}, 1))); // stock was taken meanwhile

    await user.click(approveButton());
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText(/Not enough stock is available yet to approve this pre-order/)).toBeInTheDocument();
    await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(card()).getByTestId('pre-order-readiness')).toHaveTextContent('Waiting for stock'));
    expect(within(detailPage()).getByTestId('order-status')).toHaveTextContent('Pre Order Pending');
    expect(approveButton()).toBeDisabled();
    expect(screen.queryByText('Pre-order approved successfully')).not.toBeInTheDocument();
    expect(screen.queryByText('Approve this pre-order?')).not.toBeInTheDocument();
  });

  it('on 403: shows the permission message, keeps the page and session, and does not reload', async () => {
    api.approvePreOrder.mockRejectedValue(axiosError(403, { message: 'You do not have permission to perform this action.' }));
    const { user } = await openPreOrder(ready());
    await user.click(approveButton());
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(api.getOrder).toHaveBeenCalledTimes(1);
    expect(within(detailPage()).getByTestId('order-status')).toHaveTextContent('Pre Order Pending');
  });

  it('on another 409 (e.g. already approved elsewhere): shows the server message and reloads the real state', async () => {
    api.approvePreOrder.mockRejectedValue(axiosError(409, { message: 'Only waiting pre-orders can be approved.', errorCode: 'PRE_ORDER_APPROVAL_NOT_ALLOWED' }));
    const { user } = await openPreOrder(ready());
    api.getOrder.mockResolvedValue(ok(approved()));
    await user.click(approveButton());
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Only waiting pre-orders can be approved.')).toBeInTheDocument();
    await waitFor(() => expect(within(detailPage()).getByTestId('order-status')).toHaveTextContent('Pre Order Confirmed'));
  });

  it('on a network failure: shows an error and keeps the order waiting', async () => {
    api.approvePreOrder.mockRejectedValue(networkError());
    const { user } = await openPreOrder(ready());
    await user.click(approveButton());
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Network Error')).toBeInTheDocument();
    expect(approveButton()).toBeEnabled();
  });

  it('hides the approval action for a role that cannot manage order tracking (UX only)', async () => {
    useAuthStore.setState({
      user: { userId: 9, username: 'viewer', email: 'v@tinqa.com', role: 'VIEWER', authClient: 'web', isFirstLogin: false, permissions: [] },
    });
    api.getTrackingStatuses.mockResolvedValue(ok(PRE_STATUSES));
    api.getOrder.mockResolvedValue(ok(ready()));
    renderPage('/order-tracking/ORD-1001');
    const reviewCard = await within(detailPage()).findByRole('region', { name: 'Pre-order review' });
    expect(within(reviewCard).queryByRole('button', { name: 'Approve pre-order' })).not.toBeInTheDocument();
  });
});
