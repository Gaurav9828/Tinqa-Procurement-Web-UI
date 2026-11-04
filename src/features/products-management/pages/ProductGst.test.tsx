import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { signInAsSuperAdmin } from '../../../test/access';
import { fillCategory } from './categoryTestUtil';
import { scanUnitBarcodes, openFormTab, fillFrontImage } from './barcodeTestUtil';
import { CreateProductModal } from '../components/CreateProductModal';
import type { CreateProductRequest } from '../types/product.types';

// The form's lookups (items and stock for the cost sheet, costing settings): empty, these tests are about other fields
vi.mock('../../item-management/api/itemApi', () => ({
  itemApi: { getItems: vi.fn().mockResolvedValue({ success: true, data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 1000 } }), getItemWarranties: vi.fn().mockResolvedValue({ success: true, data: [] }) },
}));
vi.mock('../../stock-management/api/stockApi', () => ({
  stockApi: { getAllStocks: vi.fn().mockResolvedValue({ success: true, data: [] }), getItemAvailability: vi.fn() },
}));
vi.mock('../api/costingApi', () => ({
  costingApi: { getSettings: vi.fn().mockResolvedValue({ success: true, data: { incomeTaxRate: 25 } }), getItemCost: vi.fn() },
}));

const renderCreate = () => {
  const onSubmit = vi.fn<(payload: CreateProductRequest) => Promise<boolean>>().mockResolvedValue(true);
  signInAsSuperAdmin('ADMIN_L1');
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <CreateProductModal isOpen isSubmitting={false} onClose={() => {}} onSubmit={onSubmit} />
    </Provider>
  );
  return { onSubmit, user: userEvent.setup() };
};

const gst = () => screen.getByRole('group', { name: 'GST' });

describe('product GST (price includes GST, charged by place of supply)', () => {
  it('requires the GST rate and HSN/SAC before the product can be saved', async () => {
    const { user } = renderCreate();
    await user.type(screen.getByPlaceholderText('Product Title'), 'Rudraa X1');
    await user.type(screen.getByLabelText(/Model name/), 'MDL-6');
    await openFormTab(user, 'Price & GST');
    await user.type(screen.getByPlaceholderText('0.00'), '59999');
    expect(within(gst()).getByText('Choose the GST rate.')).toBeInTheDocument();
    expect(within(gst()).getByText('HSN/SAC is required on GST invoices.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Product' })).toBeDisabled();

    // Only the rates in force are offered
    const options = within(screen.getByLabelText('GST rate *')).getAllByRole('option').map((o) => o.getAttribute('value'));
    expect(options).toEqual(['', '0', '0.25', '1.5', '3', '5', '18', '40']);
  });

  it('shows the in-state (CGST + SGST) and inter-state (IGST) split, and sends the rate after the preview', async () => {
    const { user, onSubmit } = renderCreate();
    await user.type(screen.getByPlaceholderText('Product Title'), 'Rudraa X1');
    await user.type(screen.getByLabelText(/Model name/), 'MDL-7');
    await openFormTab(user, 'Price & GST');
    await user.type(screen.getByPlaceholderText('0.00'), '59999');
    await user.selectOptions(screen.getByLabelText('GST rate *'), '18');
    await user.type(screen.getByLabelText('HSN / SAC code *'), '9405');
    await fillCategory(user, 'Spare parts');

    await openFormTab(user, 'Price & GST');
    const split = within(gst()).getByRole('region', { name: 'Invoice split per unit' });
    expect(within(split).getByTestId('intra-taxable')).toHaveTextContent('₹50,846.62');
    expect(within(split).getByTestId('intra-cgst')).toHaveTextContent('₹4,576.19');
    expect(within(split).getByTestId('intra-sgst')).toHaveTextContent('₹4,576.19');
    expect(within(split).getByTestId('intra-total')).toHaveTextContent('₹59,999.00');
    expect(within(split).getByTestId('inter-taxable')).toHaveTextContent('₹50,846.61');
    expect(within(split).getByTestId('inter-igst')).toHaveTextContent('₹9,152.39');
    expect(within(split).getByTestId('inter-total')).toHaveTextContent('₹59,999.00');
    expect(split).toHaveTextContent('CGST @ 9%');
    expect(split).toHaveTextContent('IGST @ 18%');

    await fillFrontImage(user);
    await scanUnitBarcodes(user);
    await user.click(screen.getByRole('button', { name: 'Create Product' }));
    expect(screen.getByTestId('preview-gst')).toHaveTextContent('GST 18% · HSN/SAC 9405');
    const preview = screen.getByRole('region', { name: 'What the invoice will show per unit' });
    expect(within(preview).getByTestId('intra-cgst')).toHaveTextContent('₹4,576.19');

    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ price: 59999, hsnSac: '9405', gstRate: 18 }));
  });

  it('splits the discounted selling price', async () => {
    const { user } = renderCreate();
    await openFormTab(user, 'Price & GST');
    await user.type(screen.getByPlaceholderText('0.00'), '1000');
    await user.type(screen.getByPlaceholderText('0'), '10');
    await user.selectOptions(screen.getByLabelText('GST rate *'), '18');
    const split = within(gst()).getByRole('region', { name: 'Invoice split per unit' });
    expect(split).toHaveTextContent('less 10% discount');
    expect(within(split).getByTestId('inter-igst')).toHaveTextContent('₹137.29');
    expect(within(split).getByTestId('inter-total')).toHaveTextContent('₹900.00');
  });
});
