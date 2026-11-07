import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { OrderTimeline } from './OrderTimeline';
import { supplierPaymentApi } from '../api/supplierPaymentApi';
import { signInAsSuperAdmin, signInAsSupplier } from '../../../test/access';
import { useAuthStore } from '../../../store/useAuthStore';
import type { TimelineEvent } from '../types/orderTimeline.types';

vi.mock('../api/supplierPaymentApi', () => ({ supplierPaymentApi: { timeline: vi.fn() } }));
const api = vi.mocked(supplierPaymentApi);

const event = (id: string, patch: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id, at: '2026-10-05T10:00:00Z', kind: 'STATUS', title: id, detail: null, actorRole: null, actorName: null, tone: 'DONE',
  branchId: null, branchTitle: null, ...patch,
});

const EVENTS: TimelineEvent[] = [
  event('status-1', { title: 'Quotation submitted by the supplier', actorRole: 'Supplier' }),
  event('status-2', { title: 'Supplier Manager approved the quotation', actorRole: 'Supplier Manager', actorName: 'Meera' }),
  event('status-3', { title: 'Super Admin approved the order', actorRole: 'Super Admin', actorName: 'Ravi' }),
  event('status-4', { title: 'Supplier accepted the order', actorRole: 'Supplier' }),
  event('payment-7-1', { kind: 'PAYMENT', title: 'Payment requested', branchId: 'payment-7', branchTitle: 'Advance payment ₹354.00 (Bank transfer)', actorRole: 'Finance & Accounts Manager', actorName: 'Asha', tone: 'DONE' }),
  event('payment-7-2', { kind: 'PAYMENT', title: 'Super Admin approved the payment', branchId: 'payment-7', actorRole: 'Super Admin', actorName: 'Ravi', tone: 'WAITING', detail: 'To pay' }),
];

const renderTimeline = (view: 'staff' | 'supplier' = 'staff') =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <OrderTimeline orderId={1} view={view} />
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.timeline.mockResolvedValue({ success: true, message: 'OK', data: { orderId: 1, orderNumber: 'ORD-1', events: EVENTS } } as never);
});

describe('Order flow history', () => {
  it('loads only once opened, and draws the main line with a branch per payment', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L2');
    renderTimeline();
    expect(api.timeline).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Flow history' }));
    await waitFor(() => expect(api.timeline).toHaveBeenCalledWith(1, 'staff'));

    const flow = within(await screen.findByRole('list', { name: 'Order flow' }));
    expect(flow.getByText('Supplier Manager approved the quotation')).toBeInTheDocument();
    expect(flow.getByText(/Meera, Supplier Manager/)).toBeInTheDocument();
    const branch = within(flow.getByTestId('timeline-branch-payment-7'));
    expect(branch.getByRole('button', { name: /Advance payment ₹354.00 \(Bank transfer\)/ })).toHaveTextContent('(waiting)');
    const steps = within(branch.getByRole('list', { name: 'Advance payment ₹354.00 (Bank transfer)' }));
    expect(steps.getAllByRole('listitem')).toHaveLength(2);
    expect(steps.getByText('To pay')).toBeInTheDocument();
    // A branch folds away
    await user.click(branch.getByRole('button', { name: /Advance payment/ }));
    expect(branch.queryByRole('list')).not.toBeInTheDocument();
  });

  it('asks the supplier portal for the supplier’s own view', async () => {
    const user = userEvent.setup();
    signInAsSupplier();
    renderTimeline('supplier');
    await user.click(screen.getByRole('button', { name: 'Flow history' }));
    await waitFor(() => expect(api.timeline).toHaveBeenCalledWith(1, 'supplier'));
  });

  it('makes no request without permission to see the order', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1');
    useAuthStore.setState((state) => ({ user: state.user && { ...state.user, permissions: [] } }));
    renderTimeline();
    await user.click(screen.getByRole('button', { name: 'Flow history' }));
    expect(api.timeline).not.toHaveBeenCalled();
  });

  it('draws a return of failed pieces as its own branch, and repayment steps on their payment branch', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L2');
    api.timeline.mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        orderId: 1,
        orderNumber: 'ORD-1',
        events: [
          ...EVENTS,
          event('status-5', { title: 'Stock entry approved: 8 passed, 2 failed' }),
          event('return-3-1', { kind: 'RETURN', title: 'Supplier Manager raised the return', branchId: 'return-3', branchTitle: 'Return of 2 PCS (failed testing)', actorRole: 'Supplier Manager', tone: 'DONE' }),
          event('return-3-2', { kind: 'RETURN', title: 'Supplier confirmed the pieces arrived', branchId: 'return-3', actorRole: 'Supplier', tone: 'DONE' }),
          event('payment-9-1', { kind: 'PAYMENT', title: 'Supplier asked to pay back', branchId: 'payment-9', branchTitle: 'Repayment for returned pieces ₹286.00', tone: 'WAITING' }),
          event('payment-9-2', { kind: 'PAYMENT', title: 'Finance Manager: not received', branchId: 'payment-9', detail: 'Not on the statement', tone: 'REJECTED' }),
        ],
      },
    } as never);
    renderTimeline();
    await user.click(screen.getByRole('button', { name: 'Flow history' }));

    const flow = within(await screen.findByRole('list', { name: 'Order flow' }));
    const ret = within(flow.getByTestId('timeline-branch-return-3'));
    const steps = within(ret.getByRole('list', { name: 'Return of 2 PCS (failed testing)' }));
    expect(steps.getAllByRole('listitem')).toHaveLength(2);
    expect(steps.getByText('Supplier confirmed the pieces arrived')).toBeInTheDocument();
    expect(ret.getByRole('button', { name: /Return of 2 PCS/ })).toHaveTextContent('(done)');
    const repayment = within(flow.getByTestId('timeline-branch-payment-9'));
    expect(repayment.getByText('Supplier asked to pay back')).toBeInTheDocument();
    expect(repayment.getByRole('button', { name: /Repayment for returned pieces/ })).toHaveTextContent('(rejected)');
  });
});
