import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderTable } from './OrderTable';
import { todayLocalIsoDate } from '../validator/orderValidator';
import type { OrderResponse } from '../types/order.types';

const ORDER = {
  id: 1,
  orderNumber: 'ORD-1',
  dealerName: 'Acme Traders',
  itemName: 'Motherboard',
  orderQuantity: 10,
  unitType: 'PCS',
  unitPrice: 100,
  totalPrice: 1000,
  orderStatus: 'SHIPPED',
  orderDate: '2026-10-01',
  actualDelivery: null,
} as unknown as OrderResponse;

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('Order status confirmation: actual delivery date', () => {
  it('cannot be a future date (max today), and Confirm is blocked for one', async () => {
    const onStatusUpdate = vi.fn();
    const user = userEvent.setup();
    render(<OrderTable orders={[ORDER]} isLoading={false} onPreview={() => undefined} onEdit={() => undefined} onStatusUpdate={onStatusUpdate} />);

    await user.selectOptions(screen.getByDisplayValue('SHIPPED'), 'DELIVERED');
    const today = todayLocalIsoDate();
    const date = screen.getByLabelText('Actual Delivery Date') as HTMLInputElement;
    expect(date).toHaveAttribute('max', today);
    expect(date).toHaveAttribute('min', '2026-10-01');
    expect(date).toHaveValue(today); // defaults to today (local date)

    fireEvent.change(date, { target: { value: addDays(today, 1) } }); // typed past the picker limit
    expect(screen.getByRole('alert')).toHaveTextContent('Actual delivery date cannot be in the future.');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();

    fireEvent.change(date, { target: { value: today } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onStatusUpdate).toHaveBeenCalledWith(ORDER, { status: 'DELIVERED', actualDelivery: today });
  });

  it('cannot be before the order date', async () => {
    const user = userEvent.setup();
    render(<OrderTable orders={[ORDER]} isLoading={false} onPreview={() => undefined} onEdit={() => undefined} onStatusUpdate={() => undefined} />);
    await user.selectOptions(screen.getByDisplayValue('SHIPPED'), 'DELIVERED');
    fireEvent.change(screen.getByLabelText('Actual Delivery Date'), { target: { value: '2026-09-30' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Actual delivery date cannot be before the order date (2026-10-01).');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });
});
