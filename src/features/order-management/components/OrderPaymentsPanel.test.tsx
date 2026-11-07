import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { OrderPaymentsPanel } from './OrderPaymentsPanel';
import { dealerPaymentApi } from '../api/dealerPaymentApi';
import { paymentEntry, paymentSummary, paymentsOf } from '../test/paymentFixtures';
import { signInAsSuperAdmin } from '../../../test/access';
import { todayLocalIsoDate } from '../validator/orderValidator';

vi.mock('../api/dealerPaymentApi', () => ({
  dealerPaymentApi: { forOrder: vi.fn(), record: vi.fn(), update: vi.fn(), withdraw: vi.fn(), reverse: vi.fn(), decide: vi.fn(), adjustClaim: vi.fn() },
}));
const api = vi.mocked(dealerPaymentApi);
const ok = <T,>(data: T) => ({ success: true, message: 'OK', data }) as never;

const renderPanel = (enabled = true) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <OrderPaymentsPanel orderId={1} enabled={enabled} />
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.forOrder.mockResolvedValue(paymentsOf());
});

describe('Payments to the dealer', () => {
  it('loads nothing while hidden', () => {
    signInAsSuperAdmin('ADMIN_L1');
    renderPanel(false);
    expect(api.forOrder).not.toHaveBeenCalled();
  });

  it('shows each part of the plan and records a payment for someone else to confirm', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1');
    api.record.mockResolvedValue(ok(paymentEntry({ status: 'PENDING_APPROVAL' })));
    renderPanel();

    const panel = within(await screen.findByRole('region', { name: 'Payments to the dealer' }));
    expect(panel.getByTestId('payment-plan')).toHaveTextContent('30% advance · 30% midterm · 40% after testing · Bank to bank transfer');
    expect(within(panel.getByTestId('milestone-FINAL')).getByText('₹472.00')).toBeInTheDocument();
    expect(panel.getByTestId('payment-outstanding')).toHaveTextContent('₹1,180.00');

    await user.click(panel.getByRole('button', { name: 'Record payment' }));
    const form = within(panel.getByRole('form', { name: 'Record a payment' }));
    // Only the parts due now can be paid; the expected method is filled in
    expect(form.getAllByRole('option').map((o) => o.textContent)).toEqual(expect.arrayContaining(['Advance', 'Midterm']));
    expect(form.queryByRole('option', { name: /Final/ })).not.toBeInTheDocument();
    expect(form.getByRole('combobox', { name: 'Method' })).toHaveValue('BANK_TRANSFER');
    // More than the advance and midterm parts (708.00) can't be paid before testing
    await user.selectOptions(form.getByRole('combobox', { name: 'Part of the plan' }), 'ADVANCE');
    await user.type(form.getByRole('spinbutton', { name: 'Amount' }), '800');
    expect(form.getByRole('button', { name: 'Record for confirmation' })).toBeDisabled();
    await user.clear(form.getByRole('spinbutton', { name: 'Amount' }));
    await user.type(form.getByRole('spinbutton', { name: 'Amount' }), '400');
    await user.type(form.getByRole('textbox', { name: 'Reference' }), 'UTR123');
    await user.click(form.getByRole('button', { name: 'Record for confirmation' }));

    await waitFor(() =>
      expect(api.record).toHaveBeenCalledWith(1, {
        kind: 'PAYMENT', milestone: 'ADVANCE', amount: 400, method: 'BANK_TRANSFER', paidOn: todayLocalIsoDate(), reference: 'UTR123', note: undefined,
      })
    );
    // Only this order's payments are read again
    await waitFor(() => expect(api.forOrder).toHaveBeenCalledTimes(2));
  });

  it('lets a Level 2 confirm someone else’s entry but not their own, and the recorder correct or withdraw it', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L2');
    api.forOrder.mockResolvedValue(
      paymentsOf(paymentSummary({ pendingPayments: 554 }), [
        paymentEntry({ id: 31, status: 'PENDING_APPROVAL', recordedBy: 50 }),
        paymentEntry({ id: 32, status: 'PENDING_APPROVAL', recordedBy: 1, amount: 200 }),
      ])
    );
    api.decide.mockResolvedValue(ok(paymentEntry({ id: 31 })));
    renderPanel();

    const theirs = within(await screen.findByTestId('payment-entry-31'));
    const own = within(screen.getByTestId('payment-entry-32'));
    expect(own.getByText(/You recorded it: someone else confirms it/)).toBeInTheDocument();
    expect(own.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
    expect(own.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
    expect(theirs.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument();
    expect(screen.getByText(/Waiting for confirmation: ₹554.00 paid/)).toBeInTheDocument();

    await user.click(theirs.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api.decide).toHaveBeenCalledWith(31, 'APPROVED', undefined));
  });

  it('shows the refund the dealer owes after testing, lets Level 2 change it with a reason, and reverses a confirmed payment', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L2');
    api.forOrder.mockResolvedValue(
      paymentsOf(
        paymentSummary({
          orderStatus: 'DELIVERED', tested: true, unitsPassed: 8, unitsFailed: 2, payable: 850, paid: 1050, outstanding: 0, payableNow: 0,
          openMilestones: ['ADVANCE', 'MIDTERM', 'FINAL'],
          claim: { id: 1, cause: 'FAILED_TESTING', failedUnits: 2, claimedAmount: 200, agreedAmount: 200, adjustReason: null, adjustedAt: null,
            refunded: 0, refundDue: 200, status: 'OPEN', openedAt: '2026-10-20T10:00:00Z', settledAt: null },
        }),
        [paymentEntry({ id: 41, amount: 1050 })]
      )
    );
    api.adjustClaim.mockResolvedValue(ok(paymentSummary()));
    api.reverse.mockResolvedValue(ok(paymentEntry({ id: 42, kind: 'REVERSAL', status: 'PENDING_APPROVAL' })));
    renderPanel();

    const claim = within(await screen.findByTestId('refund-claim'));
    expect(claim.getByText('Refund due from the dealer: ₹200.00')).toBeInTheDocument();
    expect(screen.getByTestId('payment-tested')).toHaveTextContent('Tested: 8 passed, 2 failed');

    await user.click(claim.getByRole('button', { name: 'Change refund amount' }));
    const amount = claim.getByRole('spinbutton', { name: 'Amount to be refunded' });
    await user.clear(amount);
    await user.type(amount, '250');
    await user.type(claim.getByRole('textbox', { name: 'Reason for the new refund amount' }), 'Agreed');
    // More than was overpaid can't be asked for
    expect(claim.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.clear(amount);
    await user.type(amount, '150');
    await user.click(claim.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.adjustClaim).toHaveBeenCalledWith(1, 150, 'Agreed'));

    const entry = within(screen.getByTestId('payment-entry-41'));
    await user.click(entry.getByRole('button', { name: 'Reverse' }));
    await user.type(entry.getByRole('textbox', { name: 'Reason to reverse' }), 'Paid twice');
    await user.click(entry.getByRole('button', { name: 'Reverse' }));
    await waitFor(() => expect(api.reverse).toHaveBeenCalledWith(41, 'Paid twice'));
  });

  it('offers nothing to record or decide to someone who only sees orders', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { useAuthStore } = await import('../../../store/useAuthStore');
    useAuthStore.setState((state) => ({ user: state.user && { ...state.user, permissions: ['PROCUREMENT_ORDER_VIEW'] } }));
    api.forOrder.mockResolvedValue(paymentsOf(paymentSummary(), [paymentEntry({ status: 'PENDING_APPROVAL', recordedBy: 50 })]));
    renderPanel();
    const panel = within(await screen.findByRole('region', { name: 'Payments to the dealer' }));
    expect(panel.queryByRole('button')).not.toBeInTheDocument();
  });
});
