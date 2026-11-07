import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOrderModal } from './CreateOrderModal';
import type { ItemResponse } from '../../item-management/types/item.types';
import type { SupplierResponse } from '../../supplier-management/types/supplier.types';

const ITEMS = [{ id: 7, name: 'Motherboard', brand: 'ASUS', mrp: 1499, unitOfMeasure: 'PCS', isActive: true }] as unknown as ItemResponse[];
const SUPPLIERS = [{ id: 3, name: 'Acme Traders', isActive: true }] as unknown as SupplierResponse[];

const setup = async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<CreateOrderModal isOpen isSubmitting={false} items={ITEMS} suppliers={SUPPLIERS} onClose={() => undefined} onSubmit={onSubmit} />);
  const [itemSelect, supplierSelect] = screen.getAllByRole('combobox');
  await user.selectOptions(itemSelect, '7');
  await user.selectOptions(supplierSelect, '3');
  await user.type(screen.getByLabelText(/Quantity/), '4');
  await user.click(screen.getByRole('tab', { name: /Payment plan/ }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Expected payment method' }), 'BANK_TRANSFER');
  return { onSubmit, user };
};

describe('Create Procurement Order: price', () => {
  it('shows the existing price read-only and quotes it when no new price is given', async () => {
    const { onSubmit, user } = await setup();
    await user.click(screen.getByRole('tab', { name: /Item & supplier/ }));
    const existing = screen.getByTestId('order-existing-price');
    expect(existing).toBeDisabled();
    expect(existing).toHaveValue(1499);
    expect(screen.getByTestId('order-unit-price')).toHaveValue(null);
    expect(screen.getByTestId('order-price-reason')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ itemId: 7, supplierId: 3, unitPrice: 1499, additionalInfo: {} }));
  });
});

describe('Create Procurement Order: payment plan', () => {
  it('starts at 30% advance and 20% midterm, and works out the final part as the rest', async () => {
    const { onSubmit, user } = await setup();
    const plan = within(screen.getByRole('group', { name: 'Payment plan' }));
    expect(plan.getByTestId('plan-final-percent')).toHaveValue('50%');
    // 4 x 1499 = 5996: the advance is worth 1798.80
    expect(plan.getByText(/Once the order is approved · ₹1,798.80/)).toBeInTheDocument();

    const advance = plan.getByRole('spinbutton', { name: /Advance/ });
    await user.clear(advance);
    await user.type(advance, '25');
    const midterm = plan.getByRole('spinbutton', { name: /Midterm/ });
    await user.clear(midterm);
    await user.type(midterm, '15.5');
    expect(plan.getByTestId('plan-final-percent')).toHaveValue('59.5%');

    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ advancePercent: 25, midtermPercent: 15.5, expectedPaymentMethod: 'BANK_TRANSFER' }),
    );
  });

  it('can leave out the midterm part: advance and final only', async () => {
    const { onSubmit, user } = await setup();
    const plan = within(screen.getByRole('group', { name: 'Payment plan' }));
    await user.click(plan.getByRole('checkbox', { name: /Midterm payment/ }));
    expect(plan.queryByRole('spinbutton', { name: /Midterm/ })).not.toBeInTheDocument();
    expect(plan.getByTestId('plan-final-percent')).toHaveValue('70%');

    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ advancePercent: 30, midtermPercent: 0, expectedPaymentMethod: 'BANK_TRANSFER' }));
  });

  it("can't be saved with more than 50% before testing, or without the expected payment method", async () => {
    const { onSubmit, user } = await setup();
    const plan = within(screen.getByRole('group', { name: 'Payment plan' }));
    const advance = plan.getByRole('spinbutton', { name: /Advance/ });
    // 40 % advance + 20 % midterm leaves 40 % for after delivery: at least half must be left
    await user.clear(advance);
    await user.type(advance, '40');
    expect(plan.getByTestId('plan-final-percent')).toHaveValue('40%');
    expect(plan.getByText('At least 50% is paid after delivery and testing, so advance and midterm together can be at most 50% (they are 60%).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeDisabled();

    // 80 % in advance and no midterm: the advance is what is too high
    await user.click(plan.getByRole('checkbox', { name: /Midterm payment/ }));
    await user.clear(advance);
    await user.type(advance, '80');
    expect(plan.getByTestId('plan-final-percent')).toHaveValue('20%');
    expect(plan.getByText(/at most 50% \(they are 80%\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeDisabled();

    await user.clear(advance);
    await user.type(advance, '50');
    expect(plan.getByTestId('plan-final-percent')).toHaveValue('50%');
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeEnabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('needs a reason for a new price and sends both with the existing price', async () => {
    const { onSubmit, user } = await setup();
    await user.click(screen.getByRole('tab', { name: /Item & supplier/ }));
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

describe('Create Procurement Order: tabs', () => {
  it('splits the form into item, GST and payment tabs, each marked with what it still needs', async () => {
    const user = userEvent.setup();
    render(<CreateOrderModal isOpen isSubmitting={false} items={ITEMS} suppliers={SUPPLIERS} onClose={() => undefined} onSubmit={vi.fn()} />);
    const tabs = within(screen.getByRole('tablist', { name: 'Order sections' }));
    expect(tabs.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      expect.stringContaining('Item & supplier'),
      expect.stringContaining('GST'),
      expect.stringContaining('Payment plan'),
    ]);
    // A new order has no delivery tab: the date is agreed once it is approved
    expect(tabs.queryByRole('tab', { name: /Delivery/ })).not.toBeInTheDocument();
    expect(tabs.getByRole('tab', { name: /Item & supplier/ })).toHaveAttribute('aria-selected', 'true');
    expect(within(tabs.getByRole('tab', { name: /Item & supplier/ })).getByRole('img', { name: 'still needed to submit' })).toBeInTheDocument();
    expect(screen.getByTestId('order-total')).toHaveTextContent('—');

    const [itemSelect, supplierSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(itemSelect, '7');
    await user.selectOptions(supplierSelect, '3');
    await user.type(screen.getByLabelText(/Quantity/), '4');
    expect(within(tabs.getByRole('tab', { name: /Item & supplier/ })).getByRole('img', { name: 'done' })).toBeInTheDocument();
    expect(screen.getByTestId('order-total')).toHaveTextContent('5,996');

    // The payment method is still missing: the payment tab says so, and Next leads there
    const paymentTab = tabs.getByRole('tab', { name: /Payment plan/ });
    expect(within(paymentTab).getByRole('img', { name: 'still needed to submit' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(paymentTab).toHaveAttribute('aria-selected', 'true');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Expected payment method' }), 'BANK_TRANSFER');
    expect(within(paymentTab).getByRole('img', { name: 'done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeEnabled();
  });
});
