import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import companyProfileReducer from '../../store/companyProfileSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { ApprovalsHub } from './ApprovalsHub';
import { useAuthStore } from '../../store/useAuthStore';
import { axiosClient } from '../../api/axiosClient';
import { signInAsSuperAdmin } from '../../test/access';
import type { BarcodeRequest } from '../barcodes/types/barcode.types';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
const procurement = vi.mocked(axiosClient);

const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, data, timestamp: '', path: '' } });

const request = (overrides: Partial<BarcodeRequest>): BarcodeRequest => ({
  id: 1,
  requestType: 'CORRECTION',
  status: 'PENDING',
  barcodeId: 11,
  currentCode: 'BOARD0001',
  newCode: 'BOARD0009',
  unitType: 'ITEM_UNIT',
  itemName: 'Touch board',
  productTitle: null,
  stockId: 9,
  stockIdentityNumber: 'STK-9',
  batchNumber: 'BAT-1',
  unitsWithoutBarcode: null,
  codes: null,
  reason: 'Label misprinted',
  requestedBy: 4,
  requestedByUsername: 'warehouse1',
  requestedAt: '2026-10-25T10:00:00',
  decidedBy: null,
  decidedByUsername: null,
  decidedAt: null,
  decisionReason: null,
  ...overrides,
});

let pending: BarcodeRequest[];

const renderHub = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer, companyProfile: companyProfileReducer } })}>
      <MemoryRouter>
        <GlobalAlertContainer />
        <ApprovalsHub />
      </MemoryRouter>
    </Provider>
  );

const barcodeRequestCalls = () => procurement.get.mock.calls.filter(([url]) => url === '/v1/barcodes/requests');

beforeEach(() => {
  vi.clearAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
  pending = [
    request({}),
    request({ id: 2, requestType: 'ASSIGNMENT', barcodeId: null, currentCode: null, newCode: null, codes: ['OLD00001', 'OLD00002'], reason: 'Old stock' }),
  ];
  procurement.get.mockImplementation(async (url: string) => ok(url === '/v1/barcodes/requests' ? pending : []));
  procurement.patch.mockImplementation(async (url: string, body: unknown) => {
    const id = Number(/requests\/(\d+)\/decision/.exec(url)?.[1]);
    pending = pending.filter((entry) => entry.id !== id);
    const decision = (body as { decision: string }).decision;
    return ok({ ...request({ id }), status: decision }, decision === 'APPROVED' ? 'Barcode request approved' : 'Barcode request rejected');
  });
});

describe('Approvals hub: barcodes', () => {
  it('a Level 2 Super Admin approves a correction and rejects an assignment with a reason', async () => {
    signInAsSuperAdmin('ADMIN_L2');
    const user = userEvent.setup();
    renderHub();

    const tab = await screen.findByRole('tab', { name: /Barcodes/ });
    await waitFor(() => expect(tab).toHaveTextContent('2'));
    await user.click(tab);
    const panel = await screen.findByRole('region', { name: 'Barcode requests awaiting approval' });
    expect(within(panel).getByText(/barcode BOARD0001 → BOARD0009/)).toBeInTheDocument();
    expect(within(panel).getByText('OLD00001, OLD00002')).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Approve barcode request 1' }));
    await user.click(await screen.findByRole('button', { name: /Yes, Approve/ }));
    await waitFor(() => expect(procurement.patch).toHaveBeenCalledWith('/v1/barcodes/requests/1/decision', { decision: 'APPROVED' }));
    expect(await screen.findByText('Barcode request approved')).toBeInTheDocument();
    await waitFor(() => expect(within(panel).queryByText(/BOARD0001 → BOARD0009/)).not.toBeInTheDocument());

    await user.click(within(panel).getByRole('button', { name: 'Reject barcode request 2' }));
    await user.type(screen.getByPlaceholderText(/reason for rejecting/), 'Wrong labels');
    await user.click(screen.getByRole('button', { name: 'Proceed to Confirmation' }));
    await user.click(await screen.findByRole('button', { name: 'Yes, Reject' }));
    await waitFor(() =>
      expect(procurement.patch).toHaveBeenCalledWith('/v1/barcodes/requests/2/decision', { decision: 'REJECTED', reason: 'Wrong labels' })
    );
  });

  it('is not offered, and never loaded, without BARCODE_APPROVE', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const user = useAuthStore.getState().user!;
    expect(user.permissions).not.toContain('BARCODE_APPROVE');
    renderHub();
    await screen.findByRole('tablist', { name: 'Approval queues' });
    expect(screen.queryByRole('tab', { name: /Barcodes/ })).not.toBeInTheDocument();
    expect(barcodeRequestCalls()).toHaveLength(0);
  });
});
