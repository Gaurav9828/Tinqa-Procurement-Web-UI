import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { OrderPaymentsPanel } from './OrderPaymentsPanel';
import { supplierPaymentApi } from '../api/supplierPaymentApi';
import { paymentEntry, paymentSummary, paymentsOf } from '../test/paymentFixtures';
import { signInAsSupplier } from '../../../test/access';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Permission } from '../../../config/access';
import type { PaymentEvent, RefundClaim } from '../types/supplierPayment.types';

vi.mock('../api/supplierPaymentApi', () => ({
  supplierPaymentApi: {
    forOrder: vi.fn(), forSupplier: vi.fn(), record: vi.fn(), update: vi.fn(), withdraw: vi.fn(), reverse: vi.fn(), decide: vi.fn(),
    markPaid: vi.fn(), resend: vi.fn(), downloadProof: vi.fn(), confirmReceipt: vi.fn(), adjustClaim: vi.fn(),
    checkRepayment: vi.fn(), submitRepayment: vi.fn(), payRefundDue: vi.fn(),
  },
}));
const api = vi.mocked(supplierPaymentApi);
const ok = <T,>(data: T) => ({ success: true, message: 'OK', data }) as never;

const FINANCE_MANAGER: Permission[] = ['PROCUREMENT_ORDER_VIEW', 'SUPPLIER_PAYMENT_RECORD'];
const SUPER_ADMIN: Permission[] = ['PROCUREMENT_ORDER_VIEW', 'SUPPLIER_PAYMENT_RECORD', 'SUPPLIER_PAYMENT_APPROVE'];

const signIn = (permissions: Permission[], userId = 9) =>
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId, username: 'fm', email: 'fm@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderPanel = (view: 'staff' | 'supplier' = 'staff') =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <GlobalAlertContainer />
      <OrderPaymentsPanel orderId={1} enabled view={view} />
    </Provider>
  );

const event = (patch: Partial<PaymentEvent>): PaymentEvent => ({
  type: 'REPAYMENT_SENT', at: '2026-10-21T10:00:00Z', actorRole: 'Supplier', actorName: null, reference: null, paidOn: null, note: null,
  proofDocumentId: null, proofFileName: null, ...patch,
});

const OPEN_CLAIM: RefundClaim = {
  id: 1, cause: 'FAILED_TESTING', failedUnits: 2, claimedAmount: 200, agreedAmount: 200, adjustReason: null, adjustedAt: null,
  refunded: 0, refundDue: 200, status: 'OPEN', openedAt: '2026-10-20T10:00:00Z', settledAt: null,
};

/** A return's repayment the supplier paid back (pieces 236 + shipping 50), with their receipt. */
const sentBack = (id: number) =>
  paymentEntry({
    id, kind: 'REFUND', milestone: null, amount: 236, chargeAmount: 50, returnId: 3, status: 'REPAYMENT_SENT', method: 'BANK_TRANSFER',
    reference: 'UTR-77', paidOn: '2026-10-21', recordedBy: null, recordedByUsername: null, decidedByUsername: null,
    events: [
      event({ type: 'REPAYMENT_REQUESTED', actorRole: null }),
      event({ reference: 'UTR-77', paidOn: '2026-10-21', proofDocumentId: 5, proofFileName: 'bank.pdf' }),
    ],
  });

/** An axios-like 409 as the server sends it. */
const conflict = (errorCode: string, message: string) => ({
  isAxiosError: true,
  message: 'Request failed with status code 409',
  response: { status: 409, data: { success: false, message, errorCode } },
});

beforeEach(() => {
  vi.clearAllMocks();
  api.forOrder.mockResolvedValue(paymentsOf());
});

describe('Repayments from the supplier (staff)', () => {
  it('lets a Finance Manager check a repayment: received, or not received with a required reason', async () => {
    const user = userEvent.setup();
    signIn(FINANCE_MANAGER);
    api.forOrder.mockResolvedValue(paymentsOf(paymentSummary({ orderStatus: 'DELIVERED' }), [sentBack(71), sentBack(72)]));
    api.checkRepayment.mockResolvedValue(ok(paymentEntry({ id: 71 })));
    renderPanel();

    const first = within(await screen.findByTestId('payment-entry-71'));
    // What the supplier paid, how, with their receipt and the return's shipping charge
    expect(first.getByText(/Repayment for returned pieces · ₹286.00/)).toBeInTheDocument();
    expect(first.getByText(/Bank to bank transfer · paid on .* · Ref UTR-77/)).toBeInTheDocument();
    expect(first.getByText('Pieces ₹236.00 + return shipping ₹50.00 = ₹286.00')).toBeInTheDocument();
    expect(first.getByRole('button', { name: /Receipt: bank.pdf/ })).toBeInTheDocument();
    expect(first.getByText('Paid back: Finance Manager to check')).toBeInTheDocument();

    await user.click(first.getByRole('button', { name: 'Check repayment' }));
    await user.click(first.getByRole('button', { name: 'Received' }));
    await waitFor(() => expect(api.checkRepayment).toHaveBeenCalledWith(71, true, undefined));
    // Only this order's payments are read again
    await waitFor(() => expect(api.forOrder).toHaveBeenCalledTimes(2));

    const second = within(await screen.findByTestId('payment-entry-72'));
    await user.click(second.getByRole('button', { name: 'Check repayment' }));
    await user.click(second.getByRole('button', { name: 'Not received' }));
    const send = second.getByRole('button', { name: 'Send: not received' });
    expect(send).toBeDisabled();
    await user.type(second.getByRole('textbox', { name: 'Why it was not received' }), 'Nothing on the statement');
    await user.click(send);
    await waitFor(() => expect(api.checkRepayment).toHaveBeenCalledWith(72, false, 'Nothing on the statement'));
  });

  it('no longer lets staff record a refund: the supplier pays it in their portal', async () => {
    signIn(SUPER_ADMIN);
    api.forOrder.mockResolvedValue(
      paymentsOf(paymentSummary({ orderStatus: 'DELIVERED', tested: true, payableNow: 0, openMilestones: [], claim: OPEN_CLAIM }), [paymentEntry({ id: 41, amount: 1050 })])
    );
    renderPanel();
    const claim = within(await screen.findByTestId('refund-claim'));
    expect(claim.getByText(/The supplier pays this refund in their portal/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record refund' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request payment' })).not.toBeInTheDocument();
  });

  it('says a reversal asks the supplier to pay back, and lets the asker withdraw it while it is due', async () => {
    const user = userEvent.setup();
    signIn(FINANCE_MANAGER);
    api.forOrder.mockResolvedValue(
      paymentsOf(paymentSummary(), [
        paymentEntry({ id: 41 }),
        paymentEntry({ id: 42, kind: 'REVERSAL', status: 'REPAYMENT_DUE', recordedBy: 9, reversesId: 41, paidOn: null, reference: null }),
      ])
    );
    api.reverse.mockResolvedValue(ok(paymentEntry({ id: 43, kind: 'REVERSAL', status: 'REPAYMENT_DUE' })));
    api.withdraw.mockResolvedValue(ok(paymentEntry({ id: 42, status: 'WITHDRAWN' })));
    renderPanel();

    const confirmed = within(await screen.findByTestId('payment-entry-41'));
    await user.click(confirmed.getByRole('button', { name: 'Reverse' }));
    expect(confirmed.getByRole('note')).toHaveTextContent('This asks the supplier to pay the money back');
    expect(confirmed.getByRole('note')).toHaveTextContent('No Super Admin approval is needed');
    await user.type(confirmed.getByRole('textbox', { name: 'Reason to reverse' }), 'Paid twice');
    await user.click(confirmed.getByRole('button', { name: 'Reverse' }));
    await waitFor(() => expect(api.reverse).toHaveBeenCalledWith(41, 'Paid twice'));

    const ask = within(await screen.findByTestId('payment-entry-42'));
    expect(ask.getByText('Waiting for the supplier to pay back')).toBeInTheDocument();
    expect(ask.getByText(/not paid back yet/)).toBeInTheDocument();
    await user.click(ask.getByRole('button', { name: 'Withdraw' }));
    await waitFor(() => expect(api.withdraw).toHaveBeenCalledWith(42));
  });

  it('keeps Approve disabled while an earlier part waits, and shows the server’s out-of-order message on pay', async () => {
    const user = userEvent.setup();
    signIn(SUPER_ADMIN);
    api.forOrder.mockResolvedValue(
      paymentsOf(paymentSummary({ pendingPayments: 708 }), [
        paymentEntry({ id: 51, status: 'PENDING_APPROVAL', recordedBy: 50, paidOn: null, reference: null }),
        paymentEntry({ id: 52, milestone: 'MIDTERM', status: 'PENDING_APPROVAL', recordedBy: 50, paidOn: null, reference: null, waitsFor: 'ADVANCE' }),
        paymentEntry({ id: 53, milestone: 'FINAL', status: 'TO_PAY', recordedBy: 50, paidOn: null, reference: null }),
      ])
    );
    api.markPaid.mockRejectedValue(conflict('SUPPLIER_PAYMENT_OUT_OF_ORDER', 'Pay the midterm payment of order ORD-1 first.'));
    renderPanel();

    const advance = within(await screen.findByTestId('payment-entry-51'));
    expect(advance.getByRole('button', { name: 'Approve payment' })).toBeEnabled();
    const midterm = within(screen.getByTestId('payment-entry-52'));
    expect(midterm.getByRole('button', { name: 'Approve payment' })).toBeDisabled();
    expect(midterm.getByText('Approve the advance first.')).toBeInTheDocument();
    // Rejecting is always allowed
    expect(midterm.getByRole('button', { name: 'Reject' })).toBeEnabled();

    const final = within(screen.getByTestId('payment-entry-53'));
    await user.click(final.getByRole('button', { name: 'Record payment made' }));
    await user.type(final.getByRole('textbox', { name: 'UTR number' }), 'UTR-9');
    await user.click(final.getByRole('button', { name: 'Paid: send to the supplier' }));
    expect(await screen.findByText('Pay the midterm payment of order ORD-1 first.')).toBeInTheDocument();
  });
});

describe('Repayments from the supplier (supplier portal)', () => {
  const ask = (patch = {}) =>
    paymentEntry({
      id: 81, kind: 'REVERSAL', status: 'REPAYMENT_DUE', amount: 354, method: 'BANK_TRANSFER', paidOn: null, reference: null,
      recordedBy: null, recordedByUsername: null, decidedByUsername: null, note: 'Paid twice', ...patch,
    });

  it('pays back an ask: the reference is required unless cash, sent with the receipt', async () => {
    const user = userEvent.setup();
    signInAsSupplier();
    api.forSupplier.mockResolvedValue(paymentsOf(paymentSummary(), [ask()]));
    api.submitRepayment.mockResolvedValue(ok(ask({ status: 'REPAYMENT_SENT' })));
    renderPanel('supplier');

    const entry = within(await screen.findByTestId('payment-entry-81'));
    await user.click(entry.getByRole('button', { name: 'Pay back' }));
    const form = within(entry.getByRole('form', { name: 'Pay back' }));
    expect(form.getByText('To pay back: ₹354.00')).toBeInTheDocument();
    const send = form.getByRole('button', { name: 'Send repayment' });
    // A bank transfer needs its UTR number
    expect(form.getByRole('combobox', { name: 'Method' })).toHaveValue('BANK_TRANSFER');
    expect(send).toBeDisabled();
    // Cash needs none: the field becomes an optional receipt number
    await user.selectOptions(form.getByRole('combobox', { name: 'Method' }), 'CASH');
    expect(form.getByRole('textbox', { name: 'Receipt number (optional)' })).not.toBeRequired();
    expect(send).toBeEnabled();
    await user.selectOptions(form.getByRole('combobox', { name: 'Method' }), 'ONLINE');
    expect(send).toBeDisabled();
    await user.type(form.getByRole('textbox', { name: 'Transaction ID' }), 'TXN-5');

    // A receipt over 5 MB is refused before sending
    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    await user.upload(form.getByLabelText('Receipt file'), big);
    expect(form.getByText('The receipt is larger than 5 MB.')).toBeInTheDocument();
    expect(send).toBeDisabled();
    const receipt = new File(['%PDF'], 'bank.pdf', { type: 'application/pdf' });
    await user.upload(form.getByLabelText('Receipt file'), receipt);
    await user.click(send);

    await waitFor(() =>
      expect(api.submitRepayment).toHaveBeenCalledWith(81, expect.objectContaining({ method: 'ONLINE', reference: 'TXN-5', receipt, note: undefined }))
    );
    expect(api.submitRepayment.mock.calls[0][1].paidOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('shows the Finance Manager’s reason on a repayment not received, and asks for the receipt', async () => {
    const user = userEvent.setup();
    signInAsSupplier();
    api.forSupplier.mockResolvedValue(
      paymentsOf(paymentSummary(), [ask({ status: 'REPAYMENT_MISSING', reference: 'UTR-1', paidOn: '2026-10-21', decisionReason: 'Not on the statement' })])
    );
    renderPanel('supplier');
    const entry = within(await screen.findByTestId('payment-entry-81'));
    expect(entry.getByText('Finance Manager: Not on the statement')).toBeInTheDocument();
    await user.click(entry.getByRole('button', { name: 'Pay back' }));
    const form = within(entry.getByRole('form', { name: 'Pay back' }));
    expect(form.getByRole('alert')).toHaveTextContent('did not find this money: Not on the statement');
    expect(form.getByRole('alert')).toHaveTextContent('Attach the bank\'s receipt');
  });

  it('pays a refund due, at most what is still due', async () => {
    const user = userEvent.setup();
    signInAsSupplier();
    api.forSupplier.mockResolvedValue(
      paymentsOf(paymentSummary({ orderStatus: 'DELIVERED', tested: true, openMilestones: [], claim: OPEN_CLAIM, pendingRefunds: 50 }), [])
    );
    api.payRefundDue.mockResolvedValue(ok(paymentEntry({ id: 90, kind: 'REFUND', status: 'REPAYMENT_SENT' })));
    renderPanel('supplier');

    await user.click(await screen.findByRole('button', { name: 'Pay refund due' }));
    const form = within(screen.getByRole('form', { name: 'Pay refund due' }));
    const amount = form.getByRole('spinbutton', { name: 'Amount' });
    // 200 due, 50 already on its way
    expect(amount).toHaveValue(150);
    await user.type(form.getByRole('textbox', { name: 'UTR number' }), 'UTR-3');
    await user.clear(amount);
    await user.type(amount, '151');
    expect(form.getByRole('button', { name: 'Send repayment' })).toBeDisabled();
    await user.clear(amount);
    await user.type(amount, '100');
    await user.click(form.getByRole('button', { name: 'Send repayment' }));
    await waitFor(() => expect(api.payRefundDue).toHaveBeenCalledWith(1, expect.objectContaining({ amount: 100, method: 'BANK_TRANSFER', reference: 'UTR-3' })));
  });

  it('shows the server’s answer when the reversal window closed while the page was open', async () => {
    const user = userEvent.setup();
    signIn(FINANCE_MANAGER);
    api.forOrder.mockResolvedValue(paymentsOf(paymentSummary({ paid: 354 }), [paymentEntry({ id: 64, amount: 354 })]));
    api.reverse.mockRejectedValue(conflict('SUPPLIER_PAYMENT_REVERSAL_CLOSED',
      'Order ORD-1 is delivered, tested and fully paid, and the supplier confirmed every payment: its payments can no longer be reversed.'));
    renderPanel();

    const entry = within(await screen.findByTestId('payment-entry-64'));
    await user.click(entry.getByRole('button', { name: 'Reverse' }));
    await user.type(entry.getByRole('textbox', { name: 'Reason to reverse' }), 'Too late');
    await user.click(entry.getByRole('button', { name: 'Reverse' }));
    expect(await screen.findByText(/its payments can no longer be reversed/)).toBeInTheDocument();
  });
});
