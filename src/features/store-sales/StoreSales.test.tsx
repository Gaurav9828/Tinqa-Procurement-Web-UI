import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import { createEndpointMatcher, PROCUREMENT_ENDPOINTS } from '../../config/endpointAccess';
import { StoreSalesPage } from './pages/StoreSalesPage';
import { storeSaleApi } from './api/storeSaleApi';
import type { StoreCustomer, StoreSale } from './types/storeSale.types';

vi.mock('./api/storeSaleApi', () => {
  const storeSaleApi = {
    findCustomer: vi.fn(), registerCustomer: vi.fn(), addAddress: vi.fn(), listProducts: vi.fn(), quote: vi.fn(),
    placeOrder: vi.fn(), listMySales: vi.fn(), listAllSales: vi.fn(), sendEmailCode: vi.fn(), confirmEmailCode: vi.fn(),
    lookupUnit: vi.fn(),
  };
  return {
    storeSaleApi,
    storeEmailVerificationApi: {
      sendCode: (email: string) => storeSaleApi.sendEmailCode(email),
      confirmCode: (email: string, code: string) => storeSaleApi.confirmEmailCode(email, code),
    },
  };
});
const api = vi.mocked(storeSaleApi);

const ok = <T,>(data: T, message = 'OK') => ({ success: true, message, errorCode: null, timestamp: '', path: '', data });
const page = (content: StoreSale[]) =>
  ok({ content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true, empty: !content.length });

const CUSTOMER: StoreCustomer = {
  id: 7, name: 'Walk In', email: 'walk@example.com', phoneNumber: '+91 9876543210', emailVerified: true, passwordSetupPending: true,
  addresses: [{ id: 70, addressType: 'SHIPPING', recipientName: 'Walk In', phoneNumber: '+91 9876543210', addressLine1: '12 Market Road', addressLine2: null, city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'India', isDefault: true }],
};

const SALE: StoreSale = {
  orderNumber: 'ORD-STORE01', createdAt: '2026-10-21T10:00:00', orderStatus: 'CONFIRMED', paymentMethod: 'CASH',
  paymentStatus: 'PAID', totalAmount: 2360, soldBy: 'ravi.agent', soldByName: 'Ravi Kumar',
  customer: { id: 7, name: 'Walk In', phoneNumber: '+91 9876543210', email: 'walk@example.com' },
  deliveryAddress: { recipientName: 'Walk In', phoneNumber: '+91 9876543210', addressLine1: '12 Market Road', addressLine2: null, city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'India' },
  items: [{ productId: 3, title: 'Smart switch', price: 1180, quantity: 2, totalPrice: 2360 }],
  cash: { provider: 'CASH', status: 'PAID', transactionId: null, paymentInstrument: 'CASH', amountPaise: 236000, currency: 'INR', createdAt: '2026-10-21T10:00:00', paidAt: '2026-10-21T10:00:00', receiptNumber: 'R-7', collectedBy: 'ravi.agent' },
  customerEmailStatus: 'PENDING',
};

const signIn = (username: string, permissions: Permission[]) =>
  useAuthStore.setState({
    token: 't', isAuthenticated: true,
    user: { userId: 1, username, email: `${username}@tinqa.com`, role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderPage = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter>
        <GlobalAlertContainer />
        <StoreSalesPage />
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.listProducts.mockResolvedValue(ok([{ id: 3, title: 'Smart switch', imageUrl: null, listPrice: 1180, discountPercentage: 0, unitPrice: 1180, stock: 4, gstRate: 18 }]));
  api.listMySales.mockResolvedValue(page([SALE]));
  api.listAllSales.mockResolvedValue(page([SALE]));
});

describe('Store sales', () => {
  it('lets an agent find the customer, get the server total and book a cash sale', async () => {
    signIn('ravi.agent', ['STORE_CUSTOMER_REGISTER', 'STORE_ORDER_CREATE', 'STORE_ORDER_VIEW']);
    api.findCustomer.mockResolvedValue(ok(CUSTOMER));
    api.quote.mockResolvedValue(ok({ lines: [{ productId: 3, title: 'Smart switch', unitPrice: 1180, quantity: 2, lineTotal: 2360, preOrder: false }], subtotal: 2360, shippingFee: 0, totalAmount: 2360 }));
    api.placeOrder.mockResolvedValue(ok(SALE));
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByRole('tab', { name: 'All store sales' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/mobile number or email/i), '98765 43210');
    await user.click(screen.getByRole('button', { name: 'Find' }));
    expect(api.findCustomer).toHaveBeenCalledWith('+91 9876543210');
    const details = await screen.findByLabelText('Customer details');
    expect(within(details).getByText('Walk In')).toBeInTheDocument();
    expect(within(details).getByRole('link', { name: 'walk@example.com' })).toHaveAttribute('href', 'mailto:walk@example.com');
    expect(within(details).getByText('verified')).toBeInTheDocument();
    expect(within(details).getByText(/Hasn't set a password yet/)).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'One more Smart switch' }));
    await user.click(screen.getByRole('button', { name: 'One more Smart switch' }));
    await user.click(screen.getByRole('button', { name: 'Get the total' }));
    expect(api.quote).toHaveBeenCalledWith([{ productId: 3, quantity: 2 }]);
    await screen.findByRole('table', { name: 'Order total' });

    await user.type(screen.getByLabelText(/Receipt number/), 'R-7');
    await user.click(screen.getByRole('button', { name: 'Book the sale' }));
    expect(await screen.findByText('Received the cash?')).toBeInTheDocument();
    // The modal's own "Book the sale" is the last one rendered
    const bookButtons = screen.getAllByRole('button', { name: 'Book the sale' });
    await user.click(bookButtons[bookButtons.length - 1]);

    await waitFor(() =>
      expect(api.placeOrder).toHaveBeenCalledWith({
        customerId: 7, addressId: 70, paymentMethod: 'CASH', items: [{ productId: 3, quantity: 2 }],
        totalAmount: 2360, shippingFee: 0, notes: undefined, cashReceiptNumber: 'R-7',
      })
    );
    expect(api.listAllSales).not.toHaveBeenCalled();
  });

  it('offers to register a customer nobody has, with the storefront rules', async () => {
    signIn('ravi.agent', ['STORE_CUSTOMER_REGISTER', 'STORE_ORDER_CREATE']);
    api.findCustomer.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: { success: false, errorCode: 'CUSTOMER_NOT_FOUND', message: 'No customer' } } });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/mobile number or email/i), '9876543210');
    await user.click(screen.getByRole('button', { name: 'Find' }));
    await user.click(await screen.findByRole('button', { name: 'Register them' }));
    const form = screen.getByRole('form', { name: 'Register customer' });
    await user.click(within(form).getByRole('button', { name: /Register customer/ }));
    expect(within(form).getByText('First name is required.')).toBeInTheDocument();
    expect(within(form).getByText('Enter a valid 6-digit PIN code.')).toBeInTheDocument();
    expect(api.registerCustomer).not.toHaveBeenCalled();
  });

  it('registers a new customer only after their email is verified with the code sent there', async () => {
    signIn('ravi.agent', ['STORE_CUSTOMER_REGISTER', 'STORE_ORDER_CREATE']);
    api.findCustomer.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: { success: false, errorCode: 'CUSTOMER_NOT_FOUND', message: 'No customer' } } });
    api.sendEmailCode.mockResolvedValue(ok({ email: 'walk@example.com', codeValidMinutes: 10, resendAfterSeconds: 60 }));
    api.confirmEmailCode.mockResolvedValue(ok({ email: 'walk@example.com', verificationToken: 'verified-token', expiresAt: '' }));
    api.registerCustomer.mockResolvedValue(ok(CUSTOMER));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/mobile number or email/i), 'walk@example.com');
    await user.click(screen.getByRole('button', { name: 'Find' }));
    await user.click(await screen.findByRole('button', { name: 'Register them' }));
    const form = screen.getByRole('form', { name: 'Register customer' });
    await user.type(within(form).getByLabelText('First name'), 'Walk');
    await user.type(within(form).getByLabelText('Last name'), 'In');
    await user.type(within(form).getByLabelText('Mobile number'), '9876543210');
    await user.type(within(form).getByLabelText('Date of birth'), '1990-01-01');
    await user.selectOptions(within(form).getByLabelText('Gender'), 'FEMALE');
    await user.type(within(form).getByLabelText('Recipient name'), 'Walk In');
    await user.type(within(form).getByLabelText('Recipient mobile'), '9876543210');
    await user.type(within(form).getByLabelText('Address line 1'), '12 Market Road');
    await user.type(within(form).getByLabelText('PIN code'), '411001');
    await user.type(within(form).getByLabelText('City'), 'Pune');
    await user.type(within(form).getByLabelText('State'), 'Maharashtra');

    // Not before the email is verified
    await user.click(within(form).getByRole('button', { name: /Register customer/ }));
    expect(within(form).getByText('Verify the email with the code sent to it.')).toBeInTheDocument();
    expect(api.registerCustomer).not.toHaveBeenCalled();

    await user.click(within(form).getByRole('button', { name: /Send code/ }));
    expect(api.sendEmailCode).toHaveBeenCalledWith('walk@example.com');
    await user.type(await within(form).findByLabelText('Verification code'), '48213');
    await user.click(within(form).getByRole('button', { name: /Verify/ }));
    await within(form).findByText('Email verified');
    await user.click(within(form).getByRole('button', { name: /Register customer/ }));

    await waitFor(() =>
      expect(api.registerCustomer).toHaveBeenCalledWith(expect.objectContaining({ email: 'walk@example.com', gender: 'FEMALE', emailVerificationToken: 'verified-token' }))
    );
  });

  it('shows store and finance staff every sale, who sold it and whether the customer was emailed', async () => {
    signIn('store.manager', ['STORE_SALES_VIEW_ALL', 'CUSTOMER_ORDER_VIEW']);
    api.listAllSales.mockResolvedValue(page([SALE, { ...SALE, orderNumber: 'ORD-STORE02', customerEmailStatus: 'FAILED', customerEmailError: 'Mail server down' }]));
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table', { name: 'Store sales' });
    expect(within(table).getAllByText('Ravi Kumar')).toHaveLength(2);
    expect(within(table).getByText('Email queued')).toBeInTheDocument();
    expect(within(table).getByText('Email failed')).toHaveAttribute('title', 'Mail server down');
    expect(within(table).getByRole('link', { name: 'ORD-STORE01' })).toBeInTheDocument();
    expect(within(table).getAllByText('walk@example.com')).toHaveLength(2);
    expect(within(table).getAllByText('12 Market Road, Pune, Maharashtra, 411001')).toHaveLength(2);
    expect(screen.queryByRole('tab', { name: 'New sale' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm cash/ })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Seller login (exact)'), 'ravi.agent');
    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await waitFor(() => expect(api.listAllSales).toHaveBeenLastCalledWith(expect.objectContaining({ soldBy: 'ravi.agent', page: 0 })));
  });

  describe('product search by barcode', () => {
    const PRODUCTS = [
      { id: 3, title: 'Smart switch', imageUrl: null, listPrice: 1180, discountPercentage: 0, unitPrice: 1180, stock: 4, gstRate: 18 },
      { id: 5, title: 'Door sensor', imageUrl: null, listPrice: 590, discountPercentage: 0, unitPrice: 590, stock: 2, gstRate: 18 },
    ];
    const productList = () => screen.findByRole('list', { name: 'Products on sale' });

    beforeEach(() => {
      api.listProducts.mockResolvedValue(ok(PRODUCTS));
      signIn('ravi.agent', ['STORE_CUSTOMER_REGISTER', 'STORE_ORDER_CREATE', 'STORE_ORDER_VIEW']);
    });

    it('shows the product of a scanned unit (Enter, as scanners send) and asks only once per code', async () => {
      api.lookupUnit.mockResolvedValue(ok({ barcode: 'DS-0000123', productId: 5, productTitle: 'Door sensor', status: 'IN_STOCK', inStock: true, note: null }));
      const user = userEvent.setup();
      renderPage();
      await productList();

      const search = screen.getByLabelText('Search products');
      await user.type(search, 'ds-0000123{Enter}');
      expect(api.lookupUnit).toHaveBeenCalledWith('DS-0000123');
      const list = await productList();
      await waitFor(() => expect(within(list).queryByText('Smart switch')).not.toBeInTheDocument());
      expect(within(list).getByText('Door sensor')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('DS-0000123 is a unit of Door sensor.');
      await user.click(within(list).getByRole('button', { name: 'One more Door sensor' }));
      expect(within(list).getByRole('group', { name: 'Quantity of Door sensor' })).toHaveTextContent('1');

      // The same unit scanned again is answered from memory
      await user.clear(search);
      await user.type(search, 'DS-0000123{Enter}');
      expect(await screen.findByRole('status')).toHaveTextContent('Door sensor');
      expect(api.lookupUnit).toHaveBeenCalledTimes(1);
    });

    it('matches names in the browser without asking the server', async () => {
      const user = userEvent.setup();
      renderPage();
      await productList();

      await user.type(screen.getByLabelText('Search products'), 'switch{Enter}');
      const list = await productList();
      expect(within(list).getByText('Smart switch')).toBeInTheDocument();
      expect(within(list).queryByText('Door sensor')).not.toBeInTheDocument();
      // Not shaped like a barcode, and no name matches: still no call
      await user.clear(screen.getByLabelText('Search products'));
      await user.type(screen.getByLabelText('Search products'), 'lamp{Enter}');
      expect(screen.getByText('No products match the search.')).toBeInTheDocument();
      expect(api.lookupUnit).not.toHaveBeenCalled();
    });

    it('says when a scanned unit is out of stock or its product is not on sale', async () => {
      api.lookupUnit.mockImplementation(async (code: string) => code === 'DS-0000124'
        ? ok({ barcode: code, productId: 5, productTitle: 'Door sensor', status: 'ON_DEMO' as const, inStock: false, note: 'This unit is out on a client demo.' })
        : ok({ barcode: code, productId: 99, productTitle: 'Old hub', status: 'IN_STOCK' as const, inStock: true, note: null }));
      const user = userEvent.setup();
      renderPage();
      await productList();
      const search = screen.getByLabelText('Search products');

      await user.type(search, 'DS-0000124{Enter}');
      expect(await screen.findByRole('status')).toHaveTextContent('This unit is out on a client demo.');
      expect(within(await productList()).getByText('Door sensor')).toBeInTheDocument();

      await user.clear(search);
      await user.type(search, 'HUB-0000001{Enter}');
      expect(await screen.findByRole('status')).toHaveTextContent('HUB-0000001 is a unit of Old hub, which is not on sale now.');
      expect(screen.getByText('Nothing to add for this barcode.')).toBeInTheDocument();
    });

    it('needs the permission to book store orders', () => {
      expect(createEndpointMatcher(PROCUREMENT_ENDPOINTS)('GET', '/v1/store-sales/units/lookup')).toBe('STORE_ORDER_CREATE');
    });
  });
});
