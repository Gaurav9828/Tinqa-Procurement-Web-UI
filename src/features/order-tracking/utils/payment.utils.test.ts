import { describe, it, expect } from 'vitest';
import { findSuccessfulAttempt, formatPaise, formatPaymentMethod, formatPaymentStatus, paymentStatusTone } from './payment.utils';
import type { OrderPaymentAttempt } from '../types/orderTracking.types';

describe('payment labels', () => {
  it.each([
    ['PENDING', 'Pending'],
    ['PAID', 'Paid'],
    ['FAILED', 'Failed'],
    ['REFUND_REQUESTED', 'Refund requested'],
    ['REFUNDED', 'Refunded'],
    ['CANCELLED', 'Cancelled'],
    ['paid', 'Paid'],
    ['PARTIALLY_PAID', 'Partially Paid'],
  ])('status %s → %s', (status, label) => {
    expect(formatPaymentStatus(status)).toBe(label);
  });

  it.each([
    ['RAZORPAY', 'Razorpay'],
    ['UPI', 'UPI'],
    ['CARD', 'Card'],
    ['NET_BANKING', 'Net Banking'],
  ])('method %s → %s', (method, label) => {
    expect(formatPaymentMethod(method)).toBe(label);
  });

  it('never shows a misleading value for a missing status or method', () => {
    for (const empty of [null, undefined, '', '  ']) {
      expect(formatPaymentStatus(empty)).toBe('Not recorded');
      expect(formatPaymentMethod(empty)).toBe('Not recorded');
      expect(paymentStatusTone(empty)).toBe('gray');
    }
  });

  it('colours statuses by outcome', () => {
    expect(paymentStatusTone('PAID')).toBe('green');
    expect(paymentStatusTone('PENDING')).toBe('amber');
    expect(paymentStatusTone('FAILED')).toBe('rose');
    expect(paymentStatusTone('REFUNDED')).toBe('purple');
    expect(paymentStatusTone('CANCELLED')).toBe('gray');
  });
});

describe('formatPaise', () => {
  it('converts paise to rupees', () => {
    expect(formatPaise(229700, 'INR')).toBe('₹2,297.00');
    expect(formatPaise(150, 'INR')).toBe('₹1.50');
    expect(formatPaise(0, 'INR')).toBe('₹0.00');
  });

  it('defaults to INR and shows a dash for a missing amount', () => {
    expect(formatPaise(100, null)).toBe('₹1.00');
    expect(formatPaise(null, 'INR')).toBe('—');
    expect(formatPaise(undefined, 'INR')).toBe('—');
  });

  it('falls back to "<amount> <code>" for an unrecognised currency code', () => {
    expect(formatPaise(100, 'XX1')).toBe('1.00 XX1');
  });
});

describe('findSuccessfulAttempt', () => {
  const a = (status: string, transactionId: string | null): OrderPaymentAttempt => ({
    provider: 'RAZORPAY', status, transactionId, paymentInstrument: null, amountPaise: 100, currency: 'INR', createdAt: null, paidAt: null,
  });

  it('returns the latest PAID attempt, or null when none succeeded', () => {
    expect(findSuccessfulAttempt([a('FAILED', 'pay_1'), a('PAID', 'pay_2')])?.transactionId).toBe('pay_2');
    expect(findSuccessfulAttempt([a('FAILED', 'pay_1'), a('ATTEMPTED', null)])).toBeNull();
    expect(findSuccessfulAttempt([])).toBeNull();
  });
});
