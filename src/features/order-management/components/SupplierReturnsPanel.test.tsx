import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { SupplierReturnsPanel } from './SupplierReturnsPanel';
import { supplierReturnApi } from '../api/supplierReturnApi';
import { signInAsSupplier } from '../../../test/access';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Permission } from '../../../config/access';
import { returnsOf, supplierReturn } from '../test/returnFixtures';
import { validateDispatch, validateRaise } from '../utils/returnForms';

vi.mock('../api/supplierReturnApi', () => ({
  supplierReturnApi: {
    forOrder: vi.fn(), raise: vi.fn(), waiting: vi.fn(), decide: vi.fn(), resend: vi.fn(), cancel: vi.fn(), dispatch: vi.fn(),
    respond: vi.fn(), received: vi.fn(),
  },
}));
const api = vi.mocked(supplierReturnApi);
const ok = <T,>(data: T) => ({ success: true, message: 'OK', data }) as never;

const SUPPLIER_MANAGER: Permission[] = ['PROCUREMENT_ORDER_VIEW', 'SUPPLIER_RETURN_REQUEST'];

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 4, username: 'sm', email: 'sm@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderPanel = (view: 'staff' | 'supplier' = 'staff', defaultOpen = false) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <SupplierReturnsPanel orderId={1} view={view} defaultOpen={defaultOpen} />
    </Provider>
  );

const open = async (user: ReturnType<typeof userEvent.setup>, name = 'Failed pieces returns') => {
  await user.click(screen.getByRole('button', { name }));
};

beforeEach(() => {
  vi.clearAllMocks();
  api.forOrder.mockResolvedValue(ok(returnsOf([])));
});

describe('Failed pieces returns (order view)', () => {
  it('loads nothing until opened, then raises a return within the units left', async () => {
    const user = userEvent.setup();
    signIn(SUPPLIER_MANAGER);
    api.raise.mockResolvedValue(ok(supplierReturn()));
    renderPanel();
    expect(api.forOrder).not.toHaveBeenCalled();
    await open(user);
    await waitFor(() => expect(api.forOrder).toHaveBeenCalledWith(1, 'staff'));
    expect(await screen.findByTestId('return-units')).toHaveTextContent('Failed testing: 5 · in returns: 2 · left: 3');

    await user.click(screen.getByRole('button', { name: 'Raise return' }));
    const form = within(screen.getByRole('form', { name: 'Raise a return' }));
    const units = form.getByRole('spinbutton', { name: 'Units to return' });
    expect(units).toHaveValue(3);
    await user.clear(units);
    await user.type(units, '4');
    await user.click(form.getByRole('button', { name: 'Send for Super Admin approval' }));
    // More than is left, no reason, no shipping mode: nothing is sent
    expect(form.getByText('At most 3 failed units are left to return.')).toBeInTheDocument();
    expect(form.getByText('Say why the pieces go back.')).toBeInTheDocument();
    expect(form.getByText(/Choose whether TinQa ships/)).toBeInTheDocument();
    expect(api.raise).not.toHaveBeenCalled();

    await user.clear(units);
    await user.type(units, '2');
    await user.type(form.getByRole('textbox', { name: 'Reason for the return' }), 'No power');
    await user.type(form.getByRole('textbox', { name: 'Piece details' }), 'SN-1, SN-2');
    await user.click(form.getByRole('radio', { name: 'Supplier collects the pieces' }));
    await user.click(form.getByRole('button', { name: 'Send for Super Admin approval' }));
    await waitFor(() =>
      expect(api.raise).toHaveBeenCalledWith(1, { units: 2, reason: 'No power', pieceDetails: 'SN-1, SN-2', shippingMode: 'SUPPLIER_PICKUP' })
    );
    // Only this order's returns are read again
    await waitFor(() => expect(api.forOrder).toHaveBeenCalledTimes(2));
  });

  it('offers no raise to someone who only views orders, or when nothing is left', async () => {
    const user = userEvent.setup();
    signIn(['PROCUREMENT_ORDER_VIEW']);
    api.forOrder.mockResolvedValue(ok(returnsOf([supplierReturn({ status: 'ACCEPTED' })])));
    renderPanel();
    await open(user);
    expect(await screen.findByTestId('return-3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Raise return' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dispatch' })).not.toBeInTheDocument();
  });

  it('records a dispatch: TinQa ships needs the courier, tracking number and charge', async () => {
    const user = userEvent.setup();
    signIn(SUPPLIER_MANAGER);
    api.forOrder.mockResolvedValue(ok(returnsOf([supplierReturn({ status: 'ACCEPTED' })], { canRaise: false })));
    api.dispatch.mockResolvedValue(ok(supplierReturn({ status: 'IN_TRANSIT' })));
    renderPanel();
    await open(user);
    const item = within(await screen.findByTestId('return-3'));
    expect(item.getByText('Accepted: to dispatch')).toBeInTheDocument();
    await user.click(item.getByRole('button', { name: 'Dispatch' }));
    const form = within(item.getByRole('form', { name: 'Record the dispatch' }));
    await user.click(form.getByRole('button', { name: 'Dispatched' }));
    expect(form.getByText('Enter the courier.')).toBeInTheDocument();
    expect(form.getByText('Enter the tracking number.')).toBeInTheDocument();
    expect(form.getByText('Enter the shipping charge (0 or more).')).toBeInTheDocument();
    expect(api.dispatch).not.toHaveBeenCalled();

    await user.type(form.getByRole('textbox', { name: 'Courier' }), 'BlueDart');
    await user.type(form.getByRole('textbox', { name: 'Tracking number' }), 'BD123');
    await user.type(form.getByRole('spinbutton', { name: 'Shipping charge' }), '50');
    await user.click(form.getByRole('button', { name: 'Dispatched' }));
    await waitFor(() =>
      expect(api.dispatch).toHaveBeenCalledWith(3, expect.objectContaining({ courier: 'BlueDart', trackingNumber: 'BD123', shippingCharge: 50 }))
    );
  });

  it('records a pickup with only its date, sends a declined return again, and cancels with a reason', async () => {
    const user = userEvent.setup();
    signIn(SUPPLIER_MANAGER);
    api.forOrder.mockResolvedValue(ok(returnsOf([
      supplierReturn({ id: 4, status: 'ACCEPTED', shippingMode: 'SUPPLIER_PICKUP' }),
      supplierReturn({ id: 5, status: 'DECLINED', supplierResponseReason: 'These are not ours' }),
    ])));
    api.dispatch.mockResolvedValue(ok(supplierReturn({ id: 4, status: 'IN_TRANSIT' })));
    api.resend.mockResolvedValue(ok(supplierReturn({ id: 5, status: 'AWAITING_SUPPLIER' })));
    api.cancel.mockResolvedValue(ok(supplierReturn({ id: 5, status: 'CANCELLED' })));
    renderPanel();
    await open(user);

    const pickup = within(await screen.findByTestId('return-4'));
    await user.click(pickup.getByRole('button', { name: 'Dispatch' }));
    const form = within(pickup.getByRole('form', { name: 'Record the dispatch' }));
    expect(form.queryByRole('textbox', { name: 'Tracking number' })).not.toBeInTheDocument();
    await user.click(form.getByRole('button', { name: 'Collected' }));
    await waitFor(() => expect(api.dispatch).toHaveBeenCalledWith(4, expect.objectContaining({ courier: undefined })));
    expect(api.dispatch.mock.calls[0][1]).not.toHaveProperty('shippingCharge');

    const declined = within(await screen.findByTestId('return-5'));
    expect(declined.getByText('Supplier: These are not ours')).toBeInTheDocument();
    await user.click(declined.getByRole('button', { name: 'Send again' }));
    expect(declined.getByRole('button', { name: 'Send again' })).toBeDisabled();
    await user.type(declined.getByRole('textbox', { name: 'Note for the supplier' }), 'Serials match your invoice');
    await user.click(declined.getByRole('button', { name: 'Send again' }));
    await waitFor(() => expect(api.resend).toHaveBeenCalledWith(5, 'Serials match your invoice'));

    const again = within(await screen.findByTestId('return-5'));
    await user.click(again.getByRole('button', { name: 'Cancel return' }));
    await user.type(again.getByRole('textbox', { name: 'Reason to cancel' }), 'Settled offline');
    await user.click(again.getByRole('button', { name: 'Cancel return' }));
    await waitFor(() => expect(api.cancel).toHaveBeenCalledWith(5, 'Settled offline'));
  });
});

describe('Returns of failed pieces (supplier portal)', () => {
  it('accepts a return, declines one with a reason, and confirms pieces arrived', async () => {
    const user = userEvent.setup();
    signInAsSupplier();
    api.forOrder.mockResolvedValue(ok(returnsOf([
      supplierReturn({ id: 6, status: 'AWAITING_SUPPLIER', requestedByUsername: null }),
      supplierReturn({ id: 7, status: 'AWAITING_SUPPLIER', requestedByUsername: null }),
      supplierReturn({ id: 8, status: 'IN_TRANSIT', courier: 'BlueDart', trackingNumber: 'BD123', shippingCharge: 50, requestedByUsername: null,
        events: [{ id: 1, type: 'DISPATCHED', at: '2026-10-22T10:00:00Z', actorRole: 'Supplier Manager', actorName: null, note: null }] }),
    ])));
    api.respond.mockResolvedValue(ok(supplierReturn({ id: 6, status: 'ACCEPTED' })));
    api.received.mockResolvedValue(ok(supplierReturn({ id: 8, status: 'RECEIVED_BY_SUPPLIER' })));
    // Opened from the start when a return waits for the supplier
    renderPanel('supplier', true);
    await waitFor(() => expect(api.forOrder).toHaveBeenCalledWith(1, 'supplier'));

    const first = within(await screen.findByTestId('return-6'));
    // Nothing a Supplier Manager does is offered to the supplier
    expect(first.queryByRole('button', { name: 'Cancel return' })).not.toBeInTheDocument();
    await user.click(first.getByRole('button', { name: 'Accept return' }));
    await waitFor(() => expect(api.respond).toHaveBeenCalledWith(6, true, undefined));

    const second = within(await screen.findByTestId('return-7'));
    await user.click(second.getByRole('button', { name: 'Decline' }));
    expect(second.getByRole('button', { name: 'Decline return' })).toBeDisabled();
    await user.type(second.getByRole('textbox', { name: 'Reason to decline' }), 'These are not ours');
    await user.click(second.getByRole('button', { name: 'Decline return' }));
    await waitFor(() => expect(api.respond).toHaveBeenCalledWith(7, false, 'These are not ours'));

    const third = within(await screen.findByTestId('return-8'));
    expect(third.getByTestId('return-shipping-8')).toHaveTextContent('BlueDart · tracking BD123');
    // Roles, never staff names
    expect(third.getByText(/Supplier Manager/)).toBeInTheDocument();
    await user.click(third.getByRole('button', { name: 'Pieces arrived' }));
    await user.click(third.getByRole('button', { name: 'Yes, they arrived' }));
    await waitFor(() => expect(api.received).toHaveBeenCalledWith(8, undefined));
  });
});

describe('return form rules', () => {
  it('keeps dates out of the future and asks a pickup for its date only', () => {
    const base = { dispatchedOn: '2026-10-22', courier: '', trackingNumber: '', shippingCharge: '', note: '' };
    expect(validateDispatch(base, 'SUPPLIER_PICKUP', '2026-10-22')).toEqual({});
    expect(validateDispatch({ ...base, dispatchedOn: '2026-10-23' }, 'SUPPLIER_PICKUP', '2026-10-22').dispatchedOn).toMatch(/future/);
    expect(validateDispatch({ ...base, courier: 'X', trackingNumber: 'T', shippingCharge: '0' }, 'TINQA_SHIPS', '2026-10-22')).toEqual({});
    expect(validateDispatch({ ...base, courier: 'X', trackingNumber: 'T', shippingCharge: '-1' }, 'TINQA_SHIPS', '2026-10-22').shippingCharge).toBeDefined();
    expect(validateRaise({ units: '0', reason: 'x', pieceDetails: '', shippingMode: 'TINQA_SHIPS' }, 3).units).toBeDefined();
    expect(validateRaise({ units: '1.5', reason: 'x', pieceDetails: '', shippingMode: 'TINQA_SHIPS' }, 3).units).toBeDefined();
  });
});
