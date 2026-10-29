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
import { dealerPortalApi } from './api/dealerPortalApi';
import { DealerQuotationsPage } from './pages/DealerQuotationsPage';
import { DealerOrdersPage } from './pages/DealerOrdersPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { PrintOrderPage } from '../printing/pages/PrintOrderPage';
import { APP_NAVIGATION } from '../../config/permissions.config';
import { DEALER_PORTAL, signInAsDealer, superAdminPermissions } from '../../test/access';
import type { DealerOrder, DealerProfile } from './types/dealerPortal.types';
import type { OrderStatus } from '../../types/common.types';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn().mockResolvedValue({ data: { success: true, data: { legalName: 'TinQa Pvt Ltd', gstin: '29ABCDE1234F1Z5' } } }) },
}));
vi.mock('./api/dealerPortalApi', () => ({
  dealerPortalApi: {
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
const portal = vi.mocked(dealerPortalApi);

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, timestamp: '', path: '', data });

const order = (id: number, orderStatus: OrderStatus, extra: Partial<DealerOrder> = {}): DealerOrder => ({
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
  orderStatus,
  orderDate: '2026-10-10',
  expectedDelivery: '2026-10-30',
  actualDelivery: orderStatus === 'DELIVERED' ? '2026-10-18' : null,
  createdAt: '2026-10-10T10:00:00',
  note: null,
  raisedByYou: true,
  changeable: orderStatus === 'QUOTATION',
  awaitingYourResponse: orderStatus === 'DEALER_LEVEL_PENDING',
  shippable: orderStatus === 'CONFIRMED',
  pendingChange: null,
  ...extra,
});

const PROFILE: DealerProfile = {
  dealerId: 3,
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
          <Route path="/dealer/quotations" element={<DealerQuotationsPage />} />
          <Route path="/dealer/orders" element={<DealerOrdersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/print/orders/:orderId/:document" element={<PrintOrderPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  signInAsDealer();
  portal.getOrders.mockResolvedValue(
    ok([order(1, 'QUOTATION'), order(2, 'PENDING', { changeable: false }), order(3, 'SHIPPED'), order(4, 'DELIVERED'), order(5, 'CANCELLED')])
  );
  portal.getItems.mockResolvedValue(ok([{ id: 5, name: 'Copper wire', brand: null, sku: 'CW-1', unitOfMeasure: 'PCS', mrp: 90 }]));
  portal.getProfile.mockResolvedValue(ok(PROFILE));
});

describe('Dealer portal', () => {
  it('opens only the dealer modules for a dealer, and none of them for staff', () => {
    const opens = (permissions: readonly string[]) =>
      APP_NAVIGATION.filter((item) => item.requires.some((p) => permissions.includes(p))).map((item) => item.id);
    expect(opens(DEALER_PORTAL)).toEqual(['dealer-quotations', 'dealer-orders']);
    expect(opens(superAdminPermissions('ADMIN_L2'))).not.toContain('dealer-quotations');
  });

  it('lists open quotations and creates one with the dealer’s own price and the reason for it', async () => {
    const user = userEvent.setup();
    portal.createQuotation.mockResolvedValue(ok(order(9, 'QUOTATION')));
    renderAt('/dealer/quotations');

    expect(await screen.findByText('ORD-1')).toBeInTheDocument();
    expect(screen.getByText('ORD-2')).toBeInTheDocument();
    expect(screen.getByText('Under review')).toBeInTheDocument();
    expect(screen.queryByText('ORD-3')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /New quotation/ }));
    const dialog = await screen.findByRole('dialog', { name: 'New quotation' });
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Copper wire/ })).toBeInTheDocument());
    await user.selectOptions(within(dialog).getByLabelText(/Item/), '5');
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
    await user.click(create);

    await waitFor(() =>
      expect(portal.createQuotation).toHaveBeenCalledWith({
        itemId: 5,
        orderQuantity: 20,
        unitType: 'PCS',
        unitPrice: 95,
        shipmentPrice: 100,
        expectedDelivery: undefined,
        note: undefined,
        priceChangeReason: 'Copper went up',
      })
    );
    // The dealer is never part of the request: the server takes it from the signed-in account
    expect(portal.createQuotation.mock.calls[0][0]).not.toHaveProperty('dealerId');
  });

  it('quotes the item’s existing price when no new price is given, without a reason', async () => {
    const user = userEvent.setup();
    portal.createQuotation.mockResolvedValue(ok(order(9, 'QUOTATION')));
    renderAt('/dealer/quotations');

    await user.click(await screen.findByRole('button', { name: /New quotation/ }));
    const dialog = await screen.findByRole('dialog', { name: 'New quotation' });
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Copper wire/ })).toBeInTheDocument());
    await user.selectOptions(within(dialog).getByLabelText(/Item/), '5');
    await user.type(within(dialog).getByLabelText(/Quantity/), '10');
    expect(within(dialog).getByTestId('quotation-total')).toHaveTextContent('₹900.00');
    await user.click(within(dialog).getByRole('button', { name: 'Create quotation' }));

    await waitFor(() => expect(portal.createQuotation).toHaveBeenCalledWith(expect.objectContaining({ unitPrice: 90 })));
    expect(portal.createQuotation.mock.calls[0][0].priceChangeReason).toBeUndefined();
  });

  it('sends only the changed fields of a quotation, with the reason, for approval', async () => {
    const user = userEvent.setup();
    portal.requestChange.mockResolvedValue(
      ok({ id: 40, changes: { unitPrice: 90 }, previous: { unitPrice: 100 }, proposedTotalPrice: 950, reason: 'Bulk', status: 'PENDING', requestedAt: '', decidedAt: null, decisionReason: null })
    );
    renderAt('/dealer/quotations');

    await user.click(await screen.findByRole('button', { name: 'Request a change to ORD-1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Change quotation ORD-1' });
    const send = within(dialog).getByRole('button', { name: 'Send for approval' });
    expect(send).toBeDisabled();

    await user.clear(within(dialog).getByLabelText(/Unit price/));
    await user.type(within(dialog).getByLabelText(/Unit price/), '90');
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
    renderAt('/dealer/quotations');

    await user.click(await screen.findByRole('button', { name: /New quotation/ }));
    const dialog = await screen.findByRole('dialog', { name: 'New quotation' });
    await waitFor(() => expect(within(dialog).getByRole('option', { name: /Copper wire/ })).toBeInTheDocument());
    await user.selectOptions(within(dialog).getByLabelText(/Item/), '5');
    await user.type(within(dialog).getByLabelText(/Quantity/), '20');
    await user.type(within(dialog).getByLabelText(/New quoted price/), '95');
    await user.type(within(dialog).getByLabelText(/Reason for the new price/), 'Copper went up');
    await user.clear(within(dialog).getByLabelText(/Shipment price/));
    await user.type(within(dialog).getByLabelText(/Shipment price/), '100');

    await user.click(within(dialog).getByLabelText(/Add GST breakup/));
    const create = within(dialog).getByRole('button', { name: 'Create quotation' });
    // Once added, the breakup has to be complete
    expect(create).toBeDisabled();
    await user.click(within(dialog).getByLabelText(/Dealer in our state/));
    await user.selectOptions(within(dialog).getByLabelText('GST rate'), '18');
    await user.type(within(dialog).getByLabelText('HSN / SAC'), '7408');
    expect(within(dialog).getByLabelText('SGST')).toHaveValue('180.00');
    expect(within(dialog).getByTestId('quotation-grand-total')).toHaveTextContent('₹2,360.00');

    // A typed amount more than ₹1 away from the rate is refused
    await user.type(within(dialog).getByLabelText('CGST'), '150');
    expect(within(dialog).getByText(/At 18% this is ₹180.00/)).toBeInTheDocument();
    expect(create).toBeDisabled();
    await user.clear(within(dialog).getByLabelText('CGST'));
    await user.click(create);

    await waitFor(() =>
      expect(portal.createQuotation).toHaveBeenCalledWith(
        expect.objectContaining({ unitPrice: 95, taxBreakup: { supplyType: 'INTRA_STATE', gstRate: 18, hsnSac: '7408' } })
      )
    );

    await user.click(await screen.findByRole('button', { name: 'Request a change to ORD-1' }));
    const change = await screen.findByRole('dialog', { name: 'Change quotation ORD-1' });
    await user.click(within(change).getByLabelText(/Add GST breakup/));
    await user.click(within(change).getByLabelText(/Dealer in another state/));
    await user.selectOptions(within(change).getByLabelText('GST rate'), '5');
    expect(within(change).getByTestId('quotation-grand-total')).toHaveTextContent('₹1,102.50');
    await user.click(within(change).getByRole('button', { name: 'Send for approval' }));
    await waitFor(() =>
      expect(portal.requestChange).toHaveBeenCalledWith(1, { taxBreakup: { supplyType: 'INTER_STATE', gstRate: 5 }, reason: undefined })
    );
  });

  it('splits orders into ongoing and past, and offers the bill only once delivered', async () => {
    const user = userEvent.setup();
    renderAt('/dealer/orders');

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

  it('prints a delivered order’s bill from the dealer’s own records, and refuses a bill for a quotation', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    portal.getOrder.mockResolvedValueOnce(ok(order(4, 'DELIVERED')));
    const { unmount } = renderAt('/print/orders/4/bill');

    expect(await screen.findByRole('heading', { name: 'Bill' })).toBeInTheDocument();
    expect(screen.getByText('Shree Metals')).toBeInTheDocument();
    expect(screen.getAllByText('TinQa Pvt Ltd').length).toBeGreaterThan(0);
    expect(screen.getByTestId('print-total')).toHaveTextContent('₹1,050.00');
    await waitFor(() => expect(print).toHaveBeenCalled());
    expect(axiosClient.get).not.toHaveBeenCalled();
    unmount();

    portal.getOrder.mockResolvedValueOnce(ok(order(1, 'QUOTATION')));
    renderAt('/print/orders/1/bill');
    expect(await screen.findByText(/isn't available for order ORD-1/)).toBeInTheDocument();
    print.mockRestore();
  });

  it('shows a dealer their business details, never the employee profile', async () => {
    renderAt('/profile');
    expect(await screen.findByText('Shree Metals')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dealer Profile' })).toBeInTheDocument();
    expect(axiosClient.get).not.toHaveBeenCalledWith('/v1/admin/profile');
  });

  it('lets the dealer accept an order awaiting them, or reject it only with a reason', async () => {
    const user = userEvent.setup();
    portal.getOrders.mockResolvedValue(ok([order(6, 'DEALER_LEVEL_PENDING', { raisedByYou: false }), order(3, 'SHIPPED')]));
    portal.getOrder.mockResolvedValue(ok(order(6, 'DEALER_LEVEL_PENDING', { raisedByYou: false, history: [] })));
    portal.respondToOrder.mockResolvedValue(ok(order(6, 'CANCELLED')));
    renderAt('/dealer/orders');

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

  it('lets the dealer mark a confirmed order as shipped after confirming once', async () => {
    const user = userEvent.setup();
    portal.getOrders.mockResolvedValue(ok([order(7, 'CONFIRMED', { raisedByYou: false })]));
    portal.getOrder.mockResolvedValue(ok(order(7, 'CONFIRMED', { raisedByYou: false, history: [] })));
    portal.markShipped.mockResolvedValue(ok(order(7, 'SHIPPED')));
    renderAt('/dealer/orders');

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
    renderAt('/dealer/orders');
    await user.click(await screen.findByRole('button', { name: 'View ORD-3' }));
    const dialog = await screen.findByRole('dialog', { name: 'Order ORD-3' });
    await within(dialog).findByText('Quantity');
    expect(within(dialog).queryByRole('button', { name: /Mark as shipped/ })).not.toBeInTheDocument();
  });

  it('reminds the dealer on their profile about orders awaiting them', async () => {
    portal.getOrders.mockResolvedValue(ok([order(6, 'DEALER_LEVEL_PENDING')]));
    renderAt('/profile');
    expect(await screen.findByText(/Order ORD-6 is waiting for you to accept or reject/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review in My Orders' })).toHaveAttribute('href', '/dealer/orders');
  });
});
