import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { customersApi } from './api/customersApi';
import type { CustomerDetail, CustomerOrder, CustomerSummary } from './types/customer.types';
import { buildTimeline, changedFields, toEditForm, toUpdatePayload, validateEditForm } from './utils/customer.utils';

vi.mock('./api/customersApi', () => ({
  customersApi: {
    list: vi.fn(), get: vi.fn(), orders: vi.fn(), cart: vi.fn(), tickets: vi.fn(), update: vi.fn(), requestChange: vi.fn(),
  },
}));
const api = vi.mocked(customersApi);

const ok = <T,>(data: T, message = 'OK') => ({ success: true, message, errorCode: null, timestamp: '', path: '', data });
const page = <T,>(content: T[]) =>
  ok({ content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true, empty: !content.length });

const SUMMARY: CustomerSummary = {
  id: 7, name: 'Asha Verma', email: 'asha@example.com', phoneNumber: '+91 9876543210', status: 'ACTIVE', emailVerified: true,
  registeredBy: null, registeredAt: '2026-01-05T10:00:00', orderCount: 2, totalSpent: 2360, lastOrderAt: '2026-10-01T09:00:00',
  cartUnits: 3, lastCartActivityAt: '2026-10-20T18:00:00',
};

const CUSTOMER: CustomerDetail = {
  id: 7, uuid: 'u-7', firstName: 'Asha', middleName: null, lastName: 'Verma', name: 'Asha Verma', email: 'asha@example.com',
  phoneNumber: '+91 9876543210', dob: '1995-05-17', status: 'ACTIVE', emailVerified: true, emailVerifiedAt: '2026-01-05T10:00:00',
  passwordSetupPending: false, rewardPoints: 0, registeredBy: null, registeredAt: '2026-01-05T10:00:00', updatedAt: '2026-01-05T10:00:00',
  addresses: [], orderCount: 1, totalSpent: 2360, lastOrderAt: '2026-10-01T09:00:00', cartUnits: 3, cartValue: 600,
  lastCartActivityAt: '2026-10-20T18:00:00', openTicketCount: 0,
};

const ORDER: CustomerOrder = {
  id: 1, orderNumber: 'ORD-1', placedAt: '2026-10-01T09:00:00', orderStatus: 'DELIVERED', paymentStatus: 'PAID', paymentMethod: 'UPI',
  salesChannel: 'ONLINE', soldByName: null, totalAmount: 2360, cancellationReason: null,
  items: [{ productId: 3, title: 'Smart switch', quantity: 2, price: 1180, totalPrice: 2360 }],
};

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: 't', isAuthenticated: true,
    user: { userId: 1, username: 'care', email: 'care@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderAt = (path: string) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter initialEntries={[path]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue(page([SUMMARY]));
  api.get.mockResolvedValue(ok(CUSTOMER));
  api.orders.mockResolvedValue(page([ORDER]));
  api.cart.mockResolvedValue(ok([{ productId: 4, title: 'Cable', imageUrl: null, quantity: 3, unitPrice: 200, lineTotal: 600, available: true, addedAt: '2026-10-20T18:00:00' }]));
  api.tickets.mockResolvedValue(page([]));
});

describe('Customer Management', () => {
  it('lists customers and narrows to those who left items in their cart', async () => {
    signIn(['CUSTOMER_VIEW']);
    const user = userEvent.setup();
    renderAt('/customers');

    const list = await screen.findByRole('list', { name: 'Customers' });
    expect(within(list).getByText('Asha Verma')).toBeInTheDocument();
    expect(within(list).getByText('3 in cart')).toBeInTheDocument();
    expect(api.list).toHaveBeenLastCalledWith({ search: '', withCart: false, page: 0, size: 20 });

    await user.click(screen.getByRole('button', { name: /Items left in cart/ }));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ search: '', withCart: true, page: 0, size: 20 }));
  });

  it("shows a customer's orders, cart and activity, and lets customer care request a change", async () => {
    signIn(['CUSTOMER_VIEW', 'CUSTOMER_CHANGE_REQUEST']);
    api.requestChange.mockResolvedValue(ok(undefined, 'Change requested. A Super Admin has been notified.'));
    const user = userEvent.setup();
    renderAt('/customers/7');

    expect(await screen.findByRole('heading', { name: 'Asha Verma' })).toBeInTheDocument();
    const orders = await screen.findByRole('region', { name: 'Orders' });
    expect(await within(orders).findByText('Smart switch × 2')).toBeInTheDocument();
    // Order Tracking is not open to this viewer, so the order number is not a link
    expect(within(orders).queryByRole('link', { name: '#ORD-1' })).not.toBeInTheDocument();
    expect(await within(screen.getByRole('region', { name: 'Cart' })).findByText('Cable')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Activity' })).getByText('Added Cable to cart')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Request change' }));
    const dialog = screen.getByRole('dialog', { name: 'Request a change' });
    const phone = within(dialog).getByLabelText('Phone number');
    await user.clear(phone);
    await user.type(phone, '+91 9000000001');
    await user.type(within(dialog).getByLabelText('Reason'), 'Customer called from a new number');
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }));

    await waitFor(() =>
      expect(api.requestChange).toHaveBeenCalledWith({
        customerId: 7, customerName: 'Asha Verma', changes: { PHONE_NUMBER: '+91 9000000001' }, reason: 'Customer called from a new number',
      })
    );
    expect(api.update).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('lets the Super Admin save the change directly', async () => {
    signIn(['CUSTOMER_VIEW', 'CUSTOMER_CHANGE_REQUEST', 'CUSTOMER_UPDATE', 'CUSTOMER_ORDER_VIEW']);
    api.update.mockResolvedValue(ok({ ...CUSTOMER, firstName: 'Ashaa', name: 'Ashaa Verma' }, 'Customer details updated'));
    const user = userEvent.setup();
    renderAt('/customers/7');

    await user.click(await screen.findByRole('button', { name: 'Edit details' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit customer details' });
    // Without a change or a reason nothing is sent
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByText('Change at least one detail.')).toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();

    const first = within(dialog).getByLabelText('First name');
    await user.clear(first);
    await user.type(first, 'Ashaa');
    await user.type(within(dialog).getByLabelText('Reason'), 'Name misspelt');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledWith(7, { firstName: 'Ashaa', reason: 'Name misspelt' }));
    expect(await screen.findByRole('heading', { name: 'Ashaa Verma' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Orders' })).getByRole('link', { name: '#ORD-1' })).toHaveAttribute('href', '/order-tracking/ORD-1');
  });
});

describe('customer utils', () => {
  it('sends only the changed fields, and an emptied middle name as a removal', () => {
    const form = { ...toEditForm({ ...CUSTOMER, middleName: 'K' }), middleName: '', lastName: ' Verma ', reason: 'x' };
    const changes = changedFields({ ...CUSTOMER, middleName: 'K' }, form);
    expect(changes).toEqual({ MIDDLE_NAME: '' });
    expect(toUpdatePayload(changes, ' Typo ')).toEqual({ middleName: '', reason: 'Typo' });
  });

  it('validates like the backend', () => {
    const form = { ...toEditForm(CUSTOMER), firstName: 'A', phoneNumber: 'abc', dob: '2030-01-01', reason: 'no' };
    const errors = validateEditForm(form, changedFields(CUSTOMER, form), '2026-10-22');
    expect(Object.keys(errors).sort()).toEqual(['dob', 'firstName', 'phoneNumber', 'reason']);
    const cleared = { ...toEditForm(CUSTOMER), dob: '', reason: 'Fine reason' };
    expect(validateEditForm(cleared, changedFields(CUSTOMER, cleared), '2026-10-22').dob).toBe('Date of birth cannot be removed.');
  });

  it('orders the activity newest first and links only what the viewer can open', () => {
    const events = buildTimeline(CUSTOMER, [ORDER], [], [], { order: (n) => `/o/${n}` });
    expect(events.map((event) => event.kind)).toEqual(['order', 'registered']);
    expect(events[0].link).toBe('/o/ORD-1');
    expect(buildTimeline(CUSTOMER, [ORDER], [], [], {})[0].link).toBeUndefined();
  });
});
