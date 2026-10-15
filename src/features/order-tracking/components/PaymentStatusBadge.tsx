import React from 'react';
import { formatPaymentStatus, paymentStatusTone, type PaymentTone } from '../utils/payment.utils';

const TONES: Record<PaymentTone, string> = {
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
};

/** Order-level or attempt payment status; a missing value reads "Not recorded". */
export const PaymentStatusBadge: React.FC<{ status: string | null | undefined }> = ({ status }) =>
  status?.trim() ? (
    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold rounded-full border whitespace-nowrap ${TONES[paymentStatusTone(status)]}`}>
      {formatPaymentStatus(status)}
    </span>
  ) : (
    <span className="text-[11px] text-gray-400">Not recorded</span>
  );
