import React, { useState } from 'react';
import { CheckCircle2, Loader2, Lock, PlayCircle, XCircle } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { ADMIN_SETTABLE_STATUSES, type AdminSettableStatus } from '../types/supportTicket.types';
import type { ActionResult } from '../hooks/useTicketActions';

interface Props {
  referenceNumber: string;
  currentStatus: string;
  /** From the API: false once the ticket is closed. */
  canClose: boolean;
  isUpdating: boolean;
  disabled?: boolean;
  onChange: (status: AdminSettableStatus) => Promise<ActionResult>;
}

const ACTIONS: Record<AdminSettableStatus, { label: string; icon: React.ElementType; hint: string }> = {
  IN_PROGRESS: { label: 'Mark in progress', icon: PlayCircle, hint: 'Support is working on it.' },
  RESOLVED: { label: 'Mark resolved', icon: CheckCircle2, hint: 'A solution was provided; the customer can still reply.' },
  CLOSED: { label: 'Close ticket', icon: XCircle, hint: 'Final. The ticket becomes read-only.' },
};

/**
 * Status buttons. Only IN_PROGRESS, RESOLVED and CLOSED are offered (the backend accepts nothing
 * else), never the current status (it would only add a duplicate system note), and closing asks
 * for confirmation because it cannot be undone.
 */
export const TicketStatusControls: React.FC<Props> = ({ referenceNumber, currentStatus, canClose, isUpdating, disabled = false, onChange }) => {
  const [confirmClose, setConfirmClose] = useState(false);

  if (!canClose) {
    return (
      <p role="status" aria-label="Status locked" className="flex items-center gap-2 text-xs text-gray-500">
        <Lock className="w-3.5 h-3.5" /> Closed tickets are read-only.
      </p>
    );
  }

  const options = ADMIN_SETTABLE_STATUSES.filter((status) => status !== currentStatus);

  return (
    <>
      <div role="group" aria-label="Change ticket status" className="space-y-2">
        {options.map((status) => {
          const { label, icon: Icon, hint } = ACTIONS[status];
          const isClose = status === 'CLOSED';
          return (
            <button
              key={status}
              type="button"
              disabled={isUpdating || disabled}
              onClick={() => (isClose ? setConfirmClose(true) : onChange(status))}
              className={`w-full flex items-start gap-2.5 p-3 rounded-xl border text-left transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${
                isClose
                  ? 'border-rose-500/30 hover:bg-rose-500/5 text-rose-600 dark:text-rose-400'
                  : 'border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-black dark:text-white'
              }`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <span className="block text-xs font-semibold">{label}</span>
                <span className="block text-[11px] text-gray-500 dark:text-neutral-400">{hint}</span>
              </span>
            </button>
          );
        })}
        {isUpdating && (
          <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Updating status…
          </p>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmClose}
        actionType="CONFIRM"
        title="Close this ticket?"
        description={`Ticket ${referenceNumber} will be closed. Closed tickets are read-only: no further replies or status changes are possible.`}
        isSubmitting={isUpdating}
        onClose={() => setConfirmClose(false)}
        onConfirm={async () => {
          await onChange('CLOSED');
          setConfirmClose(false);
        }}
      />
    </>
  );
};
