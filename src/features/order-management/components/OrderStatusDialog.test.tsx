import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrderStatusDialog } from './OrderStatusDialog';
import { todayLocalIsoDate } from '../validator/orderValidator';
import type { OrderResponse } from '../types/order.types';
import type { OrderStatus } from '../../../types/common.types';

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
    orderStatus,
    orderDate: '2026-10-01',
    actualDelivery: null,
  }) as unknown as OrderResponse;

const renderDialog = (status: OrderStatus, role = 'ADMIN_L1') => {
  const onSubmit = vi.fn(async () => true);
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <OrderStatusDialog order={order(status)} access={{ canEdit: true, canProgress: true, canApprove: role === 'ADMIN_L2' }} isSubmitting={false} onClose={onClose} onSubmit={onSubmit} />
    </MemoryRouter>
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
    const { user, onSubmit, onClose } = renderDialog('SHIPPED');
    await user.click(screen.getByRole('radio', { name: /Mark delivered/ }));
    const today = todayLocalIsoDate();
    const date = screen.getByLabelText('Actual Delivery Date');
    expect(date).toHaveValue(today);
    expect(date).toHaveAttribute('max', today);
    expect(date).toHaveAttribute('min', '2026-10-01');

    fireEvent.change(date, { target: { value: '2026-09-30' } });
    await user.click(screen.getByRole('button', { name: 'Mark delivered' }));
    expect(screen.getByText('Actual delivery date cannot be before the order date (2026-10-01).')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(date, { target: { value: today } });
    await user.click(screen.getByRole('button', { name: 'Mark delivered' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), { status: 'DELIVERED', actualDelivery: today });
    expect(onClose).toHaveBeenCalled();
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
