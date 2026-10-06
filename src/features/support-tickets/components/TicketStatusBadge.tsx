import React from 'react';
import { formatEnumLabel } from '../utils/supportTicket.utils';

const TONES: Record<string, string> = {
  OPEN: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  AWAITING_CUSTOMER: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  RESOLVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  CLOSED: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
};

export const TicketStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold rounded-full border whitespace-nowrap ${
      TONES[status] ?? TONES.CLOSED
    }`}
  >
    {formatEnumLabel(status)}
  </span>
);
