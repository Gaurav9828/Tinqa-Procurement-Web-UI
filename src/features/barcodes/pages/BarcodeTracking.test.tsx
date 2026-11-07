import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { axiosClient } from '../../../api/axiosClient';
import { signInAsSuperAdmin } from '../../../test/access';
import { BarcodeTrackingPage } from './BarcodeTrackingPage';
import type { BarcodeTrace, BarcodeUnit } from '../types/barcode.types';

vi.mock('../../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn() } }));
const procurement = vi.mocked(axiosClient);

const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, data, timestamp: '', path: '' } });
const notFound = () => {
  const response = { status: 404, statusText: '404', data: { success: false, message: 'No unit carries barcode' }, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError('404', '404', response.config, {}, response);
};

const unit = (overrides: Partial<BarcodeUnit>): BarcodeUnit => ({
  id: 1,
  code: 'PANEL0001',
  unitType: 'PRODUCT_UNIT',
  status: 'IN_STOCK',
  locked: true,
  statusNote: null,
  itemId: null,
  itemName: null,
  itemSku: null,
  stockId: null,
  stockIdentityNumber: null,
  batchNumber: null,
  ecommerceProductId: 5,
  productTitle: 'Smart Panel',
  fittedIntoId: null,
  fittedIntoCode: null,
  createdAt: '2026-10-20T10:00:00',
  createdByName: 'catalog@tinqa.com',
  lockedAt: '2026-10-21T10:00:00',
  ...overrides,
});
const SOURCE = {
  stockId: 9,
  stockIdentityNumber: 'STK-9',
  batchNumber: 'BAT-20261001-3',
  dateOfArrival: '2026-10-05',
  stockApprovalStatus: 'APPROVED' as const,
  receivedBy: 'warehouse1',
  approvedBy: 'manager2',
  orderNumber: 'ORD-77',
  orderDate: '2026-09-28',
  deliveredOn: '2026-10-04',
  supplierId: 3,
  supplierName: 'Acme Components',
};
const BOARD = unit({ id: 2, code: 'BOARD0001', unitType: 'ITEM_UNIT', status: 'FITTED', itemId: 7, itemName: 'Touch board', itemSku: 'TB-1', stockId: 9, fittedIntoId: 1, fittedIntoCode: 'PANEL0001' });
const PANEL_TRACE: BarcodeTrace = {
  unit: unit({}),
  source: null,
  fittedInto: null,
  parts: [{ unit: BOARD, source: SOURCE }],
  history: [
    { eventType: 'REGISTERED', fromStatus: null, toStatus: 'PENDING', oldCode: null, newCode: null, fittedIntoCode: null, note: null, actorName: 'catalog@tinqa.com', at: '2026-10-20T10:00:00' },
    { eventType: 'APPROVED', fromStatus: 'PENDING', toStatus: 'IN_STOCK', oldCode: null, newCode: null, fittedIntoCode: null, note: null, actorName: 'manager2', at: '2026-10-21T10:00:00' },
  ],
  requests: [],
};
const BOARD_TRACE: BarcodeTrace = { unit: BOARD, source: SOURCE, fittedInto: unit({}), parts: [], history: [], requests: [] };

let traces: Record<string, BarcodeTrace>;

const renderAt = (path: string) => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
        <GlobalAlertContainer />
        <BarcodeTrackingPage />
      </Provider>
    </MemoryRouter>
  );
  return { user };
};

beforeEach(() => {
  vi.clearAllMocks();
  signInAsSuperAdmin('ADMIN_L1');
  traces = { PANEL0001: structuredClone(PANEL_TRACE), BOARD0001: structuredClone(BOARD_TRACE) };
  procurement.get.mockImplementation(async (url: string) => {
    const code = decodeURIComponent(url.replace('/v1/barcodes/trace/', ''));
    if (traces[code]) return ok(traces[code]);
    throw notFound();
  });
});

describe('Barcode Tracking', () => {
  it('traces a product unit from a link: the parts inside and where each came from', async () => {
    renderAt('/barcodes?code=PANEL0001');
    expect(await screen.findByTestId('traced-code')).toHaveTextContent('PANEL0001');
    expect(procurement.get).toHaveBeenCalledWith('/v1/barcodes/trace/PANEL0001');
    const parts = within(screen.getByRole('region', { name: 'Parts inside' }));
    expect(parts.getByText('BOARD0001')).toBeInTheDocument();
    expect(parts.getByText('Acme Components')).toBeInTheDocument();
    expect(parts.getByText('ORD-77')).toBeInTheDocument();
    expect(parts.getByText('BAT-20261001-3')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'History' })).getByText('Approved and locked')).toBeInTheDocument();
  });

  it('traces a scanned piece to the product unit it is fitted into, and answers a repeat scan from memory', async () => {
    const { user } = renderAt('/barcodes');
    await user.type(screen.getByLabelText('Barcode'), 'board0001{Enter}');
    expect(await screen.findByTestId('traced-code')).toHaveTextContent('BOARD0001');
    expect(within(screen.getByRole('region', { name: 'Fitted into' })).getByText('PANEL0001')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Where it came from' })).getByText('warehouse1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Trace/ }));
    expect(procurement.get).toHaveBeenCalledTimes(1);
  });

  it('says when no unit carries the code', async () => {
    const { user } = renderAt('/barcodes');
    await user.type(screen.getByLabelText('Barcode'), 'NOSUCH0001{Enter}');
    expect(await screen.findByRole('status')).toHaveTextContent('No piece or product unit carries barcode NOSUCH0001');
  });

  it('a Level 1 admin asks a Super Admin to correct a locked barcode', async () => {
    procurement.post.mockResolvedValue(ok({ id: 1, status: 'PENDING' }, 'Barcode request sent to a Super Admin for approval'));
    const { user } = renderAt('/barcodes?code=BOARD0001');
    await user.click(await screen.findByRole('button', { name: /Correct barcode/ }));
    const dialog = screen.getByRole('dialog', { name: 'Correct barcode' });
    expect(dialog).toHaveTextContent('Your request goes to a Super Admin');
    await user.type(within(dialog).getByLabelText(/New barcode/), 'board0001');
    expect(within(dialog).getByText('The new barcode is the same as the current one.')).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText(/New barcode/));
    await user.type(within(dialog).getByLabelText(/New barcode/), 'board0009');
    expect(within(dialog).getByRole('button', { name: 'Send for approval' })).toBeDisabled(); // reason required
    await user.type(within(dialog).getByLabelText(/Reason/), 'Label misprinted');
    await user.click(within(dialog).getByRole('button', { name: 'Send for approval' }));

    await waitFor(() => expect(procurement.post).toHaveBeenCalledWith('/v1/barcodes/requests', {
      requestType: 'CORRECTION', barcodeId: 2, newCode: 'BOARD0009', reason: 'Label misprinted',
    }));
    expect(await screen.findByText('Barcode request sent to a Super Admin for approval')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("a Super Admin's correction applies at once and the barcode is shown under its new code", async () => {
    signInAsSuperAdmin('ADMIN_L2');
    procurement.post.mockImplementation(async () => {
      traces.BOARD0009 = { ...traces.BOARD0001, unit: { ...traces.BOARD0001.unit, code: 'BOARD0009' } };
      delete traces.BOARD0001;
      return ok({ id: 1, status: 'APPROVED' }, 'Barcode change applied');
    });
    const { user } = renderAt('/barcodes?code=BOARD0001');
    await user.click(await screen.findByRole('button', { name: /Correct barcode/ }));
    const dialog = screen.getByRole('dialog', { name: 'Correct barcode' });
    expect(dialog).toHaveTextContent('applied straight away');
    await user.type(within(dialog).getByLabelText(/New barcode/), 'BOARD0009');
    await user.type(within(dialog).getByLabelText(/Reason/), 'Relabelled');
    await user.click(within(dialog).getByRole('button', { name: 'Apply change' }));

    await waitFor(() => expect(screen.getByTestId('traced-code')).toHaveTextContent('BOARD0009'));
    expect(screen.getByLabelText('Barcode')).toHaveValue('BOARD0009');
  });

  it('offers no correction to those who can only trace', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { useAuthStore } = await import('../../../store/useAuthStore');
    const user = useAuthStore.getState().user!;
    useAuthStore.setState({ user: { ...user, permissions: ['BARCODE_VIEW'] } });
    renderAt('/barcodes?code=PANEL0001');
    expect(await screen.findByTestId('traced-code')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Correct barcode/ })).not.toBeInTheDocument();
  });
});
