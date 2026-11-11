import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../../store/useAuthStore';
import { OrderTrackingDetailPage } from './OrderTrackingDetailPage';
import { orderTrackingApi } from '../api/orderTrackingApi';
import { refundApi } from '../../refunds/api/refundApi';
import { costingApi } from '../../products-management/api/costingApi';
import { resetTrackingStatusCache } from '../hooks/useTrackingStatuses';
import type { ApiResponse } from '../../../types/common.types';
import type { Permission } from '../../../config/access';
import type { AdminOrderDetail, OrderReturnInfo, OrderTrackingEntry, ShipmentCheckpoint } from '../types/orderTracking.types';
import { DECENCY_ERROR } from '../../../utils/decency';

// Only the network layer is mocked.
vi.mock('../api/orderTrackingApi', () => ({
  orderTrackingApi: {
    listOrders: vi.fn(),
    getOrder: vi.fn(),
    getTrackingStatuses: vi.fn(),
    updateTracking: vi.fn(),
    updateDeliveryStatus: vi.fn(),
    approvePreOrder: vi.fn(),
    enableReturn: vi.fn(),
    approveReturn: vi.fn(),
    rejectReturn: vi.fn(),
    changeReturnCharge: vi.fn(),
    listReturnRequests: vi.fn(),
    withdrawReturn: vi.fn(),
    recordInspection: vi.fn(),
    addCheckpoint: vi.fn(),
    addRiderCheckpoint: vi.fn(),
    deleteCheckpoint: vi.fn(),
  },
}));
vi.mock('../../refunds/api/refundApi', () => ({
  refundApi: { getOrderRefunds: vi.fn(), requestRefund: vi.fn(), approveRefund: vi.fn(), rejectRefund: vi.fn(), syncRefund: vi.fn(), listRefunds: vi.fn(), getRefund: vi.fn() },
}));
vi.mock('../../products-management/api/costingApi', () => ({
  costingApi: { getSettings: vi.fn(), getProductProfit: vi.fn(), getProfitSummary: vi.fn(), getOrderProfit: vi.fn(), getItemCost: vi.fn() },
}));

const api = vi.mocked(orderTrackingApi);
const refunds = vi.mocked(refundApi);

const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });

const axiosError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message ?? 'Request failed'), String(status), response.config, {}, response);
};

const entry = (id: number, status: string, createdAt: string, current = false): OrderTrackingEntry => ({
  id,
  status,
  stage: status,
  notes: null,
  current,
  updatedBy: 'admin_l1',
  createdAt,
  updatedAt: createdAt,
});

const RETURN_INFO: OrderReturnInfo = {
  id: 3,
  state: 'ENABLED',
  open: true,
  enabledReason: 'Wrong colour delivered',
  sourceTicketReference: 'TQ-Q-000031',
  staffNote: 'Photos in the ticket',
  enabledBy: 'manager1',
  enabledAt: '2026-10-10T10:00:00',
  expiresAt: '2026-10-17T10:00:00',
  withdrawnBy: null,
  withdrawnAt: null,
  chargeAmount: 100,
  chargeReason: 'Pickup by our team',
  settlement: null,
  customerReason: null,
  requestedAt: null,
  chargeStatus: 'NONE',
  chargePaidAt: null,
  trackingId: null,
  inspectionOutcome: null,
  inspectionNote: null,
  refundAmount: null,
  inspectedBy: null,
  inspectedAt: null,
  orderAmount: 1000,
  shippingFee: 0,
  deductAllowed: true,
  staffRequestedBy: null,
  staffRequestedAt: null,
  requestedChargeAmount: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  chargeChangedBy: null,
  chargeChangedAt: null,
  chargeConsentedAt: null,
};

/** Customer Support asked; waiting for a Store Manager. */
const REQUESTED: OrderReturnInfo = {
  ...RETURN_INFO,
  state: 'REQUESTED',
  open: false,
  enabledBy: null,
  enabledAt: null,
  expiresAt: null,
  staffRequestedBy: 'support2',
  staffRequestedAt: '2026-10-09T10:00:00',
  requestedChargeAmount: 100,
};

const STARTED: OrderReturnInfo = {
  ...RETURN_INFO,
  state: 'STARTED',
  open: false,
  settlement: 'DEDUCT',
  customerReason: 'The colour is not what I ordered',
  requestedAt: '2026-10-11T09:00:00',
  trackingId: 'TQR-1A2B3C4D',
};

const CHECKPOINTS: ShipmentCheckpoint[] = [
  { id: 1, leg: 'DELIVERY', event: 'ARRIVED', place: 'Lucknow hub', city: 'Lucknow', pincode: '226001', occurredAt: '2026-10-04T08:00:00', recordedBy: 'rider1' },
  { id: 2, leg: 'DELIVERY', event: 'DEPARTED', place: 'Lucknow hub', city: null, pincode: null, occurredAt: '2026-10-04T11:00:00', recordedBy: 'rider1' },
];

const order = (status: string, extra: Partial<AdminOrderDetail> = {}): AdminOrderDetail => ({
  id: 1,
  orderNumber: 'ORD-1A2B3C4D',
  orderStatus: status,
  paymentMethod: 'UPI',
  paymentStatus: 'PAID',
  totalAmount: 1000,
  itemCount: 1,
  createdAt: '2026-10-01T09:00:00',
  updatedAt: '2026-10-03T09:00:00',
  updatedBy: 'admin_l1',
  customer: { id: 7, name: 'Asha Verma', email: 'asha@example.com' },
  items: [{ productId: 11, title: 'Smart Plug', price: 1000, quantity: 1, totalPrice: 1000 }],
  currentTracking: null,
  addressId: 5,
  subtotal: 1000,
  shippingFee: 0,
  notes: null,
  tracking: [entry(1, 'ORDER_RECEIVED', '2026-10-01T09:00:00'), entry(2, status, '2026-10-03T09:00:00', true)],
  deliveryTrackingId: 'TQD-1A2B3C4D',
  returnInfo: null,
  checkpoints: [],
  ...extra,
});

const STATUSES = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKED_UP', 'RETURN_IN_TRANSIT', 'RETURN_INSPECTION', 'RETURN_INSPECTION_FAILED', 'RETURN_BACK_IN_TRANSIT', 'RETURN_BACK_DELIVERED'].map(
  (status) => ({ status, stage: status })
);

/** A Store Manager: decides requests raised by someone else and changes the charge. */
const STAFF: Permission[] = ['CUSTOMER_ORDER_VIEW', 'CUSTOMER_ORDER_TRACKING_UPDATE', 'REFUND_VIEW', 'REFUND_REQUEST', 'RETURN_ENABLE'];
/** Customer Support: only requests returns. */
const SUPPORT: Permission[] = ['CUSTOMER_ORDER_VIEW', 'REFUND_VIEW', 'REFUND_REQUEST'];
const RIDER: Permission[] = ['CUSTOMER_ORDER_VIEW', 'DELIVERY_STATUS_UPDATE'];

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: { userId: 7, username: 'support1', email: 's@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
  });

const openOrder = async (detail: AdminOrderDetail, permissions: Permission[] = STAFF) => {
  signIn(permissions);
  api.getOrder.mockResolvedValue(ok(detail));
  const store = configureStore({ reducer: { alert: alertReducer } });
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/order-tracking/ORD-1A2B3C4D']}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/order-tracking/:orderNumber" element={<OrderTrackingDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  const page = screen.getByRole('region', { name: 'Order ORD-1A2B3C4D details' });
  await within(page).findByRole('list', { name: 'Tracking history' });
  return { user, page };
};

beforeEach(() => {
  resetTrackingStatusCache();
  api.getTrackingStatuses.mockResolvedValue(ok(STATUSES));
  refunds.getOrderRefunds.mockImplementation(async (orderNumber: string) =>
    ok({ orderNumber, orderStatus: 'DELIVERED', paymentStatus: 'PAID', payments: [], refunds: [], canRequestRefund: false, refundBlockedReason: null })
  );
  vi.mocked(costingApi).getOrderProfit.mockRejectedValue(axiosError(404, { errorCode: 'ORDER_NOT_FOUND' }));
});

describe('delivery tracking IDs', () => {
  it('shows the delivery and return tracking IDs with copy buttons', async () => {
    const { page } = await openOrder(order('RETURN_IN_TRANSIT', { returnInfo: STARTED }));
    expect(within(page).getByTestId('delivery-tracking-id')).toHaveTextContent('TQD-1A2B3C4D');
    expect(within(page).getByTestId('return-tracking-id')).toHaveTextContent('TQR-1A2B3C4D');
    expect(within(page).getByRole('button', { name: 'Copy Delivery tracking ID' })).toBeInTheDocument();
  });

  it('shows no tracking ID before the order ships', async () => {
    const { page } = await openOrder(order('PACKED', { deliveryTrackingId: null }));
    expect(within(page).queryByTestId('delivery-tracking-id')).not.toBeInTheDocument();
  });
});

// Since 2026-11-11 returns are requested only from the customer's support ticket (see SupportTickets.test.tsx), and a
// Store Manager can no longer enable one directly. The order page used to offer "Enable return" / "Request return";
// these tests now check it points to the ticket instead, and keep the Store Manager's decisions.
describe('requesting a return (only from the support ticket)', () => {
  const NOTE = "Returns are requested from the customer's support ticket for this order.";

  it('gives a Store Manager no "Enable return" on the order page, only the note pointing to the ticket', async () => {
    const { page } = await openOrder(order('DELIVERED'));
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(panel).toHaveTextContent('This order is not returnable');
    expect(within(panel).getByTestId('return-request-note')).toHaveTextContent(NOTE);
    expect(within(panel).queryByRole('button', { name: /Enable return/ })).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /Request return/ })).not.toBeInTheDocument();
    expect(api.enableReturn).not.toHaveBeenCalled();
  });

  it('shows Customer Support the same note instead of a Request return button', async () => {
    const { page } = await openOrder(order('DELIVERED', { subtotal: 500, shippingFee: 500, totalAmount: 1000 }), SUPPORT);
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(within(panel).getByTestId('return-request-note')).toHaveTextContent(NOTE);
    expect(within(panel).queryByRole('button', { name: /Request return/ })).not.toBeInTheDocument();
  });

  it('is not offered without REFUND_REQUEST or before delivery', async () => {
    const { page } = await openOrder(order('DELIVERED'), ['CUSTOMER_ORDER_VIEW', 'CUSTOMER_ORDER_TRACKING_UPDATE']);
    expect(within(page).queryByRole('region', { name: 'Return' })).not.toBeInTheDocument();
  });

  it('says an enabled return expired and points to the ticket for a new request', async () => {
    const { page } = await openOrder(order('DELIVERED', { returnInfo: { ...RETURN_INFO, open: false } }));
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(panel).toHaveTextContent('Expired: the customer did not start the return');
    expect(within(panel).getByTestId('return-request-note')).toHaveTextContent(NOTE);
    expect(within(panel).queryByRole('button', { name: /again/ })).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Withdraw return' })).not.toBeInTheDocument();
  });
});

describe('return requests and Store Manager decisions', () => {
  it("shows a waiting request to Customer Support with the customer's own words, without the decision buttons", async () => {
    const { page } = await openOrder(order('DELIVERED', { returnInfo: REQUESTED }), SUPPORT);
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(panel).toHaveTextContent('Waiting for a Store Manager to approve it.');
    expect(within(panel).getByTestId('customer-words')).toHaveTextContent('Wrong colour delivered');
    expect(within(panel).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    // Updating the request needs the ticket (its customer messages), so it is done there
    expect(within(panel).queryByRole('button', { name: 'Update request' })).not.toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Withdraw request' })).toBeInTheDocument();
  });

  it("lets a Store Manager approve a request with another charge, reading the customer's words from the ticket", async () => {
    api.approveReturn.mockResolvedValue(ok({ ...RETURN_INFO, chargeAmount: 250 }, 'Return enabled. The customer has 7 days to start it.'));
    const { user, page } = await openOrder(order('DELIVERED', { returnInfo: REQUESTED }));
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(within(panel).getByTestId('return-charge')).toHaveTextContent('₹100.00');
    expect(panel).toHaveTextContent('support2');
    const words = within(panel).getByRole('group', { name: "Customer's reason" });
    expect(words).toHaveTextContent("Customer's reason — their own words");
    expect(within(words).getByTestId('customer-words')).toHaveTextContent('Wrong colour delivered');
    expect(within(words).getByRole('link', { name: 'TQ-Q-000031' })).toHaveAttribute('href', '/support-tickets/TQ-Q-000031');
    expect(within(words).getByTestId('return-staff-note')).toHaveTextContent('Photos in the ticket');
    await user.click(within(panel).getByRole('button', { name: 'Approve' }));
    const dialog = screen.getByRole('dialog', { name: 'Approve return' });
    expect(within(dialog).getByTestId('customer-words')).toHaveTextContent('Wrong colour delivered');
    const charge = within(dialog).getByLabelText('Return charge');
    expect(charge).toHaveValue('100');
    await user.clear(charge);
    await user.type(charge, '250');
    await user.click(within(dialog).getByRole('button', { name: 'Approve and enable' }));
    await waitFor(() => expect(api.approveReturn).toHaveBeenCalledWith('ORD-1A2B3C4D', { chargeAmount: 250, chargeReason: 'Pickup by our team' }));
    await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));
  });

  it('hides approve and reject from the Store Manager who raised the request', async () => {
    const { page } = await openOrder(order('DELIVERED', { returnInfo: { ...REQUESTED, staffRequestedBy: 'support1' } })); // signed in as support1
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(panel).toHaveTextContent('You raised this request, so another Store Manager must decide it.');
    expect(within(panel).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('needs a polite reason to reject a request', async () => {
    api.rejectReturn.mockResolvedValue(ok({ ...REQUESTED, state: 'REJECTED', rejectionReason: 'Used for a month' }));
    const { user, page } = await openOrder(order('DELIVERED', { returnInfo: REQUESTED }));
    await user.click(within(page).getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject return request' });
    expect(within(dialog).getByTestId('customer-words')).toHaveTextContent('Wrong colour delivered');
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    expect(within(dialog).getByText('Say why the return is rejected; the customer sees it.')).toBeInTheDocument();
    expect(api.rejectReturn).not.toHaveBeenCalled();
    const reason = within(dialog).getByLabelText('Reason (emailed to the customer)');
    await user.type(reason, 'You broke it, you bitch');
    expect(within(dialog).getByText(DECENCY_ERROR)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    expect(api.rejectReturn).not.toHaveBeenCalled();
    await user.clear(reason);
    await user.type(reason, 'Used for a month');
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    await waitFor(() => expect(api.rejectReturn).toHaveBeenCalledWith('ORD-1A2B3C4D', { reason: 'Used for a month' }));
  });

  it("shows the server's OFFENSIVE_LANGUAGE error on the reject reason", async () => {
    api.rejectReturn.mockRejectedValue(axiosError(400, { errorCode: 'OFFENSIVE_LANGUAGE', message: 'Offensive language' }));
    const { user, page } = await openOrder(order('DELIVERED', { returnInfo: REQUESTED }));
    await user.click(within(page).getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject return request' });
    await user.type(within(dialog).getByLabelText('Reason (emailed to the customer)'), 'Words the server refuses');
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    expect(await within(dialog).findByText(DECENCY_ERROR)).toBeInTheDocument();
  });

  it('shows a rejected request with the customer\'s words, and points to the ticket to ask again', async () => {
    const rejected: OrderReturnInfo = { ...REQUESTED, state: 'REJECTED', rejectedBy: 'manager1', rejectedAt: '2026-10-09T12:00:00', rejectionReason: 'Used for a month' };
    const { page } = await openOrder(order('DELIVERED', { returnInfo: rejected }), SUPPORT);
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(within(panel).getByTestId('return-rejection-reason')).toHaveTextContent('Used for a month');
    expect(within(panel).getByTestId('customer-words')).toHaveTextContent('Wrong colour delivered');
    expect(within(panel).getByTestId('return-request-note')).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Request return again' })).not.toBeInTheDocument();
  });

  it('lets a Store Manager change the charge of an enabled return, and shows whether the customer agreed', async () => {
    api.changeReturnCharge.mockResolvedValue(ok({ ...RETURN_INFO, chargeAmount: 300 }));
    const { user, page } = await openOrder(order('DELIVERED', { returnInfo: RETURN_INFO }));
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(within(panel).getByTestId('return-consent')).toHaveTextContent('Not yet');
    expect(within(panel).getByTestId('return-settlement-options')).toHaveTextContent('deducted from the refund or pay it now');
    await user.click(within(panel).getByRole('button', { name: 'Change charge' }));
    const dialog = screen.getByRole('dialog', { name: 'Change return charge' });
    const charge = within(dialog).getByLabelText('Return charge');
    await user.clear(charge);
    await user.type(charge, '300');
    // The charge reason is courtesy-checked too
    const chargeReason = within(dialog).getByLabelText('Charge reason');
    await user.clear(chargeReason);
    await user.type(chargeReason, 'Pickup, sh1t happens');
    expect(within(dialog).getByText(DECENCY_ERROR)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save new charge' }));
    expect(api.changeReturnCharge).not.toHaveBeenCalled();
    await user.clear(chargeReason);
    await user.type(chargeReason, 'Pickup by our team');
    await user.click(within(dialog).getByRole('button', { name: 'Save new charge' }));
    await waitFor(() => expect(api.changeReturnCharge).toHaveBeenCalledWith('ORD-1A2B3C4D', { chargeAmount: 300, chargeReason: 'Pickup by our team' }));
  });

  it('does not offer Change charge to Customer Support', async () => {
    const { page } = await openOrder(order('DELIVERED', { returnInfo: RETURN_INFO }), SUPPORT);
    expect(within(page).queryByRole('button', { name: 'Change charge' })).not.toBeInTheDocument();
    expect(within(page).getByRole('button', { name: 'Withdraw return' })).toBeInTheDocument();
  });

  it('labels the order amount apart from shipping and the total paid', async () => {
    const { page } = await openOrder(order('DELIVERED', { subtotal: 500, shippingFee: 500, totalAmount: 1000 }));
    expect(page).toHaveTextContent('Order amount');
    expect(page).toHaveTextContent('Total paid (incl. shipping)');
  });
});

describe('withdrawing a return', () => {
  it('shows the enabled return and withdraws it after confirming', async () => {
    api.withdrawReturn.mockResolvedValue(ok({ ...RETURN_INFO, state: 'WITHDRAWN', open: false }, 'Return option withdrawn.'));
    const { user, page } = await openOrder(order('DELIVERED', { returnInfo: RETURN_INFO }));
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(within(panel).getByTestId('return-charge')).toHaveTextContent('₹100.00');
    expect(panel).toHaveTextContent('Pickup by our team');
    expect(panel).toHaveTextContent('Wrong colour delivered');
    expect(within(panel).queryByRole('button', { name: /Enable return/ })).not.toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Withdraw return' }));
    await user.click(screen.getByRole('button', { name: 'Yes, withdraw' }));
    await waitFor(() => expect(api.withdrawReturn).toHaveBeenCalledWith('ORD-1A2B3C4D'));
    expect(await screen.findByText('Return option withdrawn.')).toBeInTheDocument();
  });

  it("can't withdraw while the customer is paying the charge", async () => {
    const { page } = await openOrder(order('DELIVERED', { returnInfo: { ...RETURN_INFO, chargeStatus: 'PENDING' } }));
    expect(within(page).getByRole('button', { name: 'Withdraw return' })).toBeDisabled();
  });

  it('explains a server refusal with a friendly message and reloads the order', async () => {
    api.withdrawReturn.mockRejectedValue(axiosError(409, { errorCode: 'RETURN_CHARGE_IN_PROGRESS', message: 'x' }));
    const { user, page } = await openOrder(order('DELIVERED', { returnInfo: RETURN_INFO }));
    await user.click(within(page).getByRole('button', { name: 'Withdraw return' }));
    await user.click(screen.getByRole('button', { name: 'Yes, withdraw' }));
    expect(await screen.findByText("The customer is paying the return charge right now, so the return can't be withdrawn or its charge changed.")).toBeInTheDocument();
    await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));
  });
});

describe('recording the inspection', () => {
  it('shows the started return; Partial needs an amount and a note, then reloads the order and its refunds', async () => {
    api.recordInspection.mockResolvedValue(ok({ ...STARTED, inspectionOutcome: 'PARTIAL' }, 'Inspection recorded.'));
    const { user, page } = await openOrder(order('RETURN_INSPECTION', { returnInfo: STARTED }));
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(within(panel).getByTestId('return-settlement')).toHaveTextContent('Deducted from the refund');
    expect(panel).toHaveTextContent('The colour is not what I ordered');
    // A failed inspection goes through the dialog, never the status form
    expect(within(page).queryByRole('radio', { name: /Inspection failed/ })).not.toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Record inspection' }));
    const dialog = screen.getByRole('dialog', { name: 'Record inspection' });
    expect(dialog).toHaveTextContent('minus the ₹100.00 return charge');
    await user.click(within(dialog).getByRole('radio', { name: 'Partial' }));
    await user.click(within(dialog).getByRole('button', { name: 'Record inspection' }));
    expect(within(dialog).getByText('Enter the refund amount.')).toBeInTheDocument();
    expect(within(dialog).getByText('Say why the refund is lower.')).toBeInTheDocument();
    expect(api.recordInspection).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('Refund amount'), '450');
    await user.type(within(dialog).getByLabelText('Inspection note'), 'Scratches on the casing');
    await user.click(within(dialog).getByRole('button', { name: 'Record inspection' }));
    await waitFor(() =>
      expect(api.recordInspection).toHaveBeenCalledWith('ORD-1A2B3C4D', { outcome: 'PARTIAL', refundAmount: 450, note: 'Scratches on the casing' })
    );
    await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));
    expect(refunds.getOrderRefunds).toHaveBeenCalledTimes(2);
  });

  it('Fail needs a note and sends no refund amount', async () => {
    api.recordInspection.mockResolvedValue(ok({ ...STARTED, inspectionOutcome: 'FAIL' }));
    const { user, page } = await openOrder(order('RETURN_INSPECTION', { returnInfo: STARTED }));
    await user.click(within(page).getByRole('button', { name: 'Record inspection' }));
    const dialog = screen.getByRole('dialog', { name: 'Record inspection' });
    await user.click(within(dialog).getByRole('radio', { name: 'Fail' }));
    expect(within(dialog).queryByLabelText('Refund amount')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Record inspection' }));
    expect(within(dialog).getByText('Say why the return failed inspection.')).toBeInTheDocument();
    // The inspection note is courtesy-checked
    const note = within(dialog).getByLabelText('Inspection note');
    await user.type(note, 'Customer is a liar and a bastard');
    expect(within(dialog).getByText(DECENCY_ERROR)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Record inspection' }));
    expect(api.recordInspection).not.toHaveBeenCalled();
    await user.clear(note);
    await user.type(within(dialog).getByLabelText('Inspection note'), 'Water damage');
    await user.click(within(dialog).getByRole('button', { name: 'Record inspection' }));
    await waitFor(() => expect(api.recordInspection).toHaveBeenCalledWith('ORD-1A2B3C4D', { outcome: 'FAIL', note: 'Water damage' }));
  });

  it('shows a recorded inspection instead of the button', async () => {
    const inspected: OrderReturnInfo = {
      ...STARTED,
      inspectionOutcome: 'PARTIAL',
      inspectionNote: 'Scratches',
      refundAmount: 450,
      inspectedBy: 'support1',
      inspectedAt: '2026-10-15T10:00:00',
    };
    const { page } = await openOrder(order('RETURN_INSPECTION', { returnInfo: inspected, paymentStatus: 'REFUND_REQUESTED' }));
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(within(panel).getByTestId('inspection-outcome')).toHaveTextContent('Partial refund');
    expect(within(panel).getByTestId('inspection-refund')).toHaveTextContent('₹450.00');
    expect(panel).toHaveTextContent('Scratches');
    expect(within(panel).queryByRole('button', { name: 'Record inspection' })).not.toBeInTheDocument();
  });

  it('shows the charge paid now and keeps reject out of the status choices', async () => {
    const paid: OrderReturnInfo = { ...STARTED, settlement: 'PAY', chargeStatus: 'PAID', chargePaidAt: '2026-10-11T09:05:00' };
    const { page } = await openOrder(order('RETURN_REQUESTED', { returnInfo: paid }));
    const panel = within(page).getByRole('region', { name: 'Return' });
    expect(within(panel).getByTestId('return-settlement')).toHaveTextContent('Paid by the customer now');
    expect(within(panel).getByTestId('return-charge-status')).toHaveTextContent('Paid');
    const steps = await within(page).findByRole('radiogroup', { name: 'Next step' });
    expect(within(steps).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['RETURN_APPROVED']);
  });
});

describe('hub checkpoints', () => {
  it('lists checkpoints per leg and adds one through the staff route', async () => {
    api.addCheckpoint.mockResolvedValue(ok(CHECKPOINTS[0], 'Checkpoint added.'));
    const { user, page } = await openOrder(order('IN_TRANSIT', { checkpoints: CHECKPOINTS }));
    const panel = within(page).getByRole('region', { name: 'Hub checkpoints' });
    const items = within(within(panel).getByRole('list', { name: 'Delivery checkpoints' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Reached Lucknow hub');
    expect(items[0]).toHaveTextContent('Lucknow, PIN 226001');
    expect(items[1]).toHaveTextContent('Left Lucknow hub');

    const form = within(panel).getByRole('form', { name: 'Add checkpoint' });
    await user.click(within(form).getByRole('radio', { name: 'Left' }));
    await user.type(within(form).getByLabelText('Place'), 'Kanpur hub');
    await user.type(within(form).getByLabelText('PIN code'), '2080');
    await user.click(within(form).getByRole('button', { name: 'Add checkpoint' }));
    expect(within(form).getByText('PIN code must be 6 digits.')).toBeInTheDocument();
    await user.type(within(form).getByLabelText('PIN code'), '01');
    await user.type(within(form).getByLabelText('City'), 'Kanpur');
    await user.click(within(form).getByRole('button', { name: 'Add checkpoint' }));

    await waitFor(() =>
      expect(api.addCheckpoint).toHaveBeenCalledWith('ORD-1A2B3C4D', { event: 'DEPARTED', place: 'Kanpur hub', city: 'Kanpur', pincode: '208001' })
    );
    expect(api.addRiderCheckpoint).not.toHaveBeenCalled();
    await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));
    expect(refunds.getOrderRefunds).toHaveBeenCalledTimes(1);
  });

  it('refuses a time in the future', async () => {
    const { user, page } = await openOrder(order('SHIPPED'));
    const form = within(page).getByRole('form', { name: 'Add checkpoint' });
    await user.type(within(form).getByLabelText('Place'), 'Agra hub');
    await user.type(within(form).getByLabelText('Time'), '2099-12-31T10:00');
    await user.click(within(form).getByRole('button', { name: 'Add checkpoint' }));
    expect(within(form).getByText("A checkpoint can't be in the future.")).toBeInTheDocument();
    expect(api.addCheckpoint).not.toHaveBeenCalled();
  });

  it('lets a rider add through the rider route, without delete', async () => {
    api.addRiderCheckpoint.mockResolvedValue(ok(CHECKPOINTS[0]));
    const { user, page } = await openOrder(order('RETURN_PICKED_UP', { checkpoints: [] }), RIDER);
    const form = within(page).getByRole('form', { name: 'Add checkpoint' });
    expect(form).toHaveTextContent('return trip');
    await user.type(within(form).getByLabelText('Place'), 'Customer doorstep');
    await user.type(within(form).getByLabelText('Time'), '2020-01-01T09:30');
    await user.click(within(form).getByRole('button', { name: 'Add checkpoint' }));
    await waitFor(() =>
      expect(api.addRiderCheckpoint).toHaveBeenCalledWith('ORD-1A2B3C4D', { event: 'ARRIVED', place: 'Customer doorstep', occurredAt: '2020-01-01T09:30:00' })
    );
    expect(api.addCheckpoint).not.toHaveBeenCalled();
  });

  it('hides delete from riders', async () => {
    const { page } = await openOrder(order('IN_TRANSIT', { checkpoints: CHECKPOINTS }), RIDER);
    expect(within(page).queryByRole('button', { name: /Delete checkpoint/ })).not.toBeInTheDocument();
  });

  it('deletes a checkpoint (staff) after confirming', async () => {
    api.deleteCheckpoint.mockResolvedValue(ok(null, 'Checkpoint removed.'));
    const { user, page } = await openOrder(order('IN_TRANSIT', { checkpoints: CHECKPOINTS }));
    await user.click(within(page).getByRole('button', { name: 'Delete checkpoint Left Lucknow hub' }));
    await user.click(screen.getByRole('button', { name: 'Delete checkpoint' }));
    await waitFor(() => expect(api.deleteCheckpoint).toHaveBeenCalledWith('ORD-1A2B3C4D', 2));
  });

  it.each(['PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_RECEIVED'])('shows no add form while the order is %s', async (status) => {
    const { page } = await openOrder(order(status, { checkpoints: CHECKPOINTS }));
    const panel = within(page).getByRole('region', { name: 'Hub checkpoints' });
    expect(within(panel).queryByRole('form', { name: 'Add checkpoint' })).not.toBeInTheDocument();
    // The trip is over: its checkpoints can no longer be deleted either
    expect(within(panel).queryByRole('button', { name: /Delete checkpoint/ })).not.toBeInTheDocument();
  });

  it('shows nothing to users who can only view an order without checkpoints', async () => {
    const { page } = await openOrder(order('IN_TRANSIT'), ['CUSTOMER_ORDER_VIEW']);
    expect(within(page).queryByRole('region', { name: 'Hub checkpoints' })).not.toBeInTheDocument();
  });
});
