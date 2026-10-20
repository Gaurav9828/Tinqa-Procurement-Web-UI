import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { OrderStatusDialog } from './OrderStatusDialog';
import { todayLocalIsoDate } from '../validator/orderValidator';
import { orderApi } from '../api/orderApi';
import { signInAsSuperAdmin } from '../../../test/access';
import type { AdminLevel } from '../../../config/access';
import type { OrderInvoice, OrderResponse } from '../types/order.types';
import type { OrderStatus } from '../../../types/common.types';

vi.mock('../api/orderApi', () => ({ orderApi: { getInvoice: vi.fn(), uploadInvoice: vi.fn(), downloadInvoice: vi.fn() } }));
const api = vi.mocked(orderApi);

const invoice = (status: OrderInvoice['status']): OrderInvoice => ({
  id: 9,
  orderId: 1,
  fileName: 'acme_invoice.pdf',
  invoiceNumber: 'INV-42',
  status,
  expectedTotal: 1180,
  foundTotal: status === 'MATCHED' ? 1180 : 1300,
  checks: [
    { key: 'grandTotal', label: 'Invoice total', expected: '1180.00', found: status === 'MATCHED' ? '1180.00' : '1300.00', ok: status === 'MATCHED',
      message: status === 'MATCHED' ? null : 'Invoice shows ₹1300.00, but by the quotation it should be ₹1180.00.' },
  ],
  uploadedByUsername: 'store.l1',
  uploadedAt: '2026-10-20T10:00:00Z',
  overrideByUsername: null,
  overrideAt: null,
  overrideReason: null,
  matched: status === 'MATCHED',
});

beforeEach(() => {
  vi.clearAllMocks();
  api.getInvoice.mockResolvedValue({ success: true, message: '', data: null } as never);
});

const order = (orderStatus: OrderStatus): OrderResponse =>
  ({
    id: 1,
    orderNumber: 'ORD-1',
    dealerName: 'Acme Traders',
    itemName: 'Motherboard',
    orderQuantity: 10,
    unitType: 'PCS',
    unitPrice: 100,
    totalPrice: 1000,
    taxBreakup: { supplyType: 'INTRA_STATE', gstRate: 18, taxableValue: 1000, cgst: 90, sgst: 90, igst: 0, cess: 0, totalTax: 180, grandTotal: 1180 },
    orderStatus,
    orderDate: '2026-10-01',
    actualDelivery: null,
  }) as unknown as OrderResponse;

const renderDialog = (status: OrderStatus, role: AdminLevel = 'ADMIN_L1') => {
  signInAsSuperAdmin(role);
  const onSubmit = vi.fn(async () => true);
  const onClose = vi.fn();
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter>
        <OrderStatusDialog order={order(status)} access={{ canEdit: true, canProgress: true, canApprove: role === 'ADMIN_L2' }} isSubmitting={false} onClose={onClose} onSubmit={onSubmit} />
      </MemoryRouter>
    </Provider>
  );
  return { user: userEvent.setup(), onSubmit, onClose };
};

const choices = () => within(screen.getByRole('radiogroup', { name: 'Next step' })).getAllByRole('radio');

describe('Procurement status dialog', () => {
  it('offers only the next steps — no dropdown of every status — and shows where the order is', () => {
    renderDialog('CONFIRMED');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(choices().map((r) => r.getAttribute('value'))).toEqual(['SHIPPED', 'CANCELLED']);
    const progress = screen.getByRole('list', { name: 'Order progress' });
    expect(within(progress).getByText('Confirmed').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(within(progress).getByText('Dealer').closest('li')).toHaveAttribute('data-done', 'true');
  });

  it('marks delivered with an actual delivery date that cannot be in the future or before the order date', async () => {
    api.getInvoice.mockResolvedValue({ success: true, message: '', data: invoice('MATCHED') } as never);
    const { user, onSubmit, onClose } = renderDialog('SHIPPED');
    await user.click(screen.getByRole('radio', { name: /Mark delivered/ }));
    const today = todayLocalIsoDate();
    const date = screen.getByLabelText('Actual Delivery Date');
    expect(date).toHaveValue(today);
    expect(date).toHaveAttribute('max', today);
    expect(date).toHaveAttribute('min', '2026-10-01');
    expect(await screen.findByText('Matches the quotation')).toBeInTheDocument();

    fireEvent.change(date, { target: { value: '2026-09-30' } });
    await user.click(screen.getByRole('button', { name: 'Mark delivered' }));
    expect(screen.getByText('Actual delivery date cannot be before the order date (2026-10-01).')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(date, { target: { value: today } });
    await user.click(screen.getByRole('button', { name: 'Mark delivered' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), { status: 'DELIVERED', actualDelivery: today });
    expect(onClose).toHaveBeenCalled();
  });

  it("needs the dealer's invoice to deliver, and shows what it should total", async () => {
    api.uploadInvoice.mockResolvedValue({ success: true, message: 'Invoice uploaded and matches the quotation', data: invoice('MATCHED') } as never);
    const { user, onSubmit } = renderDialog('SHIPPED');
    await user.click(screen.getByRole('radio', { name: /Mark delivered/ }));
    expect(await screen.findByText(/No invoice uploaded yet/)).toBeInTheDocument();
    expect(within(screen.getByLabelText('GST breakup')).getByText('₹1,180.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark delivered' })).toBeDisabled();

    await user.upload(screen.getByLabelText('Invoice PDF'), new File(['%PDF-1.4'], 'acme_invoice.pdf', { type: 'application/pdf' }));
    expect(api.uploadInvoice).toHaveBeenCalledWith(1, expect.any(File));
    expect(await screen.findByText('Matches the quotation')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mark delivered' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { status: 'DELIVERED', actualDelivery: todayLocalIsoDate() });
  });

  it('lets only a Level 2 approver accept a mismatched invoice, with a reason', async () => {
    api.getInvoice.mockResolvedValue({ success: true, message: '', data: invoice('MISMATCH') } as never);
    const l1 = renderDialog('SHIPPED', 'ADMIN_L1');
    await l1.user.click(screen.getByRole('radio', { name: /Mark delivered/ }));
    expect(await screen.findByText("Doesn't match the quotation")).toBeInTheDocument();
    expect(screen.getByText(/by the quotation it should be ₹1180.00/)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Level 2 order approver');
    expect(screen.getByRole('button', { name: 'Mark delivered' })).toBeDisabled();
    l1.onClose();
    document.body.innerHTML = '';

    const l2 = renderDialog('SHIPPED', 'ADMIN_L2');
    await l2.user.click(screen.getByRole('radio', { name: /Mark delivered/ }));
    await screen.findByText("Doesn't match the quotation");
    expect(screen.getByRole('button', { name: 'Mark delivered' })).toBeDisabled();
    await l2.user.type(screen.getByLabelText('Reason to accept this invoice'), 'Rounding; credit note promised');
    await l2.user.click(screen.getByRole('button', { name: 'Mark delivered' }));
    expect(l2.onSubmit).toHaveBeenCalledWith(expect.anything(), {
      status: 'DELIVERED',
      actualDelivery: todayLocalIsoDate(),
      invoiceOverrideReason: 'Rounding; credit note promised',
    });
  });

  it('needs a reason to cancel, and warns that it is final', async () => {
    const { user, onSubmit } = renderDialog('QUOTATION');
    await user.click(screen.getByRole('radio', { name: /Cancel order/ }));
    expect(screen.getByRole('note')).toHaveTextContent("Its status can't be changed afterwards.");
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Reason'), '  Dealer withdrew the quote ');
    await user.click(screen.getByRole('button', { name: 'Cancel order' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { status: 'CANCELLED', reason: 'Dealer withdrew the quote' });
  });

  it('submits a quotation for approval', async () => {
    const { user, onSubmit } = renderDialog('QUOTATION');
    await user.click(screen.getByRole('radio', { name: /Submit for approval/ }));
    await user.click(screen.getByRole('button', { name: 'Submit for approval' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), { status: 'PENDING' });
  });

  it('shows the return track once a return starts', () => {
    renderDialog('RETURN_PICKED_UP');
    const track = screen.getByRole('list', { name: 'Return progress' });
    expect(within(track).getByText('Picked up').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(choices().map((r) => r.getAttribute('value'))).toEqual(['RETURN_RECEIVED']);
  });

  it('explains why nothing can be done: pending approval, approver decisions, closed orders', () => {
    renderDialog('PENDING', 'ADMIN_L2');
    expect(screen.getByRole('status', { name: 'No status change available' })).toHaveTextContent('Approvals Hub');
    expect(screen.getByRole('link', { name: 'Open Approvals Hub' })).toHaveAttribute('href', '/approvals');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('keeps a Level 1 admin from deciding a return', () => {
    renderDialog('RETURN_REQUESTED', 'ADMIN_L1');
    expect(screen.getByRole('status', { name: 'No status change available' })).toHaveTextContent('order approver');
  });

  it('locks a cancelled order', () => {
    renderDialog('CANCELLED', 'ADMIN_L2');
    expect(screen.getByRole('status', { name: 'No status change available' })).toHaveTextContent('cancelled');
    expect(screen.getByRole('list', { name: 'Order progress' })).toBeInTheDocument();
  });
});
