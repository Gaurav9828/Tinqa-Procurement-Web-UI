import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { axiosClient } from '../../../api/axiosClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { signInAsSuperAdmin } from '../../../test/access';
import { StockBarcodesPanel } from './StockBarcodesPanel';
import type { BarcodeUnit } from '../types/barcode.types';

vi.mock('../../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn() } }));
const procurement = vi.mocked(axiosClient);
const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, data, timestamp: '', path: '' } });

const piece = (id: number, code: string, status: BarcodeUnit['status'], extra: Partial<BarcodeUnit> = {}) =>
  ({ id, code, status, unitType: 'ITEM_UNIT', locked: status !== 'PENDING', itemName: 'Touch board', ...extra }) as BarcodeUnit;

const renderPanel = (unitsWithoutBarcode = 0) => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
        <GlobalAlertContainer />
        <StockBarcodesPanel stockId={9} stockIdentityNumber="STK-9" unitsWithoutBarcode={unitsWithoutBarcode} />
      </Provider>
    </MemoryRouter>
  );
  return { user };
};

beforeEach(() => {
  vi.clearAllMocks();
  signInAsSuperAdmin('ADMIN_L1');
  procurement.get.mockResolvedValue(
    ok([
      piece(1, 'BOARD0001', 'IN_STOCK'),
      piece(2, 'BOARD0002', 'FITTED', { fittedIntoCode: 'PANEL0001', productTitle: 'Smart Panel' }),
      piece(3, 'BOARD0003', 'VOID'),
    ])
  );
});

describe('A stock entry’s unit barcodes', () => {
  it('lists every live piece with what it is doing now, each linked to its trace', async () => {
    renderPanel();
    const panel = await screen.findByRole('region', { name: 'Unit barcodes' });
    await within(panel).findByText('BOARD0001');
    expect(procurement.get).toHaveBeenCalledWith('/v1/barcodes', { params: { stockId: 9 } });
    expect(within(panel).getByText('Unit barcodes (2)')).toBeInTheDocument(); // the voided one is left out
    expect(within(panel).getByText('in Smart Panel')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'BOARD0002' })).toHaveAttribute('href', '/barcodes?code=BOARD0002');
    expect(within(panel).queryByRole('button', { name: /Assign barcodes/ })).not.toBeInTheDocument();
  });

  it('asks for barcodes for units received before barcodes were recorded', async () => {
    procurement.post.mockResolvedValue(ok({ id: 5, status: 'PENDING' }, 'Barcode request sent to a Super Admin for approval'));
    const { user } = renderPanel(2);
    await user.click(await screen.findByRole('button', { name: 'Assign barcodes to 2 units' }));
    const dialog = screen.getByRole('dialog', { name: 'Assign barcodes' });
    await user.type(within(dialog).getByLabelText(/Barcodes of the units without one/), 'OLD00001{Enter}OLD00002{Enter}');
    await user.type(within(dialog).getByLabelText(/Reason/), 'Received before barcodes');
    await user.click(within(dialog).getByRole('button', { name: 'Send for approval' }));
    await waitFor(() =>
      expect(procurement.post).toHaveBeenCalledWith('/v1/barcodes/requests', {
        requestType: 'ASSIGNMENT', stockId: 9, codes: ['OLD00001', 'OLD00002'], reason: 'Received before barcodes',
      })
    );
  });

  it('shows nothing, and loads nothing, without BARCODE_VIEW', () => {
    const user = useAuthStore.getState().user!;
    useAuthStore.setState({ user: { ...user, permissions: ['STOCK_VIEW'] } });
    renderPanel();
    expect(screen.queryByRole('region', { name: 'Unit barcodes' })).not.toBeInTheDocument();
    expect(procurement.get).not.toHaveBeenCalled();
  });
});
