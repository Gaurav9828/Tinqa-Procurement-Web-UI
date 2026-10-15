import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { paiseToRupeesInput, refundErrorMessage, rupeesToPaise, validateRefundAmount, validateRefundText } from './refund.utils';

const axiosError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError('Request failed with status code ' + status, String(status), response.config, {}, response);
};

describe('₹ ↔ paise', () => {
  it('converts rupees to integer paise without float drift', () => {
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    expect(rupeesToPaise('0.3')).toBe(30);
    expect(rupeesToPaise('19.99')).toBe(1999);
    expect(rupeesToPaise('1.1')).toBe(110);
    expect(rupeesToPaise('2297')).toBe(229700);
    expect(rupeesToPaise('1,234.56')).toBe(123456);
    expect(rupeesToPaise(' 4.35 ')).toBe(435);
    expect(rupeesToPaise('.5')).toBe(50);
    expect(rupeesToPaise('10.')).toBe(1000);
  });

  it('rejects anything that is not rupees with at most 2 decimals', () => {
    for (const input of ['', '.', 'abc', '1.005', '-5', '1e3', '₹10', '1.2.3']) expect(rupeesToPaise(input), input).toBeNull();
    expect(rupeesToPaise(Number.NaN)).toBeNull();
    expect(rupeesToPaise(-1)).toBeNull();
  });

  it('shows paise as a 2-decimal rupee input', () => {
    expect(paiseToRupeesInput(1999)).toBe('19.99');
    expect(paiseToRupeesInput(30)).toBe('0.30');
    expect(paiseToRupeesInput(229700)).toBe('2297.00');
  });
});

describe('validation', () => {
  it('checks the amount against the refundable balance', () => {
    expect(validateRefundAmount('100.50', 229700, 'INR')).toEqual({ paise: 10050, error: null });
    expect(validateRefundAmount('2297', 229700, 'INR')).toEqual({ paise: 229700, error: null });
    expect(validateRefundAmount('', 229700, 'INR').error).toBe('Enter the amount to refund.');
    expect(validateRefundAmount('0', 229700, 'INR').error).toBe('The amount must be more than zero.');
    expect(validateRefundAmount('1.001', 229700, 'INR').error).toMatch(/at most 2 decimals/);
    expect(validateRefundAmount('2297.01', 229700, 'INR').error).toBe('The amount cannot be more than ₹2,297.00.');
  });

  it('requires 3–500 characters of plain text', () => {
    expect(validateRefundText('   ', 'Reason')).toBe('Reason is required.');
    expect(validateRefundText('ok', 'Reason')).toBe('Reason must be at least 3 characters.');
    expect(validateRefundText('x'.repeat(501), 'Reason')).toBe('Reason cannot exceed 500 characters.');
    expect(validateRefundText('<b>bad</b>', 'Comment')).toBe('Comment cannot contain < or >.');
    expect(validateRefundText('  Wrong size  ', 'Reason')).toBeNull();
  });
});

describe('refundErrorMessage', () => {
  it('prefers the action wording, then the server message, then the code fallback', () => {
    const unavailable = axiosError(502, { message: 'Gateway down', errorCode: 'RAZORPAY_UNAVAILABLE' });
    expect(refundErrorMessage(unavailable, 'Failed', { RAZORPAY_UNAVAILABLE: 'Retry it' })).toBe('Retry it');
    expect(refundErrorMessage(unavailable, 'Failed')).toBe('Gateway down');
    expect(refundErrorMessage(axiosError(409, { errorCode: 'REFUND_WINDOW_EXPIRED' }), 'Failed')).toBe(
      'The refund window for this payment has closed.'
    );
    // Never axios' generic "Request failed with status code …".
    expect(refundErrorMessage(axiosError(500, {}), 'The refund could not be approved.')).toBe('The refund could not be approved.');
  });
});
