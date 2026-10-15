import React from 'react';
import { formatStatusLabel } from '../utils/orderTracking.utils';

const TONES: Record<string, string> = {
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
};

const toneFor = (status: string): string => {
  if (['DELIVERED', 'RETURN_COMPLETED', 'REFUND_COMPLETED'].includes(status)) return TONES.green;
  if (['CANCELLED', 'DELIVERY_FAILED', 'CUSTOMER_UNAVAILABLE', 'INVALID_ADDRESS', 'CUSTOMER_CANCELLED_DELIVERY', 'REFUND_FAILED', 'RETURN_REJECTED', 'RETURN_INSPECTION_FAILED', 'RETURN_CANCELLED'].includes(status)) return TONES.rose;
  if (status.startsWith('RETURN_') || status === 'OUT_FOR_PICKUP') return TONES.purple;
  if (status.endsWith('_PENDING') || status.endsWith('_RECEIVED') || status === 'REFUND_INITIATED' || status === 'REFUND_REQUESTED') return TONES.amber;
  if (['CONFIRMED', 'PRE_ORDER_CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_REATTEMPT'].includes(status)) {
    return TONES.blue;
  }
  return TONES.gray;
};

export const TrackingStatusBadge: React.FC<{ status: string | null | undefined }> = ({ status }) => {
  const value = (status || 'UNKNOWN').toUpperCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold rounded-full border whitespace-nowrap ${toneFor(value)}`}>
      {formatStatusLabel(value)}
    </span>
  );
};
