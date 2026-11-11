import React, { useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { CommonTextArea } from '../../../components/ui/FormInputs';
import { DecencyHint } from '../../../components/ui/DecencyHint';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { decencyError } from '../../../utils/decency';
import { RefundDialogShell } from '../../refunds/components/RefundDialogShell';
import { CLOSE_REASON_MAX_LENGTH } from '../types/supportTicket.types';
import { closeReasonError, type ActionResult } from '../hooks/useTicketActions';

interface Props {
  referenceNumber: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<ActionResult>;
}

const TITLE = 'Close ticket';

/** Closing is final and needs a reason (5–500 characters, courtesy-checked); it is kept with the ticket. */
export const CloseTicketDialog: React.FC<Props> = ({ referenceNumber, isSubmitting, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const problem = closeReasonError(reason);
    if (problem) {
      setError(problem);
      return;
    }
    const result = await onSubmit(reason.trim());
    if (result.ok) onClose();
    else if (result.fieldErrors.reason) setError(result.fieldErrors.reason);
    else onClose();
  };

  return (
    <RefundDialogShell title={TITLE} subtitle={`Ticket ${referenceNumber}`} disabled={isSubmitting} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate aria-label={TITLE} className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          Closed tickets are read-only: no further replies or status changes are possible. The reason is kept with the ticket.
        </p>
        <div>
          <CommonTextArea
            label="Reason for closing"
            required
            rows={3}
            maxLength={CLOSE_REASON_MAX_LENGTH}
            value={reason}
            error={error || decencyError(reason)}
            disabled={isSubmitting}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
          />
          <DecencyHint />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed ${SOLID_TONE.danger}`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Close ticket
          </button>
        </div>
      </form>
    </RefundDialogShell>
  );
};
