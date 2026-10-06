import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
import { resetTrackingStatusCache } from '../hooks/useTrackingStatuses';
import { resetAdminOrdersCache } from '../hooks/useAdminOrders';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  OrderStatusUpdateResponse,
  OrderTrackingEntry,
  TrackingStatusOption,
} from '../types/orderTracking.types';

// Only the network layer is mocked.
vi.mock('../api/orderTrackingApi', () => ({
  orderTrackingApi: {
    listOrders: vi.fn(),
    getOrder: vi.fn(),
    getTrackingStatuses: vi.fn(),
    updateTracking: vi.fn(),
    setOrderStatus: vi.fn(),
  },
}));

const api = vi.mocked(orderTrackingApi);
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
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RETURN_REQUESTED',
  'RETURN_IN_TRANSIT',
  'RETURN_COMPLETED',
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
  ok<OrderTrackingEntry>(entry(9, 'OUT_FOR_DELIVERY', '2026-10-03T09:00:00', { current: true }), message);

const manualOk = (message = 'Order status updated successfully') =>
  ok<OrderStatusUpdateResponse>({ ...DETAIL, orderStatus: 'PROCESSING' }, message);

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
  // Status options load from the API.
  await waitFor(() => expect(within(panel).getByLabelText('Status')).toBeEnabled());
  return panel;
};

const chooseMode = (user: User, panel: HTMLElement, label: 'Update tracking' | 'Manually update order status') =>
  user.click(within(panel).getByRole('radio', { name: label }));

const historyItems = (container: HTMLElement) =>
  within(within(container).getByRole('list', { name: 'Tracking history' })).getAllByRole('listitem');

beforeEach(() => {
  resetTrackingStatusCache();
  resetAdminOrdersCache();
  api.listOrders.mockResolvedValue(page([SUMMARY, LEGACY]));
  api.getOrder.mockResolvedValue(ok(DETAIL));
  api.getTrackingStatuses.mockResolvedValue(ok(STATUSES));
  api.updateTracking.mockResolvedValue(trackingOk());
  api.setOrderStatus.mockResolvedValue(manualOk());
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: { userId: 7, username: 'admin1', email: 'a@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false },
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
      expect(cells[4]).toHaveTextContent('Packed'); // order status
      expect(cells[5]).toHaveTextContent('Packed'); // tracking status
      expect(cells[6]).toHaveTextContent('by admin_l1');
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
      expect(await screen.findByText('Validation failed')).toBeInTheDocument();
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
    it('offers only valid next steps from the current stage, labelled with their stage', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user); // current: PACKED
      const options = within(within(panel).getByLabelText('Status')).getAllByRole('option').slice(1);
      expect(options.map((o) => o.getAttribute('value'))).toEqual(['OUT_FOR_DELIVERY', 'CANCELLED']);
      expect(options[0]).toHaveTextContent('Out For Delivery — Out for delivery');
      expect(options[1]).toHaveTextContent('Cancelled — Closed');
    });

    it('keeps actions disabled with a retry when the status list fails to load', async () => {
      api.getTrackingStatuses.mockRejectedValueOnce(axiosError(500)).mockResolvedValueOnce(ok(STATUSES));
      const { user } = renderPage('/order-tracking/ORD-1001');
      const panel = detailPage();

      expect(await within(panel).findByText('Status options could not be loaded.')).toBeInTheDocument();
      expect(within(panel).getByRole('button', { name: 'Add tracking event' })).toBeDisabled();

      await user.click(within(panel).getByRole('button', { name: 'Retry' }));
      await waitFor(() => expect(within(panel).getByRole('button', { name: 'Add tracking event' })).toBeEnabled());
    });

    it('requires a status and sends nothing without one', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);
      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));
      expect(await within(panel).findByText('Please select a status.')).toBeInTheDocument();
      expect(api.updateTracking).not.toHaveBeenCalled();
      expect(api.setOrderStatus).not.toHaveBeenCalled();
    });

    it('"Update tracking" sends one PATCH /tracking with { status, trimmed notes } and never the manual endpoint', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);

      expect(within(panel).getByRole('radio', { name: 'Update tracking' })).toHaveAttribute('aria-checked', 'true');
      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.type(within(panel).getByLabelText('Notes'), '   Handed to courier   ');
      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));

      await waitFor(() => expect(api.updateTracking).toHaveBeenCalledTimes(1));
      expect(api.updateTracking).toHaveBeenCalledWith('ORD-1001', { status: 'OUT_FOR_DELIVERY', notes: 'Handed to courier' });
      expect(api.setOrderStatus).not.toHaveBeenCalled();
    });

    it('"Manually update order status" sends one PATCH /status with status and notes, and never the tracking endpoint', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseMode(user, panel, 'Manually update order status');
      expect(within(panel).getByText(/Administrative change for corrections/)).toBeInTheDocument();
      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.type(within(panel).getByLabelText('Notes'), ' Courier collected early ');
      await user.click(within(panel).getByRole('button', { name: 'Set order status' }));

      await waitFor(() => expect(api.setOrderStatus).toHaveBeenCalledTimes(1));
      expect(api.setOrderStatus).toHaveBeenCalledWith('ORD-1001', 'OUT_FOR_DELIVERY', 'Courier collected early');
      expect(api.updateTracking).not.toHaveBeenCalled();
    });

    it('sends blank notes as null in both modes', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);

      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.type(within(panel).getByLabelText('Notes'), '    ');
      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));
      await waitFor(() => expect(api.updateTracking).toHaveBeenCalledWith('ORD-1001', { status: 'OUT_FOR_DELIVERY', notes: null }));

      await chooseMode(user, panel, 'Manually update order status');
      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.click(within(panel).getByRole('button', { name: 'Set order status' }));
      await waitFor(() => expect(api.setOrderStatus).toHaveBeenCalledWith('ORD-1001', 'OUT_FOR_DELIVERY', null));
    });

    it('asks for confirmation before CANCELLED and sends nothing if dismissed', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);

      await user.selectOptions(within(panel).getByLabelText('Status'), 'CANCELLED');
      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));
      expect(await screen.findByText(/will be cancelled\. This is final/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText(/will be cancelled\. This is final/)).not.toBeInTheDocument();
      expect(api.updateTracking).not.toHaveBeenCalled();

      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));
      await user.click(await screen.findByRole('button', { name: 'Yes, Cancel' }));
      await waitFor(() => expect(api.updateTracking).toHaveBeenCalledTimes(1));
      expect(api.updateTracking).toHaveBeenCalledWith('ORD-1001', { status: 'CANCELLED', notes: null });
    });

    it('asks for confirmation before other final-looking statuses in manual mode', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('OUT_FOR_DELIVERY')));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseMode(user, panel, 'Manually update order status');
      await user.selectOptions(within(panel).getByLabelText('Status'), 'DELIVERED');
      await user.click(within(panel).getByRole('button', { name: 'Set order status' }));
      expect(await screen.findByText('Manually set "Delivered"?')).toBeInTheDocument();
      expect(api.setOrderStatus).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      await waitFor(() => expect(api.setOrderStatus).toHaveBeenCalledWith('ORD-1001', 'DELIVERED', null));
      expect(api.updateTracking).not.toHaveBeenCalled();
    });

    it('on success shows the API message and re-fetches the order, displaying only server values', async () => {
      const refreshedHistory = [
        ...HISTORY.map((e) => ({ ...e, current: false })),
        entry(4, 'OUT_FOR_DELIVERY', '2026-10-03T09:00:00', { current: true, updatedBy: 'admin_l2', notes: 'Handed to courier' }),
      ];
      api.getOrder
        .mockResolvedValueOnce(ok(DETAIL))
        .mockResolvedValueOnce(
          ok({ ...DETAIL, orderStatus: 'OUT_FOR_DELIVERY', updatedBy: 'admin_l2', updatedAt: '2026-10-03T09:00:00', tracking: refreshedHistory })
        );
      // The PATCH response's audit fields must not be used to fabricate the display.
      api.updateTracking.mockResolvedValue(
        ok({ ...entry(99, 'OUT_FOR_DELIVERY', '2099-01-01T00:00:00', { current: true, updatedBy: 'not-from-refresh' }) }, 'Order status updated successfully')
      );
      const { user } = renderPage();
      const panel = await openOrder(user);

      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));

      expect(await screen.findByText('Order status updated successfully')).toBeInTheDocument();
      await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));

      const stillOpen = detailPage();
      await waitFor(() => expect(within(stillOpen).getByTestId('order-status')).toHaveTextContent('Out For Delivery'));
      expect(within(stillOpen).getByTestId('current-tracking')).toHaveTextContent('Out For Delivery');
      expect(within(stillOpen).getByTestId('last-updated')).toHaveTextContent('by admin_l2');

      const items = historyItems(stillOpen);
      expect(items).toHaveLength(4);
      expect(items[3]).toHaveAttribute('data-current', 'true');
      expect(items[3]).toHaveTextContent('by admin_l2');
      expect(stillOpen).not.toHaveTextContent('not-from-refresh');
      expect(within(stillOpen).getByLabelText('Status')).toHaveValue('');
    });

    it('prevents duplicate submissions while saving', async () => {
      let resolve!: (value: ApiResponse<OrderTrackingEntry>) => void;
      api.updateTracking.mockImplementation(() => new Promise((r) => (resolve = r)));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));
      await user.click(within(panel).getByRole('button', { name: /Saving/ }));

      expect(api.updateTracking).toHaveBeenCalledTimes(1);
      expect(within(panel).getByRole('button', { name: /Saving/ })).toBeDisabled();
      resolve(trackingOk('done'));
      expect(await within(panel).findByRole('button', { name: 'Add tracking event' })).toBeEnabled();
    });

    it('on 403 shows the permission message and keeps the user signed in', async () => {
      api.setOrderStatus.mockRejectedValue(axiosError(403, { message: 'You do not have permission to perform this action.' }));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseMode(user, panel, 'Manually update order status');
      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.click(within(panel).getByRole('button', { name: 'Set order status' }));

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

      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));

      expect(await screen.findByText('Validation failed')).toBeInTheDocument();
      expect(await within(panel).findByText('Notes must be at most 500 characters.')).toBeInTheDocument();
    });

    it('on 404 shows the backend "not found" message', async () => {
      api.setOrderStatus.mockRejectedValue(axiosError(404, { message: 'Order not found', errorCode: 'ORDER_NOT_FOUND' }));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await chooseMode(user, panel, 'Manually update order status');
      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.click(within(panel).getByRole('button', { name: 'Set order status' }));

      expect(await screen.findByText('Order not found')).toBeInTheDocument();
    });

    it('on 5xx shows a generic, retryable failure and keeps the form filled', async () => {
      api.updateTracking.mockRejectedValue(axiosError(500));
      const { user } = renderPage();
      const panel = await openOrder(user);

      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));

      expect(await screen.findByText('Request failed')).toBeInTheDocument();
      expect(within(panel).getByLabelText('Status')).toHaveValue('OUT_FOR_DELIVERY');
      expect(within(panel).getByRole('button', { name: 'Add tracking event' })).toBeEnabled();
    });

    it('hides the status actions for a role without the permission (UX only)', async () => {
      useAuthStore.setState({
        user: { userId: 9, username: 'viewer', email: 'v@tinqa.com', role: 'VIEWER', authClient: 'web', isFirstLogin: false },
      });
      const { user } = renderPage();
      const table = await screen.findByRole('table');
      await user.click(within(table).getByRole('link', { name: 'ORD-1001' }));
      const panel = detailPage();
      await within(panel).findByRole('list', { name: 'Tracking history' });
      expect(within(panel).queryByRole('radiogroup', { name: 'Update type' })).not.toBeInTheDocument();
    });
  });

  describe('stage-based status rules', () => {
    it('shows the order stage with the current stage highlighted', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user); // PACKED → Fulfilment
      const stage = within(panel).getByLabelText('Order stage');
      expect(stage).toHaveAttribute('data-stage', 'FULFILMENT');
      expect(within(stage).getByText('Fulfilment').closest('li')).toHaveAttribute('aria-current', 'step');
    });

    it('locks a cancelled order: no update form, no requests possible', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('CANCELLED')));
      const { user } = renderPage();
      const table = await screen.findByRole('table');
      await user.click(within(table).getByRole('link', { name: 'ORD-1001' }));
      const panel = detailPage();

      const locked = await within(panel).findByRole('status', { name: 'Status locked' });
      expect(locked).toHaveTextContent('This order is cancelled');
      expect(within(panel).queryByLabelText('Status')).not.toBeInTheDocument();
      expect(within(panel).queryByRole('radiogroup', { name: 'Update type' })).not.toBeInTheDocument();
      expect(within(panel).getByLabelText('Order stage')).toHaveAttribute('data-stage', 'CANCELLED');
      expect(api.updateTracking).not.toHaveBeenCalled();
      expect(api.setOrderStatus).not.toHaveBeenCalled();
    });

    it('locks an order whose return is completed', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('RETURN_COMPLETED')));
      const { user } = renderPage();
      const table = await screen.findByRole('table');
      await user.click(within(table).getByRole('link', { name: 'ORD-1001' }));
      const panel = detailPage();
      expect(await within(panel).findByRole('status', { name: 'Status locked' })).toHaveTextContent('return for this order is completed');
    });

    it('does not offer Cancelled (or going back) once the order is out for delivery, in either mode', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('OUT_FOR_DELIVERY')));
      const { user } = renderPage();
      const panel = await openOrder(user);
      const values = () =>
        within(within(panel).getByLabelText('Status')).getAllByRole('option').slice(1).map((o) => o.getAttribute('value'));

      expect(values()).toEqual(['DELIVERED', 'RETURN_IN_TRANSIT']);
      await chooseMode(user, panel, 'Manually update order status');
      expect(values()).toEqual(['DELIVERED', 'RETURN_IN_TRANSIT']);
      expect(within(panel).getByLabelText('Order stage')).toHaveAttribute('data-stage', 'DELIVERY');
    });

    it('after delivery only a return can be requested', async () => {
      api.getOrder.mockResolvedValue(ok(withCurrent('DELIVERED')));
      const { user } = renderPage();
      const panel = await openOrder(user);
      const options = within(within(panel).getByLabelText('Status')).getAllByRole('option').slice(1);
      expect(options.map((o) => o.getAttribute('value'))).toEqual(['RETURN_REQUESTED']);
    });

    it('manual mode can undo the last step before shipment, with confirmation; tracking mode cannot', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user); // PACKED, previous event CONFIRMED
      const select = () => within(panel).getByLabelText('Status');

      expect(within(select()).queryByRole('option', { name: /undo last step/ })).not.toBeInTheDocument();

      await chooseMode(user, panel, 'Manually update order status');
      expect(within(select()).getByRole('option', { name: '↩ Confirmed (undo last step)' })).toBeInTheDocument();

      await user.selectOptions(select(), 'CONFIRMED');
      await user.click(within(panel).getByRole('button', { name: 'Set order status' }));
      expect(await screen.findByText('Undo last step and revert to "Confirmed"?')).toBeInTheDocument();
      expect(api.setOrderStatus).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      await waitFor(() => expect(api.setOrderStatus).toHaveBeenCalledWith('ORD-1001', 'CONFIRMED', null));
      expect(api.updateTracking).not.toHaveBeenCalled();
    });

    it('switching back to tracking mode clears an undo selection it does not allow', async () => {
      const { user } = renderPage();
      const panel = await openOrder(user);
      await chooseMode(user, panel, 'Manually update order status');
      await user.selectOptions(within(panel).getByLabelText('Status'), 'CONFIRMED');
      await chooseMode(user, panel, 'Update tracking');
      expect(within(panel).getByLabelText('Status')).toHaveValue('');
    });

    it('on 409 (order changed elsewhere) shows the message and reloads the order', async () => {
      api.updateTracking.mockRejectedValue(
        axiosError(409, { message: 'Invalid status transition from CANCELLED to OUT_FOR_DELIVERY', errorCode: 'INVALID_STATUS_TRANSITION' })
      );
      const { user } = renderPage();
      const panel = await openOrder(user);
      expect(api.getOrder).toHaveBeenCalledTimes(1);

      await user.selectOptions(within(panel).getByLabelText('Status'), 'OUT_FOR_DELIVERY');
      await user.click(within(panel).getByRole('button', { name: 'Add tracking event' }));

      expect(await screen.findByText('Invalid status transition from CANCELLED to OUT_FOR_DELIVERY')).toBeInTheDocument();
      await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));
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
