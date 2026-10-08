import { formatStatusLabel } from './orderTracking.utils';
import type { OrderPaymentAttempt } from '../types/orderTracking.types';

// Order-level values written by the Ecommerce BE (Order.paymentStatus / Order.paymentMethod).
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CREATED: 'Created',
  ATTEMPTED: 'Attempted',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUND_REQUESTED: 'Refund requested',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  RAZORPAY: 'Razorpay',
  UPI: 'UPI',
  CARD: 'Card',
};

/** Friendly label; unknown/legacy values still render ("PARTIALLY_PAID" → "Partially Paid"). */
export const formatPaymentStatus = (status: string | null | undefined): string => {
  if (!status?.trim()) return 'Not recorded';
  const value = status.trim().toUpperCase();
  return PAYMENT_STATUS_LABELS[value] ?? formatStatusLabel(value);
};

export const formatPaymentMethod = (method: string | null | undefined): string => {
  if (!method?.trim()) return 'Not recorded';
  const value = method.trim().toUpperCase();
  return PAYMENT_METHOD_LABELS[value] ?? formatStatusLabel(value);
};

export type PaymentTone = 'green' | 'amber' | 'rose' | 'purple' | 'gray';

export const paymentStatusTone = (status: string | null | undefined): PaymentTone => {
  switch ((status ?? '').trim().toUpperCase()) {
    case 'PAID':
      return 'green';
    case 'PENDING':
    case 'ATTEMPTED':
      return 'amber';
    case 'FAILED':
      return 'rose';
    case 'REFUND_REQUESTED':
    case 'REFUNDED':
      return 'purple';
    default:
      return 'gray';
  }
};

/** Paise → "₹2,297.00". Paise are never shown as rupees. */
export const formatPaise = (amountPaise: number | null | undefined, currency: string | null | undefined): string => {
  if (amountPaise === null || amountPaise === undefined || !Number.isFinite(Number(amountPaise))) return '—';
  const amount = Number(amountPaise) / 100;
  const code = currency?.trim().toUpperCase() || 'INR';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
  }
};

/** The attempt that settled the order: the latest PAID one. */
export const findSuccessfulAttempt = (attempts: OrderPaymentAttempt[]): OrderPaymentAttempt | null =>
  [...attempts].reverse().find((attempt) => attempt.status?.toUpperCase() === 'PAID') ?? null;
