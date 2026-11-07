import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axiosClient } from '../../../api/axiosClient';
import { supplierPaymentApi } from './supplierPaymentApi';
import { supplierReturnApi } from './supplierReturnApi';

vi.mock('../../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
const client = vi.mocked(axiosClient);
const answer = { data: { success: true, message: 'OK', data: null } };

beforeEach(() => {
  vi.clearAllMocks();
  client.get.mockResolvedValue(answer);
  client.post.mockResolvedValue(answer);
  client.patch.mockResolvedValue(answer);
});

const formOf = (call: unknown[]): FormData => call[1] as FormData;

describe('repayment and return endpoints', () => {
  it('sends the supplier’s pay-back as multipart, leaving out what was not given', async () => {
    const receipt = new File(['%PDF'], 'bank.pdf', { type: 'application/pdf' });
    await supplierPaymentApi.submitRepayment(81, { method: 'BANK_TRANSFER', reference: 'UTR-1', paidOn: '2026-10-21', receipt });
    expect(client.post).toHaveBeenCalledWith('/v1/supplier-portal/payments/81/repayment', expect.any(FormData));
    const form = formOf(client.post.mock.calls[0]);
    expect(form.get('method')).toBe('BANK_TRANSFER');
    expect(form.get('reference')).toBe('UTR-1');
    expect(form.get('paidOn')).toBe('2026-10-21');
    expect(form.get('receipt')).toBe(receipt);
    expect(form.has('note')).toBe(false);
    expect(form.has('amount')).toBe(false);

    // Cash: no reference and no receipt
    await supplierPaymentApi.submitRepayment(82, { method: 'CASH', paidOn: '2026-10-21', note: 'Handed over' });
    const cash = formOf(client.post.mock.calls[1]);
    expect(cash.has('reference')).toBe(false);
    expect(cash.has('receipt')).toBe(false);
    expect(cash.get('note')).toBe('Handed over');
  });

  it('sends a refund due with its amount, to the order', async () => {
    await supplierPaymentApi.payRefundDue(1, { amount: 100, method: 'ONLINE', reference: 'TXN-5', paidOn: '2026-10-21' });
    expect(client.post).toHaveBeenCalledWith('/v1/supplier-portal/orders/1/repayments', expect.any(FormData));
    expect(formOf(client.post.mock.calls[0]).get('amount')).toBe('100');
  });

  it('checks a repayment and lists those to check', async () => {
    await supplierPaymentApi.checkRepayment(71, false, 'Not on the statement');
    expect(client.patch).toHaveBeenCalledWith('/v1/orders/payments/71/repayment-check', { received: false, reason: 'Not on the statement' });
    await supplierPaymentApi.repaymentsToCheck();
    expect(client.get).toHaveBeenCalledWith('/v1/orders/payments/repayments-to-check');
  });

  it('reads an order’s returns from the staff or the supplier endpoint', async () => {
    await supplierReturnApi.forOrder(5, 'staff');
    await supplierReturnApi.forOrder(5, 'supplier');
    expect(client.get).toHaveBeenNthCalledWith(1, '/v1/orders/5/returns');
    expect(client.get).toHaveBeenNthCalledWith(2, '/v1/supplier-portal/orders/5/returns');
    await supplierReturnApi.respond(3, false, 'Not ours');
    expect(client.patch).toHaveBeenCalledWith('/v1/supplier-portal/returns/3/response', { accepted: false, reason: 'Not ours' });
    await supplierReturnApi.decide(3, 'APPROVED');
    expect(client.patch).toHaveBeenCalledWith('/v1/orders/returns/3/decision', { decision: 'APPROVED', reason: undefined });
  });
});
