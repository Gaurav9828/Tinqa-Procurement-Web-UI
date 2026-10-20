import React from 'react';
import { CheckCircle2, Clock, RotateCcw, Undo2, XCircle } from 'lucide-react';
import type { VoucherStatus } from '../types/finance.types';
import { VOUCHER_STATUS_LABELS } from '../utils/metrics';

const STYLES: Record<VoucherStatus, { className: string; Icon: typeof Clock }> = {
  SUBMITTED: { className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', Icon: Clock },
  APPROVED: { className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', Icon: CheckCircle2 },
  REJECTED: { className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400', Icon: XCircle },
  CANCELLED: { className: 'bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300', Icon: Undo2 },
  REVERSED: { className: 'bg-purple-500/10 text-purple-700 dark:text-purple-300', Icon: RotateCcw },
};

/** Status with an icon and label, never color alone. */
export const VoucherStatusBadge: React.FC<{ status: VoucherStatus }> = ({ status }) => {
  const { className, Icon } = STYLES[status] ?? STYLES.CANCELLED;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${className}`}>
      <Icon className="w-3 h-3" aria-hidden />
      {VOUCHER_STATUS_LABELS[status] ?? status}
    </span>
  );
};
