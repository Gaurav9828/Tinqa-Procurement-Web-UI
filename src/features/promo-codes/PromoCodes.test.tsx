import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import { superAdminPermissions } from '../../test/access';
import { PromoCodesPage } from './pages/PromoCodesPage';
import { promoCodesApi } from './api/promoCodesApi';
import { customersApi } from '../customer-management/api/customersApi';
import { productApi } from '../products-management/api/productsApi';
import type { PromoCodeDetail, PromoCodeSummary, PromoRedemption } from './types/promoCode.types';
import type { CustomerSummary } from '../customer-management/types/customer.types';
import type { ProductResponse } from '../products-management/types/product.types';
import { lastDayOf, todayInIndia, toRequest, emptyForm, validateForm, formOf } from './utils/promoCodeForm';

vi.mock('./api/promoCodesApi', () => ({
  promoCodesApi: {
    list: vi.fn(), get: vi.fn(), redemptions: vi.fn(), suggestCode: vi.fn(), create: vi.fn(), update: vi.fn(), setActive: vi.fn(), remove: vi.fn(), restore: vi.fn(),
  },
}));
vi.mock('../customer-management/api/customersApi', () => ({ customersApi: { list: vi.fn() } }));
vi.mock('../products-management/api/productsApi', () => ({ productApi: { getActiveProducts: vi.fn() } }));
const api = vi.mocked(promoCodesApi);
const customers = vi.mocked(customersApi);
const products = vi.mocked(productApi);

const ok = <T,>(data: T, message = 'OK') => ({ success: true, message, errorCode: null, timestamp: '', path: '', data });
const page = <T,>(content: T[]) =>
  ok({ content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true, empty: !content.length });

const SUMMARY: PromoCodeSummary = {
  id: 1, code: 'TINQA7KQ3MZP', description: 'Diwali offer', discountType: 'PERCENTAGE', discountPercentage: 20, amountOff: null, customerScope: 'SELECTED', customerCount: 1,
  productScope: 'SELECTED', productCount: 1, maxUnitsPerProduct: null, usageLimitPerCustomer: 1, totalUsageLimit: null,
  startsOn: '2026-11-04', expiresOn: '2027-05-03', active: true, status: 'ACTIVE', timesUsed: 3, totalDiscountGiven: 450,
  createdBy: 'superadmin', createdAt: '2026-11-04T10:00:00', updatedBy: null, updatedAt: '2026-11-04T10:00:00',
  deletedBy: null, deletedAt: null,
};
const DETAIL: PromoCodeDetail = {
  ...SUMMARY,
  customers: [{ id: 7, name: 'Asha Rao', email: 'asha@example.com' }],
  products: [{ id: 12, title: 'RudraX', maxUnits: 1 }],
};
const DELETED: PromoCodeSummary = { ...SUMMARY, status: 'DELETED', deletedBy: 'superadmin', deletedAt: '2026-11-05T10:00:00' };
const REDEMPTION: PromoRedemption = {
  id: 4, orderNumber: 'ORD-1A2B3C4D', customerId: 7, customerName: 'Asha Rao', customerEmail: 'asha@example.com', unitsDiscounted: 1,
  amountBeforeDiscount: 2850, discountAmount: 150, orderTotal: 2700, orderStatus: 'DELIVERED', counted: true, redeemedAt: '2026-11-04T10:00:00',
};
const CUSTOMER = { id: 7, name: 'Asha Rao', email: 'asha@example.com', phoneNumber: '+91 9876543210' } as CustomerSummary;
const PRODUCT = { id: 12, title: 'RudraX', modelName: 'RX-200' } as ProductResponse;
const LAMP = { id: 14, title: 'Lamp', modelName: 'LP-1' } as ProductResponse;

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: 't', isAuthenticated: true,
    user: { userId: 1, username: 'staff', email: 'staff@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderPage = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <GlobalAlertContainer />
      <PromoCodesPage />
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  // 2026-11-04, 11:30 in India
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T06:00:00Z'));
  api.list.mockResolvedValue(page([SUMMARY]));
  api.get.mockResolvedValue(ok(DETAIL));
  api.redemptions.mockResolvedValue(page([REDEMPTION]));
  api.suggestCode.mockReset().mockResolvedValueOnce(ok({ code: 'TINQA7KQ3MZP' })).mockResolvedValue(ok({ code: 'TINQAH4WX8RT' }));
  api.setActive.mockResolvedValue(ok({ ...DETAIL, active: false, status: 'DISABLED' }, 'Promo code switched off'));
  customers.list.mockResolvedValue(page([CUSTOMER]));
  products.getActiveProducts.mockResolvedValue([PRODUCT, LAMP]);
});

afterEach(() => {
  vi.useRealTimers();
});

const openCreate = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: 'New promo code' }));
  const dialog = screen.getByRole('dialog', { name: 'New promo code' });
  await waitFor(() => expect(within(dialog).getByLabelText('Code')).toHaveValue('TINQA7KQ3MZP'));
  return dialog;
};

describe('Promo Codes for viewers', () => {
  it('lists codes with status and totals, shows no manage controls and never asks for a code suggestion', async () => {
    signIn(['PROMO_CODE_VIEW']);
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole('table', { name: 'Promo codes' });
    expect(within(table).getByRole('button', { name: 'TINQA7KQ3MZP' })).toBeInTheDocument();
    expect(within(table).getByText('Active')).toBeInTheDocument();
    expect(within(table).getByText('₹450.00')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith({ search: '', status: '', page: 0, size: 20 });
    expect(screen.queryByRole('button', { name: 'New promo code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Switch (off|on)/ })).not.toBeInTheDocument();

    await user.click(within(table).getByRole('button', { name: 'TINQA7KQ3MZP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Promo code TINQA7KQ3MZP' });
    expect(within(dialog).getByText('Asha Rao')).toBeInTheDocument();
    expect(within(dialog).getByText('RudraX')).toBeInTheDocument();
    expect(within(dialog).getByText('on 1 unit')).toBeInTheDocument();
    expect(within(dialog).getByText('Set per product')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Switch/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete|Restore/ })).not.toBeInTheDocument();

    expect(api.suggestCode).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
    expect(api.setActive).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
  });

  it('loads the use history only when it is opened', async () => {
    signIn(['PROMO_CODE_VIEW']);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'TINQA7KQ3MZP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Promo code TINQA7KQ3MZP' });
    expect(api.get).toHaveBeenCalledWith(1);
    expect(api.redemptions).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /Use history/ }));
    const orders = await within(dialog).findByRole('list', { name: 'Orders that used the code' });
    expect(within(orders).getByText(/ORD-1A2B3C4D/)).toBeInTheDocument();
    expect(within(orders).getByText('₹150.00')).toBeInTheDocument();
    expect(api.redemptions).toHaveBeenCalledTimes(1);
    expect(api.redemptions).toHaveBeenCalledWith(1, 0, 20);
  });

  it('narrows the list by status', async () => {
    signIn(['PROMO_CODE_VIEW']);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table', { name: 'Promo codes' });

    await user.selectOptions(screen.getByLabelText('Status'), 'EXPIRED');
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ search: '', status: 'EXPIRED', page: 0, size: 20 }));
    await user.selectOptions(screen.getByLabelText('Status'), 'DELETED');
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ search: '', status: 'DELETED', page: 0, size: 20 }));
  });
});

describe('Promo Codes for the Super Admin', () => {
  it('creates a code for chosen customers and products with unlimited uses and a one-year preset', async () => {
    signIn(superAdminPermissions('ADMIN_L2'));
    api.create.mockResolvedValue(ok(DETAIL, 'Promo code created'));
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreate(user);
    expect(api.suggestCode).toHaveBeenCalledTimes(1);

    await user.type(within(dialog).getByLabelText('Description (staff only)'), 'Diwali offer');
    await user.type(within(dialog).getByLabelText('Discount %'), '20');
    expect(within(dialog).getByText(/replaces/)).toBeInTheDocument();

    await user.click(within(within(dialog).getByRole('group', { name: 'Customers' })).getByRole('radio', { name: 'Selected' }));
    await user.type(within(dialog).getByRole('searchbox', { name: 'Search customers to add' }), 'asha{Enter}');
    await user.click(await within(dialog).findByRole('button', { name: 'Add Asha Rao' }));
    expect(within(within(dialog).getByRole('list', { name: 'Chosen customers' })).getByText('Asha Rao')).toBeInTheDocument();
    expect(customers.list).toHaveBeenCalledWith({ search: 'asha', withCart: false, page: 0, size: 10 });

    await user.click(within(within(dialog).getByRole('group', { name: 'Products' })).getByRole('radio', { name: 'Selected' }));
    expect(within(dialog).queryByLabelText('Units per product')).not.toBeInTheDocument();
    await user.click(await within(dialog).findByRole('button', { name: 'Add RudraX' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add Lamp' }));
    const chosen = within(dialog).getByRole('list', { name: 'Chosen products' });
    expect(within(chosen).getByText('RudraX')).toBeInTheDocument();
    // RudraX on one unit per order; Lamp keeps every unit
    await user.click(within(within(chosen).getByRole('group', { name: 'Units of RudraX' })).getByRole('radio', { name: 'Number' }));
    await user.type(within(chosen).getByRole('spinbutton', { name: 'Units of RudraX' }), '1');
    expect(within(within(chosen).getByRole('group', { name: 'Units of Lamp' })).getByRole('radio', { name: 'All units' })).toBeChecked();

    await user.click(within(within(dialog).getByRole('group', { name: 'Uses per customer' })).getByRole('radio', { name: 'Unlimited' }));
    await user.click(within(within(dialog).getByRole('group', { name: 'Valid for' })).getByRole('radio', { name: '1 year' }));
    expect(within(dialog).getByLabelText('Last day')).toHaveValue('2027-11-03');

    await user.click(within(dialog).getByRole('button', { name: 'Create promo code' }));
    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith({
        code: 'TINQA7KQ3MZP', description: 'Diwali offer', discountType: 'PERCENTAGE', discountPercentage: 20, amountOff: null,
        customerScope: 'SELECTED', customerIds: [7], productScope: 'SELECTED',
        products: [{ productId: 12, maxUnits: 1 }, { productId: 14, maxUnits: null }],
        maxUnitsPerProduct: null, usageLimitPerCustomer: null, totalUsageLimit: null,
        startsOn: '2026-11-04', expiresOn: '2027-11-03', active: true,
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New promo code' })).not.toBeInTheDocument());
    // Only the list is asked again
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(api.get).not.toHaveBeenCalled();
    expect(api.suggestCode).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid code and a 100 % discount without sending, and uppercases what is typed', async () => {
    signIn(superAdminPermissions('ADMIN_L2'));
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreate(user);
    await user.click(within(dialog).getByRole('button', { name: 'Suggest another' }));
    await waitFor(() => expect(within(dialog).getByLabelText('Code')).toHaveValue('TINQAH4WX8RT'));
    expect(api.suggestCode).toHaveBeenCalledTimes(2);

    const code = within(dialog).getByLabelText('Code');
    await user.clear(code);
    await user.type(code, 'tinqa1');
    expect(code).toHaveValue('TINQA1');
    await user.type(within(dialog).getByLabelText('Discount %'), '100');
    await user.click(within(dialog).getByRole('button', { name: 'Create promo code' }));

    expect(within(dialog).getByText(/Use TINQA followed by 3 to 15 capital letters or digits/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Enter a percentage above 0 and below 100/)).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('takes an amount off instead of a percentage: one at a time, at most ₹1,000', async () => {
    signIn(superAdminPermissions('ADMIN_L2'));
    api.create.mockResolvedValue(ok({ ...DETAIL, discountType: 'AMOUNT', discountPercentage: null, amountOff: 200 }, 'Promo code created'));
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreate(user);
    const percent = within(dialog).getByLabelText('Discount %');
    const amount = within(dialog).getByLabelText('Amount off (₹)');
    expect(amount).toBeDisabled();
    await user.type(percent, '20');

    // Choosing the amount disables and clears the percentage
    await user.click(within(within(dialog).getByRole('group', { name: 'Discount as' })).getByRole('radio', { name: 'Amount (₹)' }));
    expect(percent).toBeDisabled();
    expect(percent).toHaveValue('');
    await user.type(amount, '1500');
    await user.click(within(dialog).getByRole('button', { name: 'Create promo code' }));
    expect(within(dialog).getByText(/Enter an amount above ₹0 and at most ₹1,000/)).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();

    await user.clear(amount);
    await user.type(amount, '200');
    await user.click(within(dialog).getByRole('button', { name: 'Create promo code' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ discountType: 'AMOUNT', discountPercentage: null, amountOff: 200 })));
  });

  it('shows an amount code as rupees in the list', async () => {
    signIn(['PROMO_CODE_VIEW']);
    api.list.mockResolvedValue(page([{ ...SUMMARY, discountType: 'AMOUNT', discountPercentage: null, amountOff: 200 }]));
    renderPage();
    const table = await screen.findByRole('table', { name: 'Promo codes' });
    expect(within(table).getByText('₹200')).toBeInTheDocument();
  });

  it('asks for the units of a product set to a number before sending', async () => {
    signIn(superAdminPermissions('ADMIN_L2'));
    const user = userEvent.setup();
    renderPage();

    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Discount %'), '20');
    await user.click(within(within(dialog).getByRole('group', { name: 'Products' })).getByRole('radio', { name: 'Selected' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Add RudraX' }));
    await user.click(within(within(dialog).getByRole('group', { name: 'Units of RudraX' })).getByRole('radio', { name: 'Number' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create promo code' }));

    expect(within(dialog).getByText('RudraX: Enter on how many units it works.')).toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton', { name: 'Units of RudraX' })).toHaveAttribute('aria-invalid', 'true');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('never lets the code change when editing, saves the rest and refreshes only the list and that code', async () => {
    signIn(superAdminPermissions('ADMIN_L2'));
    api.update.mockResolvedValue(ok({ ...DETAIL, discountPercentage: 25 }, 'Promo code saved'));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'TINQA7KQ3MZP' }));
    const detail = await screen.findByRole('dialog', { name: 'Promo code TINQA7KQ3MZP' });
    await user.click(await within(detail).findByRole('button', { name: 'Edit' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit TINQA7KQ3MZP' });
    expect(within(dialog).getByLabelText('Code')).toHaveAttribute('readonly');
    expect(within(dialog).queryByRole('button', { name: 'Suggest another' })).not.toBeInTheDocument();
    expect(within(within(dialog).getByRole('group', { name: 'Valid for' })).getByRole('radio', { name: '6 months' })).toBeChecked();
    expect(within(dialog).getByText('The code itself never changes. Everything else can, for later orders.')).toBeInTheDocument();
    const discount = within(dialog).getByLabelText('Discount %');
    await user.clear(discount);
    await user.type(discount, '25');
    // The product's saved units come back, and can be changed
    const units = within(dialog).getByRole('spinbutton', { name: 'Units of RudraX' });
    expect(units).toHaveValue(1);
    await user.clear(units);
    await user.type(units, '2');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(1, {
        code: 'TINQA7KQ3MZP', description: 'Diwali offer', discountType: 'PERCENTAGE', discountPercentage: 25, amountOff: null,
        customerScope: 'SELECTED', customerIds: [7], productScope: 'SELECTED', products: [{ productId: 12, maxUnits: 2 }],
        maxUnitsPerProduct: null, usageLimitPerCustomer: 1, totalUsageLimit: null,
        startsOn: '2026-11-04', expiresOn: '2027-05-03', active: true,
      })
    );
    const reopened = await screen.findByRole('dialog', { name: 'Promo code TINQA7KQ3MZP' });
    expect(within(reopened).getByText('25% off the list price')).toBeInTheDocument();
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    // The saved detail came back with the answer: it is not asked for again
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.suggestCode).not.toHaveBeenCalled();
  });

  it('switches a code off from the list after confirming', async () => {
    signIn(superAdminPermissions('ADMIN_L2'));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Switch off TINQA7KQ3MZP' }));
    expect(screen.getByText('Switch off TINQA7KQ3MZP?')).toBeInTheDocument();
    expect(api.setActive).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Switch off' }));

    await waitFor(() => expect(api.setActive).toHaveBeenCalledWith(1, false));
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  });

  it('deletes a code after confirming, and offers only Restore for a deleted one', async () => {
    signIn(superAdminPermissions('ADMIN_L2'));
    api.remove.mockResolvedValue(ok({ ...DETAIL, ...DELETED }, 'Promo code deleted'));
    api.restore.mockResolvedValue(ok(DETAIL, 'Promo code restored'));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Delete TINQA7KQ3MZP' }));
    expect(screen.getByText('Delete TINQA7KQ3MZP?')).toBeInTheDocument();
    expect(screen.getByText(/Choose "Deleted" in the status filter/)).toBeInTheDocument();
    expect(api.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith(1));
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));

    // Under the Deleted filter the row can only be restored
    api.list.mockResolvedValue(page([DELETED]));
    await user.selectOptions(screen.getByLabelText('Status'), 'DELETED');
    const table = await screen.findByRole('table', { name: 'Promo codes' });
    await waitFor(() => expect(within(table).getByText('Deleted')).toBeInTheDocument());
    expect(within(table).queryByRole('button', { name: /Switch|Delete/ })).not.toBeInTheDocument();
    await user.click(within(table).getByRole('button', { name: 'Restore TINQA7KQ3MZP' }));
    await user.click(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(api.restore).toHaveBeenCalledWith(1));
  });

  it('shows a deleted code with only Restore in its detail', async () => {
    signIn(superAdminPermissions('ADMIN_L2'));
    api.list.mockResolvedValue(page([DELETED]));
    api.get.mockResolvedValue(ok({ ...DETAIL, ...DELETED }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'TINQA7KQ3MZP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Promo code TINQA7KQ3MZP' });
    expect(await within(dialog).findByText(/deleted by superadmin/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Edit|Delete|Switch/ })).not.toBeInTheDocument();
  });

  it('shows only view controls to a Level 1 Super Admin (PROMO_CODE_MANAGE is Level 2 only)', async () => {
    signIn(superAdminPermissions('ADMIN_L1'));
    renderPage();
    await screen.findByRole('table', { name: 'Promo codes' });
    expect(screen.queryByRole('button', { name: 'New promo code' })).not.toBeInTheDocument();
    expect(api.suggestCode).not.toHaveBeenCalled();
  });
});

describe('promo code form rules', () => {
  it('works out the last day of a preset, both days included', () => {
    expect(lastDayOf('2026-11-04', 6)).toBe('2027-05-03');
    expect(lastDayOf('2026-11-04', 12)).toBe('2027-11-03');
    expect(lastDayOf('2026-11-04', 24)).toBe('2028-11-03');
    expect(lastDayOf('2026-08-31', 6)).toBe('2027-02-27');
  });

  it("takes today in India time", () => {
    expect(todayInIndia(new Date('2026-11-03T20:00:00Z'))).toBe('2026-11-04');
    expect(todayInIndia(new Date('2026-11-03T18:00:00Z'))).toBe('2026-11-03');
  });

  it('sends numbers for set limits and null for every unit and no limit', () => {
    const form = {
      ...emptyForm('2026-11-04'), code: 'TINQAABC', discountPercentage: '12.5', maxUnitsPerProduct: '2', perCustomer: 'CUSTOM' as const,
      perCustomerCustom: '3', total: 'LIMITED' as const, totalLimit: '50',
    };
    expect(toRequest(form)).toMatchObject({
      discountPercentage: 12.5, customerScope: 'ALL', customerIds: [], productScope: 'ALL', products: [],
      maxUnitsPerProduct: 2, usageLimitPerCustomer: 3, totalUsageLimit: 50, startsOn: '2026-11-04', expiresOn: '2027-05-03',
    });
    expect(toRequest({ ...form, maxUnitsPerProduct: '', perCustomer: 'ONCE', total: 'UNLIMITED' })).toMatchObject({
      maxUnitsPerProduct: null, usageLimitPerCustomer: 1, totalUsageLimit: null,
    });
    // Chosen products carry their own units; the one number for all products is then not sent
    const chosen = {
      ...form, productScope: 'SELECTED' as const,
      products: [{ id: 12, title: 'RudraX', units: 'LIMITED' as const, maxUnits: '1' }, { id: 14, title: 'Lamp', units: 'ALL' as const, maxUnits: '' }],
    };
    expect(toRequest(chosen)).toMatchObject({ products: [{ productId: 12, maxUnits: 1 }, { productId: 14, maxUnits: null }], maxUnitsPerProduct: null });
  });

  it('validates like the server', () => {
    const base = { ...emptyForm('2026-11-04'), code: 'TINQAABC', discountPercentage: '99.99' };
    const rules = { creating: true, checkCode: true, today: '2026-11-04' };
    expect(validateForm(base, rules)).toEqual({});
    expect(Object.keys(validateForm({ ...base, code: 'PROMOABC', discountPercentage: '0', customerScope: 'SELECTED', productScope: 'SELECTED', maxUnitsPerProduct: '0' }, rules)).sort())
      .toEqual(['code', 'customerIds', 'discountPercentage', 'products']);
    expect(validateForm({ ...base, maxUnitsPerProduct: '0' }, rules)).toHaveProperty('maxUnitsPerProduct');
    // An amount instead: only the amount is checked, above 0 and at most 1,000
    expect(validateForm({ ...base, discountType: 'AMOUNT', discountPercentage: '', amountOff: '1000' }, rules)).toEqual({});
    expect(Object.keys(validateForm({ ...base, discountType: 'AMOUNT', amountOff: '1000.01' }, rules))).toEqual(['amountOff']);
    expect(Object.keys(validateForm({ ...base, discountType: 'AMOUNT', amountOff: '0' }, rules))).toEqual(['amountOff']);
    expect(validateForm({ ...base, productScope: 'SELECTED', products: [{ id: 12, title: 'RudraX', units: 'LIMITED', maxUnits: '0' }] }, rules).products)
      .toBe('RudraX: Units must be a whole number of at least 1.');
    expect(validateForm({ ...base, validity: 'CUSTOM', startsOn: '2026-11-01', expiresOn: '2026-11-02' }, rules).expiresOn).toBe('The last day cannot be in the past.');
    expect(validateForm({ ...base, validity: 'CUSTOM', expiresOn: '2026-11-01' }, rules).expiresOn).toBe('The last day cannot be before the first day.');
    // An edit never checks the code (it can't change), and may keep a last day that has passed
    expect(validateForm({ ...formOf(DETAIL), code: 'OLD', validity: 'CUSTOM', startsOn: '2026-01-01', expiresOn: '2026-02-01' }, { creating: false, checkCode: false, today: '2026-11-04' })).toEqual({});
  });
});
