import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOrderModal } from './CreateOrderModal';
import type { ItemResponse } from '../../item-management/types/item.types';
import type { DealerResponse } from '../../dealer-management/types/dealer.types';

const ITEMS = [{ id: 7, name: 'Motherboard', brand: 'ASUS', mrp: 1299.5, unitOfMeasure: 'PCS', isActive: true }] as unknown as ItemResponse[];
const DEALERS = [{ id: 3, name: 'Acme Traders', isActive: true }] as unknown as DealerResponse[];

describe('Create Procurement Order: unit price', () => {
  it('is disabled and filled from the selected item’s MRP, which is what gets submitted', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateOrderModal isOpen isSubmitting={false} items={ITEMS} dealers={DEALERS} onClose={() => undefined} onSubmit={onSubmit} />);

    const price = screen.getByTestId('order-unit-price') as HTMLInputElement;
    expect(price).toBeDisabled();
    expect(screen.getByText('Set from the item once you select one.')).toBeInTheDocument();

    const [itemSelect, dealerSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(itemSelect, '7');
    await user.selectOptions(dealerSelect, '3');
    expect(price).toHaveValue(1299.5);
    expect(price).toBeDisabled();
    expect(screen.getByText("Taken from the item's MRP.")).toBeInTheDocument();

    // A tampered field value is ignored: the MRP is sent.
    fireEvent.change(price, { target: { value: '1' } });
    const quantity = screen.getAllByRole('spinbutton').find((el) => el !== price)!;
    await user.type(quantity, '4');
    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ itemId: 7, dealerId: 3, unitPrice: 1299.5 }));
  });
});
