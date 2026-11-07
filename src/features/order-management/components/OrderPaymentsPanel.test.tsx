import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { OrderPaymentsPanel } from './OrderPaymentsPanel';
import { supplierPaymentApi } from '../api/supplierPaymentApi';
import { paymentEntry, paymentSettlement, paymentSummary, paymentsOf } from '../test/paymentFixtures';
import { signInAsSuperAdmin, signInAsSupplier } from '../../../test/access';
import { todayLocalIsoDate } from '../validator/orderValidator';

vi.mock('../api/supplierPaymentApi', () => ({
  supplierPaymentApi: {
    forOrder: vi.fn(), forSupplier: vi.fn(), record: vi.fn(), update: vi.fn(), withdraw: vi.fn(), reverse: vi.fn(), decide: vi.fn(),
    markPaid: vi.fn(), resend: vi.fn(), downloadProof: vi.fn(), confirmReceipt: vi.fn(), adjustClaim: vi.fn(),
  },
}));
const api = vi.mocked(supplierPaymentApi);
const ok = <T,>(data: T) => ({ success: true, message: 'OK', data }) as never;

const renderPanel = (enabled = true, view: 'staff' | 'supplier' = 'staff', onChanged?: () => void) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <OrderPaymentsPanel orderId={1} enabled={enabled} view={view} onChanged={onChanged} />
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.forOrder.mockResolvedValue(paymentsOf());
});

describe('Payments to the supplier', () => {
  it('loads nothing while hidden', () => {
    signInAsSuperAdmin('ADMIN_L1');
    renderPanel(false);
    expect(api.forOrder).not.toHaveBeenCalled();
  });

  it('shows each part of the plan and requests a payment at the plan’s amount, with no date or reference yet', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1');
    api.record.mockResolvedValue(ok(paymentEntry({ status: 'PENDING_APPROVAL' })));
    renderPanel();

    const panel = within(await screen.findByRole('region', { name: 'Payments to the supplier' }));
    expect(panel.getByTestId('payment-plan')).toHaveTextContent('30% advance · 30% midterm · 40% after testing · Bank to bank transfer');
    expect(within(panel.getByTestId('milestone-FINAL')).getByText('₹472.00')).toBeInTheDocument();
    expect(panel.getByTestId('payment-outstanding')).toHaveTextContent('₹1,180.00');

    await user.click(panel.getByRole('button', { name: 'Request payment' }));
    const form = within(panel.getByRole('form', { name: 'Request a payment' }));
    // The next part due, its amount from the plan, and the supplier's expected method are filled in
    const part = form.getByRole('combobox', { name: 'Part of the plan' });
    expect(part).toHaveValue('ADVANCE');
    expect(form.getByRole('combobox', { name: 'Method' })).toHaveValue('BANK_TRANSFER');
    const amount = form.getByRole('textbox', { name: 'Amount' });
    expect(amount).toHaveValue('₹354.00');
    expect(amount).toHaveAttribute('readonly');
    // Only the parts due now can be paid
    expect(within(part).getAllByRole('option').map((o) => o.textContent)).toEqual(['Choose', 'Advance', 'Midterm']);
    // The amount can't be typed
    await user.type(amount, '800');
    expect(amount).toHaveValue('₹354.00');
    // Nothing is paid before the Super Admin approves: no date and no UTR to give yet
    expect(form.queryByRole('textbox', { name: 'UTR number' })).not.toBeInTheDocument();
    expect(form.queryByLabelText('Paid on')).not.toBeInTheDocument();

    await user.selectOptions(part, 'MIDTERM');
    expect(amount).toHaveValue('₹354.00');
    await user.click(form.getByRole('button', { name: 'Send for Super Admin approval' }));

    await waitFor(() =>
      expect(api.record).toHaveBeenCalledWith(1, { kind: 'PAYMENT', milestone: 'MIDTERM', amount: 354, method: 'BANK_TRANSFER', note: undefined })
    );
    // Only this order's payments are read again
    await waitFor(() => expect(api.forOrder).toHaveBeenCalledTimes(2));
  });

  it('offers only the parts with something left, and says the Super Admin approves before anything is paid', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1');
    api.forOrder.mockResolvedValue(
      paymentsOf(
        paymentSummary({
          paid: 354,
          payableNow: 354,
          expectedPaymentMethod: 'CASH',
          milestones: [
            { milestone: 'ADVANCE', percent: 30, planned: 354, paid: 354, pending: 0, due: true, left: 0 },
            { milestone: 'MIDTERM', percent: 30, planned: 354, paid: 0, pending: 0, due: true, left: 354 },
            { milestone: 'FINAL', percent: 40, planned: 472, paid: 0, pending: 0, due: false, left: 0 },
          ],
        })
      )
    );
    renderPanel();
    const panel = within(await screen.findByRole('region', { name: 'Payments to the supplier' }));
    // The advance is paid in full, so it is no longer marked due; the midterm still is
    expect(within(panel.getByTestId('milestone-ADVANCE')).queryByText('due')).not.toBeInTheDocument();
    expect(within(panel.getByTestId('milestone-MIDTERM')).getByText('due')).toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: 'Request payment' }));
    const form = within(panel.getByRole('form', { name: 'Request a payment' }));
    const part = form.getByRole('combobox', { name: 'Part of the plan' });
    expect(part).toHaveValue('MIDTERM');
    expect(within(part).getAllByRole('option').map((o) => o.textContent)).toEqual(['Choose', 'Midterm']);
    expect(form.getByRole('combobox', { name: 'Method' })).toHaveValue('CASH');
    expect(form.getByRole('option', { name: 'Cash (supplier’s choice)' })).toBeInTheDocument();
    expect(form.getByRole('note')).toHaveTextContent('Nothing is paid yet: the Super Admin approves this request first');
    expect(form.getByRole('note')).toHaveTextContent('the supplier confirms they received it');
    // Each method names what is entered once it is paid
    await user.selectOptions(form.getByRole('combobox', { name: 'Method' }), 'ONLINE');
    expect(form.getByRole('note')).toHaveTextContent('enter the transaction id');
  });

  it('asks for the reference each method has when an approved request is paid, and none for cash', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1');
    api.forOrder.mockResolvedValue(
      paymentsOf(paymentSummary({ pendingPayments: 708 }), [
        paymentEntry({ id: 71, status: 'TO_PAY', reference: null, paidOn: null, recordedBy: 50 }),
        paymentEntry({ id: 72, milestone: 'MIDTERM', method: 'CASH', status: 'TO_PAY', reference: null, paidOn: null, recordedBy: 50 }),
      ])
    );
    api.markPaid.mockResolvedValue(ok(paymentEntry({ id: 71, status: 'AWAITING_SUPPLIER' })));
    renderPanel();

    const transfer = within(await screen.findByTestId('payment-entry-71'));
    expect(transfer.getByText('Approved: to pay')).toBeInTheDocument();
    // Not the requester's, so nothing to withdraw; anyone who records payments can pay it
    expect(transfer.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument();
    await user.click(transfer.getByRole('button', { name: 'Record payment made' }));
    const form = within(transfer.getByRole('form', { name: 'Record the payment made' }));
    const send = form.getByRole('button', { name: 'Paid: send to the supplier' });
    expect(form.getByRole('textbox', { name: 'UTR number' })).toBeRequired();
    expect(send).toBeDisabled();
    await user.type(form.getByRole('textbox', { name: 'UTR number' }), 'UTR123');
    await user.click(send);
    await waitFor(() => expect(api.markPaid).toHaveBeenCalledWith(71, { paidOn: todayLocalIsoDate(), reference: 'UTR123', note: undefined }));

    // Cash: nothing to give, so it can be sent at once
    const cash = within(screen.getByTestId('payment-entry-72'));
    await user.click(cash.getByRole('button', { name: 'Record payment made' }));
    const cashForm = within(cash.getByRole('form', { name: 'Record the payment made' }));
    expect(cashForm.getByRole('textbox', { name: 'Receipt number (optional)' })).not.toBeRequired();
    expect(cashForm.getByRole('button', { name: 'Paid: send to the supplier' })).toBeEnabled();
  });

  it('hides Request payment once every due part is paid or waiting', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    api.forOrder.mockResolvedValue(
      paymentsOf(
        paymentSummary({
          pendingPayments: 708,
          payableNow: 0,
          milestones: [
            { milestone: 'ADVANCE', percent: 30, planned: 354, paid: 0, pending: 354, due: true, left: 0 },
            { milestone: 'MIDTERM', percent: 30, planned: 354, paid: 0, pending: 354, due: true, left: 0 },
            { milestone: 'FINAL', percent: 40, planned: 472, paid: 0, pending: 0, due: false, left: 0 },
          ],
        })
      )
    );
    renderPanel();
    const panel = within(await screen.findByRole('region', { name: 'Payments to the supplier' }));
    expect(panel.queryByRole('button', { name: 'Request payment' })).not.toBeInTheDocument();
  });

  it('keeps a payment sent to the supplier as it is, and sends one not received again with what was checked and a proof', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1');
    api.forOrder.mockResolvedValue(
      paymentsOf(paymentSummary({ pendingPayments: 708, awaitingSupplier: 354 }), [
        paymentEntry({ id: 51, method: 'BANK_TRANSFER', status: 'AWAITING_SUPPLIER', recordedBy: 1 }),
        paymentEntry({ id: 52, milestone: 'MIDTERM', status: 'NOT_RECEIVED', recordedBy: 1, supplierResponseReason: 'Not in our account' }),
      ])
    );
    api.resend.mockResolvedValue(ok(paymentEntry({ id: 52, status: 'AWAITING_SUPPLIER' })));
    renderPanel();

    const waiting = within(await screen.findByTestId('payment-entry-51'));
    expect(waiting.getByText('Waiting for the supplier')).toBeInTheDocument();
    // The money has gone: it can no longer be corrected or withdrawn
    expect(waiting.queryByRole('button', { name: 'Correct' })).not.toBeInTheDocument();
    expect(waiting.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument();
    expect(screen.getByText(/₹354.00 waiting for the supplier to confirm receipt/)).toBeInTheDocument();

    const notReceived = within(screen.getByTestId('payment-entry-52'));
    expect(notReceived.getByText('Supplier: not received')).toBeInTheDocument();
    expect(notReceived.getByText('Supplier: Not in our account')).toBeInTheDocument();
    // Its requester may still withdraw it if it was never paid
    expect(notReceived.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
    await user.click(notReceived.getByRole('button', { name: 'Check and send again' }));
    const form = within(notReceived.getByRole('form', { name: 'Send the payment again' }));
    // The earlier UTR and date are kept; what was checked must be said
    expect(form.getByRole('textbox', { name: 'UTR number' })).toHaveValue('UTR-1');
    const send = form.getByRole('button', { name: 'Send again to the supplier' });
    expect(send).toBeDisabled();
    await user.type(form.getByRole('textbox', { name: 'What you checked' }), 'Bank confirmed the credit');
    const proof = new File(['%PDF'], 'bank-advice.pdf', { type: 'application/pdf' });
    await user.upload(form.getByLabelText('Proof file'), proof);
    await user.click(send);
    await waitFor(() =>
      expect(api.resend).toHaveBeenCalledWith(52, { paidOn: '2026-10-05', reference: 'UTR-1', note: 'Bank confirmed the credit', proof })
    );
  });

  it('asks for no proof on the first payment', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1');
    api.forOrder.mockResolvedValue(paymentsOf(paymentSummary(), [paymentEntry({ id: 73, status: 'TO_PAY', reference: null, paidOn: null })]));
    renderPanel();
    const entry = within(await screen.findByTestId('payment-entry-73'));
    await user.click(entry.getByRole('button', { name: 'Record payment made' }));
    expect(entry.queryByLabelText('Proof file')).not.toBeInTheDocument();
  });

  it('shows each payment’s history, and downloads a re-send’s proof', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1');
    const event = { actorRole: null, actorName: null, reference: null, paidOn: null, note: null, proofDocumentId: null, proofFileName: null };
    api.forOrder.mockResolvedValue(
      paymentsOf(paymentSummary(), [
        paymentEntry({
          id: 81,
          status: 'AWAITING_SUPPLIER',
          sendCount: 2,
          paidByUsername: 'finance.l1',
          events: [
            { ...event, type: 'REQUESTED', at: '2026-10-05T10:00:00Z', actorRole: 'Finance & Accounts Manager', actorName: 'Asha' },
            { ...event, type: 'REQUEST_APPROVED', at: '2026-10-05T11:00:00Z', actorRole: 'Super Admin', actorName: 'Ravi' },
            { ...event, type: 'PAID', at: '2026-10-05T12:00:00Z', reference: 'UTR-1', paidOn: '2026-10-05' },
            { ...event, type: 'NOT_RECEIVED', at: '2026-10-06T09:00:00Z', actorRole: 'Supplier', note: 'Not in our account' },
            { ...event, type: 'RESENT', at: '2026-10-06T10:00:00Z', note: 'Bank confirmed', proofDocumentId: 9, proofFileName: 'bank-advice.pdf' },
          ],
        }),
      ])
    );
    renderPanel();
    const entry = within(await screen.findByTestId('payment-entry-81'));
    expect(entry.getByText(/sent 2 times/)).toBeInTheDocument();
    expect(entry.getByText(/paid by finance.l1/)).toBeInTheDocument();
    await user.click(entry.getByRole('button', { name: 'History (5)' }));
    const history = within(entry.getByRole('list', { name: 'Payment history' }));
    expect(history.getAllByRole('listitem').map((item) => item.children[1]?.textContent)).toEqual([
      'Payment requested', 'Request approved', 'Paid and sent to the supplier', 'Supplier: not received', 'Checked and sent again',
    ]);
    expect(history.getByText(/Ravi, Super Admin/)).toBeInTheDocument();
    await user.click(history.getByRole('button', { name: 'bank-advice.pdf' }));
    await waitFor(() => expect(api.downloadProof).toHaveBeenCalledWith(81, 9, 'staff'));
  });

  it('lets the supplier confirm they received a payment of any method, or say they did not', async () => {
    const user = userEvent.setup();
    signInAsSupplier();
    const onChanged = vi.fn();
    api.forSupplier.mockResolvedValue(
      paymentsOf(paymentSummary({ pendingPayments: 708, awaitingSupplier: 708 }), [
        paymentEntry({ id: 61, method: 'BANK_TRANSFER', status: 'AWAITING_SUPPLIER', recordedBy: null, recordedByUsername: null, decidedByUsername: null }),
        paymentEntry({ id: 62, milestone: 'MIDTERM', method: 'CASH', status: 'AWAITING_SUPPLIER', recordedBy: null, recordedByUsername: null, decidedByUsername: null }),
      ])
    );
    api.confirmReceipt.mockResolvedValue(ok(paymentEntry({ id: 61 })));
    renderPanel(true, 'supplier', onChanged);

    const first = within(await screen.findByTestId('payment-entry-61'));
    await user.click(first.getByRole('button', { name: 'I received it' }));
    await waitFor(() => expect(api.confirmReceipt).toHaveBeenCalledWith(61, true, undefined));
    // Its payments and the caller's list (the "payment to confirm" flag) are read again
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));

    const second = within(screen.getByTestId('payment-entry-62'));
    await user.click(second.getByRole('button', { name: 'Not received' }));
    expect(second.getByRole('button', { name: 'Send' })).toBeDisabled();
    await user.type(second.getByRole('textbox', { name: 'What went wrong with this payment' }), 'Nobody came');
    await user.click(second.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(api.confirmReceipt).toHaveBeenCalledWith(62, false, 'Nobody came'));
    // Nothing for the supplier to record or decide
    expect(screen.queryByRole('button', { name: 'Request payment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
  });

  it('tells the supplier a payment they did not receive is being checked', async () => {
    signInAsSupplier();
    api.forSupplier.mockResolvedValue(
      paymentsOf(paymentSummary(), [paymentEntry({ id: 63, status: 'NOT_RECEIVED', recordedBy: null, recordedByUsername: null, decidedByUsername: null })])
    );
    renderPanel(true, 'supplier');
    const entry = within(await screen.findByTestId('payment-entry-63'));
    expect(entry.getByText(/Finance Manager is checking it and will send it again/)).toBeInTheDocument();
    expect(entry.queryByRole('button', { name: 'I received it' })).not.toBeInTheDocument();
  });

  it('lets the Super Admin approve someone else’s payment request but not their own, and the requester correct or withdraw it', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L2');
    api.forOrder.mockResolvedValue(
      paymentsOf(paymentSummary({ pendingPayments: 554 }), [
        paymentEntry({ id: 31, status: 'PENDING_APPROVAL', recordedBy: 50, reference: null, paidOn: null }),
        paymentEntry({ id: 32, status: 'PENDING_APPROVAL', recordedBy: 1, amount: 200, reference: null, paidOn: null }),
      ])
    );
    api.decide.mockResolvedValue(ok(paymentEntry({ id: 31, status: 'TO_PAY' })));
    renderPanel();

    const theirs = within(await screen.findByTestId('payment-entry-31'));
    const own = within(screen.getByTestId('payment-entry-32'));
    expect(theirs.getByText('Waiting for Super Admin')).toBeInTheDocument();
    expect(theirs.getByText(/not paid yet/)).toBeInTheDocument();
    expect(own.getByText(/You requested it: someone else decides it/)).toBeInTheDocument();
    expect(own.queryByRole('button', { name: 'Approve payment' })).not.toBeInTheDocument();
    expect(own.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
    expect(theirs.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument();
    expect(screen.getByText(/Waiting \(requested, approved to pay, or with the supplier\): ₹554.00/)).toBeInTheDocument();

    await user.click(theirs.getByRole('button', { name: 'Approve payment' }));
    await waitFor(() => expect(api.decide).toHaveBeenCalledWith(31, 'APPROVED', undefined));
  });

  it('tells a Finance Manager who cannot approve that the Super Admin decides the request', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    api.forOrder.mockResolvedValue(paymentsOf(paymentSummary(), [paymentEntry({ id: 33, status: 'PENDING_APPROVAL', recordedBy: 50, reference: null, paidOn: null })]));
    renderPanel();
    const entry = within(await screen.findByTestId('payment-entry-33'));
    expect(entry.getByText('Waiting for the Super Admin to approve it.')).toBeInTheDocument();
    expect(entry.queryByRole('button', { name: 'Approve payment' })).not.toBeInTheDocument();
  });

  it('shows the refund the supplier owes after testing, lets Level 2 change it with a reason, and reverses a confirmed payment', async () => {
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
    expect(claim.getByText('Refund due from the supplier: ₹200.00')).toBeInTheDocument();
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

  it('offers no Reverse once the order is delivered, tested, fully paid and every payment received (reversal window closed)', async () => {
    signInAsSuperAdmin('ADMIN_L2');
    const settled = { orderStatus: 'DELIVERED' as const, tested: true, unitsPassed: 10, payable: 1180, paid: 1180, outstanding: 0, payableNow: 0 };
    const entries = [paymentEntry({ id: 61, amount: 354 }), paymentEntry({ id: 62, milestone: 'FINAL', amount: 472 })];
    api.forOrder.mockResolvedValue(paymentsOf(paymentSummary({ ...settled, reversalClosed: true }), entries));
    const { unmount } = renderPanel();

    expect(await screen.findByTestId('payment-reversal-closed')).toHaveTextContent('Nothing on this order can be reversed any more.');
    for (const id of [61, 62]) {
      expect(within(screen.getByTestId(`payment-entry-${id}`)).queryByRole('button', { name: 'Reverse' })).not.toBeInTheDocument();
    }
    unmount();

    // The same confirmed entries while the window is still open (e.g. a payment still waits for the supplier)
    api.forOrder.mockResolvedValue(paymentsOf(paymentSummary({ ...settled, reversalClosed: false }), entries));
    renderPanel();
    expect(await within(await screen.findByTestId('payment-entry-61')).findByRole('button', { name: 'Reverse' })).toBeInTheDocument();
    expect(screen.queryByTestId('payment-reversal-closed')).not.toBeInTheDocument();
  });

  it('tells the supplier their payments are final once the window closes', async () => {
    signInAsSupplier();
    api.forSupplier.mockResolvedValue(paymentsOf(
      paymentSummary({ orderStatus: 'DELIVERED', tested: true, payable: 1180, paid: 1180, outstanding: 0, payableNow: 0, reversalClosed: true }),
      [paymentEntry({ id: 63, amount: 1180 })]
    ));
    renderPanel(true, 'supplier');
    expect(await screen.findByTestId('payment-reversal-closed')).toHaveTextContent('Payments are final');
  });

  it('explains the final payment after testing: the failed units, their worth, the reduction and what is left to pay', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1');
    api.forOrder.mockResolvedValue(
      paymentsOf(
        paymentSummary({
          orderStatus: 'DELIVERED', orderValue: 1239, tested: true, unitsPassed: 8, unitsFailed: 2, payable: 1003, paid: 743.4,
          outstanding: 259.6, payableNow: 259.6, openMilestones: ['FINAL'],
          milestones: [
            { milestone: 'ADVANCE', percent: 30, planned: 371.7, paid: 371.7, pending: 0, due: true, left: 0 },
            { milestone: 'MIDTERM', percent: 30, planned: 371.7, paid: 371.7, pending: 0, due: true, left: 0 },
            { milestone: 'FINAL', percent: 40, planned: 259.6, paid: 0, pending: 0, due: true, left: 259.6 },
          ],
          settlement: paymentSettlement(),
        })
      )
    );
    renderPanel();

    const card = within(await screen.findByRole('region', { name: 'Final settlement after testing' }));
    expect(card.getByTestId('settlement-facts')).toHaveTextContent('10 PCS ordered · 8 passed · 2 failed testing');
    expect(card.getByTestId('settlement-order-value')).toHaveTextContent('₹1,239.00');
    expect(card.getByTestId('settlement-reduction')).toHaveTextContent('− ₹236.00');
    expect(card.getByTestId('settlement-payable')).toHaveTextContent('₹1,003.00');
    expect(card.getByTestId('settlement-final')).toHaveTextContent('₹259.60');
    expect(card.getByText(/2 PCS failed testing, worth ₹200.00 before GST, plus ₹36.00 GST on them/)).toBeInTheDocument();
    expect(card.queryByTestId('settlement-breakdown')).not.toBeInTheDocument();

    await user.click(card.getByRole('button', { name: 'Show full breakdown' }));
    const taken = within(card.getByRole('table', { name: 'Taken off after testing' }));
    expect(taken.getByRole('row', { name: /Failed testing 2 PCS × ₹100.00 − ₹200.00/ })).toBeInTheDocument();
    expect(taken.getByRole('row', { name: /GST \(18%\) on the value taken off − ₹36.00/ })).toBeInTheDocument();
    expect(taken.getByRole('row', { name: /Total reduction − ₹236.00/ })).toBeInTheDocument();
    const worth = within(card.getByRole('table', { name: 'Worth after testing' }));
    expect(worth.getByRole('row', { name: /Units passed 8 PCS × ₹100.00 ₹800.00/ })).toBeInTheDocument();
    const final = within(card.getByRole('table', { name: 'Final payment' }));
    expect(final.getByRole('row', { name: /Advance paid \(confirmed\) 30% part − ₹371.70/ })).toBeInTheDocument();
    expect(final.getByRole('row', { name: /Midterm paid \(confirmed\) 30% part − ₹371.70/ })).toBeInTheDocument();
    expect(final.getByTestId('settlement-final-payment')).toHaveTextContent('₹259.60');
  });

  it('shows the amount the supplier owes back in the settlement when more was paid than the order is now worth', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    api.forOrder.mockResolvedValue(
      paymentsOf(
        paymentSummary({
          orderStatus: 'DELIVERED', tested: true, unitsPassed: 7, unitsFailed: 2, payable: 750, paid: 1050, outstanding: 0, payableNow: 0,
          settlement: paymentSettlement({
            passedUnits: 7, shortUnits: 1, gstRate: null, quotedGst: 0, orderValue: 1050, shortValue: 100, gstReduction: 0, reduction: 300,
            passedGoods: 700, passedTaxable: 750, passedGst: 0, payable: 750,
          }),
        })
      )
    );
    renderPanel();

    const card = within(await screen.findByRole('region', { name: 'Final settlement after testing' }));
    expect(card.getByTestId('settlement-facts')).toHaveTextContent('7 passed');
    expect(card.getByTestId('settlement-facts')).toHaveTextContent('1 not delivered');
    expect(card.getByText('Supplier owes back')).toBeInTheDocument();
    expect(card.getByTestId('settlement-final')).toHaveTextContent('₹300.00');
  });

  it('shows no settlement before the units are tested', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    renderPanel();
    await screen.findByTestId('payment-plan');
    expect(screen.queryByRole('region', { name: 'Final settlement after testing' })).not.toBeInTheDocument();
  });

  it('offers nothing to record or decide to someone who only sees orders', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { useAuthStore } = await import('../../../store/useAuthStore');
    useAuthStore.setState((state) => ({ user: state.user && { ...state.user, permissions: ['PROCUREMENT_ORDER_VIEW'] } }));
    api.forOrder.mockResolvedValue(paymentsOf(paymentSummary(), [paymentEntry({ status: 'PENDING_APPROVAL', recordedBy: 50 })]));
    renderPanel();
    const panel = within(await screen.findByRole('region', { name: 'Payments to the supplier' }));
    expect(panel.queryByRole('button')).not.toBeInTheDocument();
  });
});
