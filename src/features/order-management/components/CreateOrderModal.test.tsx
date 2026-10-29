import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOrderModal } from './CreateOrderModal';
import type { ItemResponse } from '../../item-management/types/item.types';
import type { DealerResponse } from '../../dealer-management/types/dealer.types';

const ITEMS = [{ id: 7, name: 'Motherboard', brand: 'ASUS', mrp: 1499, unitOfMeasure: 'PCS', isActive: true }] as unknown as ItemResponse[];
const DEALERS = [{ id: 3, name: 'Acme Traders', isActive: true }] as unknown as DealerResponse[];

const setup = async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<CreateOrderModal isOpen isSubmitting={false} items={ITEMS} dealers={DEALERS} onClose={() => undefined} onSubmit={onSubmit} />);
  const [itemSelect, dealerSelect] = screen.getAllByRole('combobox');
  await user.selectOptions(itemSelect, '7');
  await user.selectOptions(dealerSelect, '3');
  await user.type(screen.getByLabelText(/Quantity/), '4');
  return { onSubmit, user };
};

describe('Create Procurement Order: price', () => {
  it('shows the existing price read-only and quotes it when no new price is given', async () => {
    const { onSubmit, user } = await setup();
    const existing = screen.getByTestId('order-existing-price');
    expect(existing).toBeDisabled();
    expect(existing).toHaveValue(1499);
    expect(screen.getByTestId('order-unit-price')).toHaveValue(null);
    expect(screen.getByTestId('order-price-reason')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ itemId: 7, dealerId: 3, unitPrice: 1499, additionalInfo: {} }));
  });

  it('needs a reason for a new price and sends both with the existing price', async () => {
    const { onSubmit, user } = await setup();
    await user.type(screen.getByTestId('order-unit-price'), '1699');
    expect(screen.getByTestId('order-price-difference')).toHaveTextContent('+₹200.00');
    const reason = screen.getByTestId('order-price-reason');
    expect(reason).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeDisabled();

    await user.type(reason, 'Supplier raised costs');
    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 1699, additionalInfo: { mrp: 1499, priceChangeReason: 'Supplier raised costs' } }),
    );
  });
});
