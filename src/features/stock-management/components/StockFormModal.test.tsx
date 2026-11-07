import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { StockFormModal } from './StockFormModal';
import { scanAllBarcodes } from '../../products-management/pages/barcodeTestUtil';
import type { OrderResponse } from '../../order-management/types/order.types';

const ORDERS = [
  { id: 1, orderNumber: 'ORD-1', supplierName: 'Acme', itemName: 'Motherboard', orderQuantity: 5, orderDate: '2026-10-01', unitType: 'PCS' },
  { id: 2, orderNumber: 'ORD-2', supplierName: 'Acme', itemName: 'Cable', orderQuantity: 3, orderDate: '2026-10-01', unitType: 'PCS' },
  { id: 3, orderNumber: 'ORD-3', supplierName: 'Acme', itemName: 'Fan', orderQuantity: 4, orderDate: '2026-10-01', unitType: 'PCS' },
] as unknown as OrderResponse[];

vi.mock('../hooks/useReceivableOrders', () => ({ useReceivableOrders: () => ({ orders: ORDERS, isLoading: false }) }));
// ORD-3 already has a stock entry, so it can't be used again.
const EXISTING_STOCKS = [{ id: 9, orderNumber: 'ORD-3', stockIdentityNumber: 'STK-9' }];
vi.mock('../../../hooks/useLookupOptions', () => ({
  useItemOptions: () => ({ options: [], isLoading: false }),
  useStockOptions: () => ({ options: EXISTING_STOCKS, isLoading: false }),
}));

const onRequestSubmit = vi.fn();

const renderForm = (initialOrderNumber?: string) => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <StockFormModal isOpen isSubmitting={false} initialOrderNumber={initialOrderNumber} onClose={() => undefined} onRequestSubmit={onRequestSubmit} />
    </Provider>
  );
  return { user };
};

const passed = () => screen.getByTestId('units-passed-select') as HTMLSelectElement;
const defected = () => screen.getByTestId('defected-units') as HTMLInputElement;
const tested = () => screen.getByRole('checkbox', { name: 'Has Passed Quality Testing' });

beforeEach(() => onRequestSubmit.mockClear());

describe('Create stock entry from order', () => {
  it('offers 0…order quantity for units passed, and nothing until an order is chosen', async () => {
    const { user } = renderForm();
    expect(passed()).toBeDisabled();
    await user.click(screen.getByPlaceholderText('Search or select order...'));
    await user.click(screen.getByRole('button', { name: /ORD-1/ }));
    expect(passed()).toBeEnabled();
    expect(within(passed()).getAllByRole('option').slice(1).map((o) => o.getAttribute('value'))).toEqual(['0', '1', '2', '3', '4', '5']);
  });

  it('calculates defected units and ticks "Has Passed Quality Testing" only when every unit passed — never by hand', async () => {
    const { user } = renderForm('ORD-1');
    expect(tested()).toBeDisabled();
    expect(tested()).not.toBeChecked();

    await user.selectOptions(passed(), '5');
    expect(defected()).toHaveValue(0);
    expect(defected()).toHaveAttribute('readonly');
    expect(tested()).toBeChecked();
    expect(screen.getByText('All units passed the test.')).toBeInTheDocument();

    await user.selectOptions(passed(), '4');
    expect(defected()).toHaveValue(1);
    expect(tested()).not.toBeChecked();
    expect(screen.getByText('1 unit failed the test.')).toBeInTheDocument();
  });

  it('submits the derived values, with one barcode per passed unit', async () => {
    const { user } = renderForm('ORD-1');
    await user.selectOptions(passed(), '3');
    await scanAllBarcodes(user, screen.getByTestId('stock-barcodes-barcodes'));
    await user.click(screen.getByRole('button', { name: /Submit Entry/ }));
    expect(onRequestSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ orderNumber: 'ORD-1', unitsPassedTest: 3, defectedUnits: 2, hasTested: false, barcodes: expect.any(Array) })
    );
    expect(onRequestSubmit.mock.calls[0][0].barcodes).toHaveLength(3);
  });

  it('requires choosing the passed units and scanning each one', async () => {
    const { user } = renderForm('ORD-1');
    expect(screen.getByRole('button', { name: /Submit Entry/ })).toBeDisabled();
    await user.selectOptions(passed(), '5');
    expect(screen.getByRole('button', { name: /Submit Entry/ })).toBeDisabled();
    await scanAllBarcodes(user, screen.getByTestId('stock-barcodes-barcodes'));
    expect(screen.getByRole('button', { name: /Submit Entry/ })).toBeEnabled();
    expect(onRequestSubmit).not.toHaveBeenCalled();
  });

  it('takes barcodes upper-case, refuses malformed and repeated ones, and drops the extra ones when fewer units pass', async () => {
    const { user } = renderForm('ORD-1');
    await user.selectOptions(passed(), '2');
    const scan = screen.getByLabelText(/Barcodes of the 2 passed units/);
    await user.type(scan, 'tq12345678{Enter}');
    expect(screen.getByRole('list', { name: /entered barcodes/ })).toHaveTextContent('TQ12345678');
    await user.type(scan, 'TQ12345678{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('TQ12345678 is already entered.');
    await user.type(scan, 'bad{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('BAD is not a valid barcode');
    await user.type(scan, 'TQ87654321{Enter}');
    expect(screen.getByText('All 2 barcodes entered.')).toBeInTheDocument();

    await user.selectOptions(passed(), '1');
    expect(within(screen.getByRole('list', { name: /entered barcodes/ })).getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Submit Entry/ }));
    expect(onRequestSubmit).toHaveBeenCalledWith(expect.objectContaining({ unitsPassedTest: 1, barcodes: ['TQ12345678'] }));
  });

  it('resets the passed units when a different order is picked', async () => {
    const { user } = renderForm('ORD-1');
    await user.selectOptions(passed(), '5');
    const orderInput = screen.getByPlaceholderText('Search or select order...');
    await user.clear(orderInput);
    await user.type(orderInput, 'ORD-2');
    await user.click(screen.getByRole('button', { name: /ORD-2/ }));
    expect(passed()).toHaveValue('');
    expect(within(passed()).getAllByRole('option').slice(1).map((o) => o.getAttribute('value'))).toEqual(['0', '1', '2', '3']);
    expect(tested()).not.toBeChecked();
  });

  it('does not offer orders that already have a stock entry, and blocks typing one in', async () => {
    const { user } = renderForm();
    await user.click(screen.getByPlaceholderText('Search or select order...'));
    expect(screen.getByRole('button', { name: /ORD-1/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ORD-3/ })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search or select order...'), 'ORD-3');
    expect(screen.getByText('No matching orders without a stock entry')).toBeInTheDocument();
    expect(screen.getByText('Order ORD-3 already has stock entry STK-9. An order can be used for only one stock entry.')).toBeInTheDocument();
    expect(passed()).toBeDisabled();
    expect(screen.getByRole('button', { name: /Submit Entry/ })).toBeDisabled();
    expect(onRequestSubmit).not.toHaveBeenCalled();
  });
});
