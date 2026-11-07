import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import profileReducer from '../../store/profileSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { axiosClient } from '../../api/axiosClient';
import { supplierPortalApi } from './api/supplierPortalApi';
import { supplierPaymentApi } from '../order-management/api/supplierPaymentApi';
import { paymentEntry, paymentSummary, paymentsOf } from '../order-management/test/paymentFixtures';
import { SupplierQuotationsPage } from './pages/SupplierQuotationsPage';
import { SupplierOrdersPage } from './pages/SupplierOrdersPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { PrintOrderPage } from '../printing/pages/PrintOrderPage';
import { APP_NAVIGATION } from '../../config/permissions.config';
import { SUPPLIER_PORTAL, signInAsSupplier, superAdminPermissions } from '../../test/access';
import type { SupplierOrder, SupplierProfile } from './types/supplierPortal.types';
import type { OrderStatus } from '../../types/common.types';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn().mockResolvedValue({ data: { success: true, data: { legalName: 'TinQa Pvt Ltd', gstin: '29ABCDE1234F1Z5' } } }) },
}));
vi.mock('./api/supplierPortalApi', () => ({
  supplierPortalApi: {
    getProfile: vi.fn(),
    getItems: vi.fn(),
    getOrders: vi.fn(),
    getOrder: vi.fn(),
    createQuotation: vi.fn(),
    requestChange: vi.fn(),
    withdrawChange: vi.fn(),
    respondToOrder: vi.fn(),
    markShipped: vi.fn(),
  },
}));
const portal = vi.mocked(supplierPortalApi);
vi.mock('../order-management/api/supplierPaymentApi', () => ({ supplierPaymentApi: { forSupplier: vi.fn() } }));
const supplierPayments = vi.mocked(supplierPaymentApi);

/** Opens one part (tab) of the quotation form. */
const openTab = (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, name: RegExp) =>
  user.click(within(dialog).getByRole('tab', { name }));

/** How the supplier wants to be paid: the plan starts at 30 / 30 / 40, the method has to be chosen. */
const choosePaymentMethod = async (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, method = 'BANK_TRANSFER') => {
  await openTab(user, dialog, /Payment plan/);
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Expected payment method' }), method);
};

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, timestamp: '', path: '', data });

const order = (id: number, orderStatus: OrderStatus, extra: Partial<SupplierOrder> = {}): SupplierOrder => ({
  id,
  orderNumber: `ORD-${id}`,
  itemId: 5,
  itemName: 'Copper wire',
  itemSku: 'CW-1',
  orderQuantity: 10,
  unitType: 'PCS',
  unitPrice: 100,
  shipmentPrice: 50,
  totalPrice: 1050,
  taxBreakup: {},
  advancePercent: 30,
  midtermPercent: 30,
  finalPercent: 40,
  expectedPaymentMethod: 'CHEQUE',
  orderStatus,
  orderDate: '2026-10-10',
  // Far in the future: the change form refuses a delivery date before today, so a near date expires the test.
  expectedDelivery: '2099-12-31',
  actualDelivery: orderStatus === 'DELIVERED' ? '2026-10-18' : null,
  createdAt: '2026-10-10T10:00:00',
  note: null,
  raisedByYou: true,
  changeable: orderStatus === 'QUOTATION',
  awaitingYourResponse: orderStatus === 'SUPPLIER_LEVEL_PENDING',
  shippable: orderStatus === 'CONFIRMED',
  pendingChange: null,
  ...extra,
});

const PROFILE: SupplierProfile = {
  supplierId: 3,
  name: 'Shree Metals',
  tradeName: null,
  email: 'sales@shree.test',
  phoneNumber: '+919800000000',
  alternatePhoneNumber: null,
  street: '12 MG Road',
  landmark: null,
  city: 'Pune',
  district: null,
  state: 'Maharashtra',
  country: 'India',
  pincode: '411001',
  gstin: '27ABCDE1234F1Z5',
  panNumber: 'ABCDE1234F',
  username: 'shree',
};

const renderAt = (path: string) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer, profile: profileReducer } })}>
      <MemoryRouter initialEntries={[path]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/supplier/quotations" element={<SupplierQuotationsPage />} />
          <Route path="/supplier/orders" element={<SupplierOrdersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/print/orders/:orderId/:document" element={<PrintOrderPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  signInAsSupplier();
  portal.getOrders.mockResolvedValue(
    ok([order(1, 'QUOTATION'), order(2, 'PENDING', { changeable: false }), order(3, 'SHIPPED'), order(4, 'DELIVERED'), order(5, 'CANCELLED')])
  );
  portal.getItems.mockResolvedValue(ok([{ id: 5, name: 'Copper wire', brand: null, sku: 'CW-1', unitOfMeasure: 'PCS', mrp: 90 }]));
  portal.getProfile.mockResolvedValue(ok(PROFILE));
  supplierPayments.forSupplier.mockResolvedValue(paymentsOf());
});

describe('Supplier portal', () => {
  it('opens only the supplier modules for a supplier, and none of them for staff', () => {
    const opens = (permissions: readonly string[]) =>
      APP_NAVIGATION.filter((item) => item.requires.some((p) => permissions.includes(p))).map((item) => item.id);
    expect(opens(SUPPLIER_PORTAL)).toEqual(['supplier-quotations', 'supplier-orders']);
    expect(opens(superAdminPermissions('ADMIN_L2'))).not.toContain('supplier-quotations');
  });

  it('lists open quotations and creates one with the supplier’s own price and the reason for it', async () => {
    const user = userEvent.setup();
    portal.createQuotation.mockResolvedValue(ok(order(9, 'QUOTATION')));
    renderAt('/supplier/quotations');

    expect(await screen.findByText('ORD-1')).toBeInTheDocument();
    expect(screen.getByText('ORD-2')).toBeInTheDocument();
    expect(screen.getByText('Under review')).toBeInTheDocument();
    expect(screen.queryByText('ORD-3')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /New quotation/ }));
    const dialog = await screen.findByRole('dialog', { name: 'New quotation' });
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Copper wire/ })).toBeInTheDocument());
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /^Item/ }), '5');
    await user.type(within(dialog).getByLabelText(/Quantity/), '20');
    // The item's existing price is shown read-only; the reason opens only for a different price
    expect(within(dialog).getByLabelText(/Existing price/)).toHaveValue(90);
    expect(within(dialog).getByLabelText(/Existing price/)).toBeDisabled();
    expect(within(dialog).getByLabelText(/Reason for the new price/)).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/New quoted price/), '95');
    await user.clear(within(dialog).getByLabelText(/Shipment price/));
    await user.type(within(dialog).getByLabelText(/Shipment price/), '100');
    expect(within(dialog).getByTestId('quotation-total')).toHaveTextContent('₹2,000.00');
    expect(within(dialog).getByTestId('order-price-difference')).toHaveTextContent('+₹5.00');
    const create = within(dialog).getByRole('button', { name: 'Create quotation' });
    expect(create).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/Reason for the new price/), 'Copper went up');
    // The payment plan: 30 % advance and 30 % midterm to start with, the rest after testing; the method is chosen
    expect(create).toBeDisabled();
    await choosePaymentMethod(user, dialog, 'CHEQUE');
    await user.click(create);

    await waitFor(() =>
      expect(portal.createQuotation).toHaveBeenCalledWith({
        itemId: 5,
        orderQuantity: 20,
        unitType: 'PCS',
        unitPrice: 95,
        shipmentPrice: 100,
        advancePercent: 30,
        midtermPercent: 30,
        expectedPaymentMethod: 'CHEQUE',
        expectedDelivery: undefined,
        note: undefined,
        priceChangeReason: 'Copper went up',
      })
    );
    // The supplier is never part of the request: the server takes it from the signed-in account
    expect(portal.createQuotation.mock.calls[0][0]).not.toHaveProperty('supplierId');
  });

  it('splits the quotation form into parts, marking what is still needed or wrong, and keeps typed values across parts', async () => {
    const user = userEvent.setup();
    renderAt('/supplier/quotations');
    await user.click(await screen.findByRole('button', { name: /New quotation/ }));
    const dialog = await screen.findByRole('dialog', { name: 'New quotation' });
    const tabs = within(within(dialog).getByRole('tablist', { name: 'Quotation sections' })).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining('Item & price'),
      expect.stringContaining('GST'),
      expect.stringContaining('Payment plan'),
      expect.stringContaining('Delivery & remarks'),
    ]);
    expect(within(dialog).getByText('Step 1 of 4')).toBeInTheDocument();
    expect(within(tabs[0]).getByRole('img', { name: 'still needed to submit' })).toBeInTheDocument();

    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Copper wire/ })).toBeInTheDocument());
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /^Item/ }), '5');
    await user.type(within(dialog).getByLabelText(/Quantity/), '10');
    expect(within(tabs[0]).getByRole('img', { name: 'done' })).toBeInTheDocument();

    // An unfinished GST breakup marks its part as wrong
    await user.click(within(dialog).getByRole('button', { name: /Next/ }));
    expect(within(dialog).getByText('Step 2 of 4')).toBeInTheDocument();
    await user.click(within(dialog).getByLabelText(/Add GST breakup/));
    expect(within(tabs[1]).getByRole('img', { name: 'has errors' })).toBeInTheDocument();

    // Going back shows what was typed, and the total stays below every part
    await user.click(tabs[0]);
    expect(within(dialog).getByLabelText(/Quantity/)).toHaveValue(10);
    expect(within(dialog).getByTestId('quotation-total')).toHaveTextContent('₹900.00');
  });

  it('quotes the item’s existing price when no new price is given, without a reason', async () => {
    const user = userEvent.setup();
    portal.createQuotation.mockResolvedValue(ok(order(9, 'QUOTATION')));
    renderAt('/supplier/quotations');

    await user.click(await screen.findByRole('button', { name: /New quotation/ }));
    const dialog = await screen.findByRole('dialog', { name: 'New quotation' });
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Copper wire/ })).toBeInTheDocument());
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /^Item/ }), '5');
    await user.type(within(dialog).getByLabelText(/Quantity/), '10');
    expect(within(dialog).getByTestId('quotation-total')).toHaveTextContent('₹900.00');
    await choosePaymentMethod(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Create quotation' }));

    await waitFor(() => expect(portal.createQuotation).toHaveBeenCalledWith(expect.objectContaining({ unitPrice: 90 })));
    expect(portal.createQuotation.mock.calls[0][0].priceChangeReason).toBeUndefined();
  });

  it('sends only the changed fields of a quotation, with the reason, for approval', async () => {
    const user = userEvent.setup();
    portal.requestChange.mockResolvedValue(
      ok({ id: 40, changes: { unitPrice: 90 }, previous: { unitPrice: 100 }, proposedTotalPrice: 950, reason: 'Bulk', status: 'PENDING', requestedAt: '', decidedAt: null, decisionReason: null })
    );
    renderAt('/supplier/quotations');

    await user.click(await screen.findByRole('button', { name: 'Request a change to ORD-1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Change quotation ORD-1' });
    const send = within(dialog).getByRole('button', { name: 'Send for approval' });
    expect(send).toBeDisabled();

    await user.clear(within(dialog).getByLabelText(/Unit price/));
    await user.type(within(dialog).getByLabelText(/Unit price/), '90');
    // The reason sits with the delivery terms, in the last part
    await openTab(user, dialog, /Delivery & reason/);
    await user.type(within(dialog).getByLabelText(/Reason for the change/), 'Bulk');
    await user.click(send);

    await waitFor(() => expect(portal.requestChange).toHaveBeenCalledWith(1, { unitPrice: 90, reason: 'Bulk' }));
    // No change is offered on a quotation that is already under review
    expect(screen.queryByRole('button', { name: 'Request a change to ORD-2' })).not.toBeInTheDocument();
  });

  it('quotes the GST breakup with the price, and proposes a new rate as a change', async () => {
    const user = userEvent.setup();
    portal.createQuotation.mockResolvedValue(ok(order(9, 'QUOTATION')));
    portal.requestChange.mockResolvedValue(
      ok({ id: 41, changes: {}, previous: {}, proposedTotalPrice: 1050, reason: null, status: 'PENDING', requestedAt: '', decidedAt: null, decisionReason: null })
    );
    renderAt('/supplier/quotations');

    await user.click(await screen.findByRole('button', { name: /New quotation/ }));
    const dialog = await screen.findByRole('dialog', { name: 'New quotation' });
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Copper wire/ })).toBeInTheDocument());
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /^Item/ }), '5');
    await user.type(within(dialog).getByLabelText(/Quantity/), '20');
    await user.type(within(dialog).getByLabelText(/New quoted price/), '95');
    await user.type(within(dialog).getByLabelText(/Reason for the new price/), 'Copper went up');
    await user.clear(within(dialog).getByLabelText(/Shipment price/));
    await user.type(within(dialog).getByLabelText(/Shipment price/), '100');

    await openTab(user, dialog, /GST/);
    await user.click(within(dialog).getByLabelText(/Add GST breakup/));
    const create = within(dialog).getByRole('button', { name: 'Create quotation' });
    // Once added, the breakup has to be complete
    expect(create).toBeDisabled();
    await user.click(within(dialog).getByLabelText(/Supplier in our state/));
    await user.selectOptions(within(dialog).getByLabelText('GST rate'), '18');
    await user.type(within(dialog).getByLabelText('HSN / SAC'), '7408');
    expect(within(dialog).getByLabelText('SGST')).toHaveValue('180.00');
    expect(within(dialog).getByTestId('quotation-grand-total')).toHaveTextContent('₹2,360.00');

    // A typed amount more than ₹1 away from the rate is refused
    await user.type(within(dialog).getByLabelText('CGST'), '150');
    expect(within(dialog).getByText(/At 18% this is ₹180.00/)).toBeInTheDocument();
    expect(create).toBeDisabled();
    await user.clear(within(dialog).getByLabelText('CGST'));
    await choosePaymentMethod(user, dialog);
    await user.click(create);

    await waitFor(() =>
      expect(portal.createQuotation).toHaveBeenCalledWith(
        expect.objectContaining({ unitPrice: 95, taxBreakup: { supplyType: 'INTRA_STATE', gstRate: 18, hsnSac: '7408' } })
      )
    );

    await user.click(await screen.findByRole('button', { name: 'Request a change to ORD-1' }));
    const change = await screen.findByRole('dialog', { name: 'Change quotation ORD-1' });
    await openTab(user, change, /GST/);
    await user.click(within(change).getByLabelText(/Add GST breakup/));
    await user.click(within(change).getByLabelText(/Supplier in another state/));
    await user.selectOptions(within(change).getByLabelText('GST rate'), '5');
    expect(within(change).getByTestId('quotation-grand-total')).toHaveTextContent('₹1,102.50');
    await user.click(within(change).getByRole('button', { name: 'Send for approval' }));
    await waitFor(() =>
      expect(portal.requestChange).toHaveBeenCalledWith(1, { taxBreakup: { supplyType: 'INTER_STATE', gstRate: 5 }, reason: undefined })
    );
  });

  it('proposes a new payment plan as a change, with the final part worked out', async () => {
    const user = userEvent.setup();
    portal.requestChange.mockResolvedValue(
      ok({ id: 42, changes: { advancePercent: 50 }, previous: { advancePercent: 30 }, proposedTotalPrice: 1050, reason: null, status: 'PENDING', requestedAt: '', decidedAt: null, decisionReason: null })
    );
    renderAt('/supplier/quotations');
    await user.click(await screen.findByRole('button', { name: 'Request a change to ORD-1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Change quotation ORD-1' });
    await openTab(user, dialog, /Payment plan/);
    const advance = within(dialog).getByRole('spinbutton', { name: /Advance/ });
    await user.clear(advance);
    await user.type(advance, '50');
    expect(within(dialog).getByTestId('plan-final-percent')).toHaveValue('20%');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Expected payment method' }), 'ONLINE');
    await user.click(within(dialog).getByRole('button', { name: 'Send for approval' }));
    await waitFor(() =>
      expect(portal.requestChange).toHaveBeenCalledWith(1, { advancePercent: 50, expectedPaymentMethod: 'ONLINE', reason: undefined })
    );
  });

  it('shows the supplier what they were paid and any refund they owe', async () => {
    const user = userEvent.setup();
    supplierPayments.forSupplier.mockResolvedValue(
      paymentsOf(
        paymentSummary({
          orderStatus: 'DELIVERED', tested: true, unitsPassed: 8, unitsFailed: 2, payable: 850, paid: 1050, outstanding: 0, payableNow: 0,
          openMilestones: ['ADVANCE', 'MIDTERM', 'FINAL'],
          claim: { id: 1, cause: 'FAILED_TESTING', failedUnits: 2, claimedAmount: 200, agreedAmount: 200, adjustReason: null, adjustedAt: null,
            refunded: 0, refundDue: 200, status: 'OPEN', openedAt: '2026-10-20T10:00:00Z', settledAt: null },
        }),
        [paymentEntry({ recordedBy: null, recordedByUsername: null, decidedByUsername: null, amount: 1050 })]
      )
    );
    portal.getOrders.mockResolvedValue(ok([order(3, 'SHIPPED')]));
    portal.getOrder.mockResolvedValue(ok(order(3, 'DELIVERED', { history: [] })));
    renderAt('/supplier/orders');
    await user.click(await screen.findByRole('button', { name: 'View ORD-3' }));
    const panel = within(await screen.findByRole('region', { name: 'Payments to the supplier' }));
    expect(panel.getByTestId('payment-paid')).toHaveTextContent('₹1,050.00');
    expect(panel.getByRole('alert')).toHaveTextContent('Refund due from the supplier: ₹200.00');
    expect(panel.getByRole('alert')).toHaveTextContent('2 failed; they go back to the supplier');
    // The supplier only reads: nothing to record, confirm or change
    expect(panel.queryByRole('button')).not.toBeInTheDocument();
    expect(supplierPayments.forSupplier).toHaveBeenCalledWith(3);
  });

  it('splits orders into ongoing and past, and offers the bill only once delivered', async () => {
    const user = userEvent.setup();
    renderAt('/supplier/orders');

    const shippedRow = (await screen.findByText('ORD-3')).closest('tr')!;
    expect(within(shippedRow).getByRole('button', { name: 'Print purchase order' })).toBeInTheDocument();
    expect(within(shippedRow).queryByRole('button', { name: 'Print bill' })).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-4')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Past orders/ }));
    const deliveredRow = (await screen.findByText('ORD-4')).closest('tr')!;
    expect(within(deliveredRow).getByRole('button', { name: 'Print bill' })).toBeInTheDocument();
    const cancelledRow = screen.getByText('ORD-5').closest('tr')!;
    expect(within(cancelledRow).queryByRole('button', { name: 'Print purchase order' })).not.toBeInTheDocument();
  });

  it('prints a delivered order’s bill from the supplier’s own records, and refuses a bill for a quotation', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    portal.getOrder.mockResolvedValueOnce(ok(order(4, 'DELIVERED')));
    const { unmount } = renderAt('/print/orders/4/bill');

    expect(await screen.findByRole('heading', { name: 'Bill' })).toBeInTheDocument();
    expect(screen.getByText('Shree Metals')).toBeInTheDocument();
    expect(screen.getAllByText('TinQa Pvt Ltd').length).toBeGreaterThan(0);
    expect(screen.getByTestId('print-total')).toHaveTextContent('₹1,050.00');
    expect(screen.getByTestId('print-payment-plan')).toHaveTextContent('Payment terms: 30% advance · 30% midterm · 40% after testing · Cheque.');
    await waitFor(() => expect(print).toHaveBeenCalled());
    expect(axiosClient.get).not.toHaveBeenCalled();
    unmount();

    portal.getOrder.mockResolvedValueOnce(ok(order(1, 'QUOTATION')));
    renderAt('/print/orders/1/bill');
    expect(await screen.findByText(/isn't available for order ORD-1/)).toBeInTheDocument();
    print.mockRestore();
  });

  it('shows a supplier their business details, never the employee profile', async () => {
    renderAt('/profile');
    expect(await screen.findByText('Shree Metals')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Supplier Profile' })).toBeInTheDocument();
    expect(axiosClient.get).not.toHaveBeenCalledWith('/v1/admin/profile');
  });

  it('lets the supplier accept an order awaiting them, or reject it only with a reason', async () => {
    const user = userEvent.setup();
    portal.getOrders.mockResolvedValue(ok([order(6, 'SUPPLIER_LEVEL_PENDING', { raisedByYou: false }), order(3, 'SHIPPED')]));
    portal.getOrder.mockResolvedValue(ok(order(6, 'SUPPLIER_LEVEL_PENDING', { raisedByYou: false, history: [] })));
    portal.respondToOrder.mockResolvedValue(ok(order(6, 'CANCELLED')));
    renderAt('/supplier/orders');

    expect(await screen.findByText(/1 order is waiting for you to accept or reject/)).toBeInTheDocument();
    expect(screen.getByText('Needs your response')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review ORD-6' }));
    const dialog = await screen.findByRole('dialog', { name: 'Order ORD-6' });

    await user.click(await within(dialog).findByRole('button', { name: 'Reject' }));
    await user.click(within(dialog).getByRole('button', { name: 'Reject order' }));
    expect(within(dialog).getByText(/Tell the procurement team why/)).toBeInTheDocument();
    expect(portal.respondToOrder).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/Reason for rejecting/), 'Out of stock');
    await user.click(within(dialog).getByRole('button', { name: 'Reject order' }));
    await waitFor(() => expect(portal.respondToOrder).toHaveBeenCalledWith(6, { decision: 'REJECT', reason: 'Out of stock' }));

    await user.click(within(dialog).getByRole('button', { name: 'Back' }));
    await user.click(within(dialog).getByRole('button', { name: 'Accept order' }));
    await waitFor(() => expect(portal.respondToOrder).toHaveBeenCalledWith(6, { decision: 'ACCEPT' }));
  });

  it('lets the supplier mark a confirmed order as shipped after confirming once', async () => {
    const user = userEvent.setup();
    portal.getOrders.mockResolvedValue(ok([order(7, 'CONFIRMED', { raisedByYou: false })]));
    portal.getOrder.mockResolvedValue(ok(order(7, 'CONFIRMED', { raisedByYou: false, history: [] })));
    portal.markShipped.mockResolvedValue(ok(order(7, 'SHIPPED')));
    renderAt('/supplier/orders');

    await user.click(await screen.findByRole('button', { name: 'View ORD-7' }));
    const dialog = await screen.findByRole('dialog', { name: 'Order ORD-7' });
    await user.click(await within(dialog).findByRole('button', { name: 'Mark as shipped' }));
    expect(portal.markShipped).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Yes, mark as shipped' }));
    await waitFor(() => expect(portal.markShipped).toHaveBeenCalledWith(7));
  });

  it('offers shipping only on confirmed orders', async () => {
    const user = userEvent.setup();
    portal.getOrder.mockResolvedValue(ok(order(3, 'SHIPPED', { history: [] })));
    renderAt('/supplier/orders');
    await user.click(await screen.findByRole('button', { name: 'View ORD-3' }));
    const dialog = await screen.findByRole('dialog', { name: 'Order ORD-3' });
    await within(dialog).findByText('Quantity');
    expect(within(dialog).queryByRole('button', { name: /Mark as shipped/ })).not.toBeInTheDocument();
  });

  it('reminds the supplier on their profile about orders awaiting them', async () => {
    portal.getOrders.mockResolvedValue(ok([order(6, 'SUPPLIER_LEVEL_PENDING')]));
    renderAt('/profile');
    expect(await screen.findByText(/Order ORD-6 is waiting for you to accept or reject/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review in My Orders' })).toHaveAttribute('href', '/supplier/orders');
  });
});
