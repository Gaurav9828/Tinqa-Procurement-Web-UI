import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { OrderPreviewModal } from './OrderPreviewModal';
import { supplierPaymentApi } from '../api/supplierPaymentApi';
import { supplierReturnApi } from '../api/supplierReturnApi';
import { orderApi } from '../api/orderApi';
import { paymentsOf } from '../test/paymentFixtures';
import { signInAsSuperAdmin } from '../../../test/access';
import type { OrderResponse } from '../types/order.types';
import type { OrderStatus } from '../../../types/common.types';

vi.mock('../api/supplierPaymentApi', () => ({ supplierPaymentApi: { forOrder: vi.fn(), timeline: vi.fn() } }));
vi.mock('../api/supplierReturnApi', () => ({ supplierReturnApi: { forOrder: vi.fn() } }));
vi.mock('../api/orderApi', () => ({ orderApi: { getInvoice: vi.fn(), downloadInvoice: vi.fn() } }));
const payments = vi.mocked(supplierPaymentApi);
const returns = vi.mocked(supplierReturnApi);
const orders = vi.mocked(orderApi);
const ok = <T,>(data: T) => ({ success: true, message: 'OK', data }) as never;

const order = (orderStatus: OrderStatus): OrderResponse => ({
  id: 1, orderNumber: 'ORD-1', supplierId: 3, supplierName: 'Acme Traders', itemId: 7, itemName: 'Motherboard',
  orderQuantity: 4, unitType: 'PCS', unitPrice: 250, totalPrice: 1000, shipmentPrice: 0, taxBreakup: null,
  advancePercent: 30, midtermPercent: 30, finalPercent: 40, expectedPaymentMethod: 'BANK_TRANSFER',
  orderStatus, expectedDelivery: '2099-12-31', actualDelivery: null, orderDate: '2099-01-01', additionalInfo: {},
  createdAt: '2099-01-01T10:00:00Z', createdBy: 1,
});

const renderPreview = (status: OrderStatus) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <OrderPreviewModal order={order(status)} onClose={() => undefined} />
    </Provider>
  );

const tabNames = () => within(screen.getByRole('tablist', { name: 'Order sections' })).getAllByRole('tab').map((tab) => tab.id.replace('order-view-tab-', ''));

beforeEach(() => {
  vi.clearAllMocks();
  signInAsSuperAdmin('ADMIN_L2');
  payments.forOrder.mockResolvedValue(paymentsOf());
  payments.timeline.mockResolvedValue(ok({ orderId: 1, orderNumber: 'ORD-1', events: [] }));
  returns.forOrder.mockResolvedValue(ok({ tested: false, failedUnits: 0, unitsInReturns: 0, unitsLeft: 0, canRaise: false, returns: [] }));
  orders.getInvoice.mockResolvedValue(ok(null));
});

describe('Order preview: tabs', () => {
  it('shows the tabs the order has at its stage: no invoice before shipping, no returns before testing', () => {
    renderPreview('CONFIRMED');
    expect(tabNames()).toEqual(['overview', 'pricing', 'payments', 'history']);
  });

  it('adds the supplier invoice from shipping on and returns once there can be any', () => {
    renderPreview('DELIVERED');
    expect(tabNames()).toEqual(['overview', 'pricing', 'payments', 'invoice', 'returns', 'history']);
  });

  it('opens on the overview and loads nothing until a tab needing data is opened', async () => {
    const user = userEvent.setup();
    renderPreview('DELIVERED');
    expect(screen.getByRole('tab', { name: /Overview/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Expected: 2099-12-31')).toBeInTheDocument();
    expect(payments.forOrder).not.toHaveBeenCalled();
    expect(payments.timeline).not.toHaveBeenCalled();
    expect(returns.forOrder).not.toHaveBeenCalled();
    expect(orders.getInvoice).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /Price & GST/ }));
    expect(screen.getByText('Total before GST:')).toBeVisible();
    expect(payments.forOrder).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /Payments/ }));
    expect(screen.getByTestId('order-payment-plan')).toHaveTextContent('30% advance');
    await waitFor(() => expect(payments.forOrder).toHaveBeenCalledWith(1));

    await user.click(screen.getByRole('tab', { name: /Supplier invoice/ }));
    await waitFor(() => expect(orders.getInvoice).toHaveBeenCalledWith(1));

    await user.click(screen.getByRole('tab', { name: /Returns/ }));
    await waitFor(() => expect(returns.forOrder).toHaveBeenCalledWith(1, 'staff'));

    await user.click(screen.getByRole('tab', { name: /Flow history/ }));
    await waitFor(() => expect(payments.timeline).toHaveBeenCalledWith(1, 'staff'));
    expect(await screen.findByText('No history yet.')).toBeInTheDocument();
  });

  it('says payments start on approval while the order still waits for it', async () => {
    const user = userEvent.setup();
    renderPreview('PENDING');
    await user.click(screen.getByRole('tab', { name: /Payments/ }));
    expect(screen.getByText('Payments start once the order is approved.')).toBeInTheDocument();
    expect(payments.forOrder).not.toHaveBeenCalled();
  });
});
