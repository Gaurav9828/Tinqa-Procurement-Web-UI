import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditOrderModal } from './EditOrderModal';
import type { OrderResponse } from '../types/order.types';
import type { ItemResponse } from '../../item-management/types/item.types';
import type { SupplierResponse } from '../../supplier-management/types/supplier.types';
import { signInAsSuperAdmin } from '../../../test/access';

const ITEMS = [{ id: 7, name: 'Motherboard', brand: 'ASUS', mrp: 1499, unitOfMeasure: 'PCS', isActive: true }] as unknown as ItemResponse[];
const SUPPLIERS = [{ id: 3, name: 'Acme Traders', isActive: true }] as unknown as SupplierResponse[];

const ORDER = {
  id: 1, orderNumber: 'ORD-1', supplierId: 3, supplierName: 'Acme Traders', itemId: 7, itemName: 'Motherboard',
  orderQuantity: 4, unitType: 'PCS', unitPrice: 1499, totalPrice: 5996, shipmentPrice: 0, taxBreakup: null,
  advancePercent: 30, midtermPercent: 30, finalPercent: 40, expectedPaymentMethod: 'BANK_TRANSFER',
  orderStatus: 'PENDING', expectedDelivery: null, actualDelivery: null, orderDate: '2099-01-01', additionalInfo: {},
  createdAt: '2099-01-01T10:00:00Z', createdBy: 1,
} as OrderResponse;

const renderEdit = (onSubmit = vi.fn()) => {
  signInAsSuperAdmin('ADMIN_L2');
  render(<EditOrderModal order={ORDER} isOpen isSubmitting={false} items={ITEMS} suppliers={SUPPLIERS} onClose={() => undefined} onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
};

describe('Edit order: tabs', () => {
  it('opens on the item tab, with GST, payment plan and delivery as their own tabs', () => {
    renderEdit();
    const tabs = within(screen.getByRole('tablist', { name: 'Order sections' }));
    expect(tabs.getAllByRole('tab')).toHaveLength(4);
    expect(tabs.getByRole('tab', { name: /Item & supplier/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('order-total')).toHaveTextContent('5,996');
    // Nothing changed yet
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.getByText('Change at least one value to save.')).toBeInTheDocument();
  });

  it('sets the expected delivery in the delivery tab and saves it after the confirmation', async () => {
    const { onSubmit, user } = renderEdit();
    await user.click(screen.getByRole('tab', { name: /Delivery/ }));
    await user.type(screen.getByLabelText(/Expected Delivery Date/), '2099-12-31');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Confirm' }));
    expect(onSubmit).toHaveBeenCalledWith(1, expect.objectContaining({ expectedDelivery: '2099-12-31', unitPrice: 1499 }));
  });

  it('asks for the reason of a new price from every tab until it is given', async () => {
    const { onSubmit, user } = renderEdit();
    const price = screen.getByLabelText(/Unit Price/);
    await user.clear(price);
    await user.type(price, '1699');
    await user.click(screen.getByRole('tab', { name: /GST/ }));
    expect(screen.getByTestId('order-price-reason-needed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(within(screen.getByRole('tab', { name: /Item & supplier/ })).getByRole('img', { name: 'still needed to submit' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Item & supplier/ }));
    await user.type(screen.getByRole('textbox', { name: 'Reason for the new price' }), 'Supplier raised costs');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Confirm' }));
    expect(onSubmit).toHaveBeenCalledWith(1, expect.objectContaining({ unitPrice: 1699, additionalInfo: { priceChangeReason: 'Supplier raised costs' } }));
  });
});
