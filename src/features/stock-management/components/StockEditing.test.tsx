import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { StockEditModal } from './StockEditModal';
import { StockTable } from './StockTable';
import type { StockResponse } from '../types/stock.types';

vi.mock('../../../hooks/useLookupOptions', () => ({
  useDealerOptions: () => ({ options: [{ id: 3, name: 'Acme Traders' }, { id: 4, name: 'Other Dealer' }], isLoading: false }),
  useItemOptions: () => ({ options: [{ id: 7, name: 'Motherboard' }, { id: 8, name: 'Cable' }], isLoading: false }),
}));

const STOCK = {
  id: 1,
  stockIdentityNumber: 'STK-1',
  batchNumber: 'BAT-1',
  orderNumber: 'ORD-1',
  dealerId: 3,
  dealerName: 'Acme Traders',
  itemId: 7,
  itemName: 'Motherboard',
  totalOrderQuantity: 10,
  unitType: 'PCS',
  unitsPassedTest: 8,
  defectedUnits: 2,
  availableUnits: 8,
  hasTested: false,
  additionalInfo: null,
  approvalStatus: 'PENDING',
  dateOfArrival: '2026-10-05',
  isActive: true,
} as unknown as StockResponse;

const withStore = (ui: React.ReactElement) => (
  <Provider store={configureStore({ reducer: { alert: alertReducer } })}>{ui}</Provider>
);

describe('Stock quantities are never adjusted after creation', () => {
  it('the stock table has no add / reduce quantity actions', () => {
    render(withStore(<StockTable stocks={[STOCK]} isLoading={false} onView={() => undefined} onEdit={() => undefined} onApproval={() => undefined} />));
    expect(screen.queryByTitle('Add Stock Quantity')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Reduce Stock Quantity')).not.toBeInTheDocument();
    expect(screen.getByTitle('Edit Stock Details')).toBeInTheDocument();
  });

  it('Edit Stock Batch shows units, test result, dealer and item disabled and sends the stored values back', async () => {
    const onRequestSubmit = vi.fn();
    const user = userEvent.setup();
    render(withStore(<StockEditModal isOpen stock={STOCK} isSubmitting={false} onClose={() => undefined} onRequestSubmit={onRequestSubmit} />));

    expect(screen.getByTestId('edit-units-passed')).toBeDisabled();
    expect(screen.getByTestId('edit-units-passed')).toHaveValue(8);
    expect(screen.getByTestId('edit-defected-units')).toBeDisabled();
    expect(screen.getByTestId('edit-defected-units')).toHaveValue(2);
    expect(screen.getByRole('checkbox', { name: 'Has Passed Quality Testing' })).toBeDisabled();
    expect(screen.getByDisplayValue('Acme Traders')).toBeDisabled(); // dealer fixed to the order
    expect(screen.getByDisplayValue('Motherboard')).toBeDisabled(); // item fixed to the order
    expect(screen.getByText(/can't be edited\. To add stock, create a new stock entry/)).toBeInTheDocument();

    // Even a tampered DOM value is ignored: the stored values are sent.
    const passed = screen.getByTestId('edit-units-passed') as HTMLInputElement;
    passed.removeAttribute('disabled');
    await user.clear(passed);
    await user.type(passed, '10');
    await user.click(screen.getByRole('button', { name: /Save|Update/ }));

    expect(onRequestSubmit).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ dealerId: 3, itemId: 7, unitsPassedTest: 8, defectedUnits: 2, hasTested: false, batchNumber: 'BAT-1' })
    );
  });
});
