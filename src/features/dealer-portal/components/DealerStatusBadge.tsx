import React from 'react';
import type { OrderStatus } from '../../../types/common.types';
import { dealerStage, dealerStatusLabel } from '../utils/dealerOrderStage';

const TONE: Record<string, string> = {
  quotation: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
  review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  ongoing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

const toneOf = (status: OrderStatus) => {
  if (status === 'QUOTATION') return TONE.quotation;
  if (status === 'PENDING') return TONE.review;
  if (status === 'CANCELLED' || status === 'REFUND_FAILED') return TONE.cancelled;
  return dealerStage(status) === 'past' ? TONE.done : TONE.ongoing;
};

/** An order's status in the dealer's words. */
export const DealerStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
  <span className={`inline-flex px-2.5 py-1 text-[10px] font-semibold rounded-full border whitespace-nowrap ${toneOf(status)}`}>
    {dealerStatusLabel(status)}
  </span>
);
