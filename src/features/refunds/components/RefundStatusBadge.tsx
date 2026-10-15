import React from 'react';
import type { RefundStatus } from '../types/refund.types';
import { REFUND_STATUS_LABELS } from '../utils/refund.utils';

const TONES: Record<RefundStatus, string> = {
  REQUESTED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  APPROVED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  PENDING: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  PROCESSED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  REJECTED: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
};

export const RefundStatusBadge: React.FC<{ status: RefundStatus }> = ({ status }) => (
  <span
    data-status={status}
    className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold rounded-full border whitespace-nowrap ${TONES[status] ?? TONES.REJECTED}`}
  >
    {REFUND_STATUS_LABELS[status] ?? status}
  </span>
);
