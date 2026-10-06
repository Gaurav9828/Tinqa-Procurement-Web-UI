import { useCallback, useRef, useState } from 'react';
import { supportTicketsApi } from '../api/supportTicketsApi';
import { REPLY_MAX_LENGTH, type AdminSettableStatus, type TicketDetail } from '../types/supportTicket.types';
import type { ApiResponse } from '../../../types/common.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '../../../utils/apiError';

export interface ActionResult {
  ok: boolean;
  fieldErrors: Record<string, string>;
}

const FALLBACK_MESSAGES: Record<string, string> = {
  TICKET_NOT_FOUND: 'This ticket no longer exists.',
  TICKET_CLOSED: 'This ticket is closed and cannot receive replies.',
  TICKET_ALREADY_CLOSED: 'This ticket is already closed.',
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment and try again.',
};

/**
 * Reply and status actions for one ticket. On success the returned detail is applied directly
 * (server values only). Known error codes get a friendly treatment:
 *  - TICKET_CLOSED / TICKET_ALREADY_CLOSED / TICKET_NOT_FOUND → message + reload (the page becomes read-only / not found)
 *  - TOO_MANY_REQUESTS → warning; the draft is kept so it can be resent later
 *  - VALIDATION_FAILED → field errors under the input + the server's message
 * 401/403 are handled by the shared API client / notify path.
 */
export const useTicketActions = (
  referenceNumber: string,
  { onUpdated, onStale }: { onUpdated: (detail: TicketDetail) => void; onStale: () => void }
) => {
  const [pending, setPending] = useState<'reply' | 'status' | null>(null);
  const inFlight = useRef(false);
  const notify = useNotify();

  const run = useCallback(
    async (kind: 'reply' | 'status', call: () => Promise<ApiResponse<TicketDetail>>, successFallback: string): Promise<ActionResult> => {
      if (inFlight.current) return { ok: false, fieldErrors: {} };
      inFlight.current = true;
      setPending(kind);
      try {
        const res = await call();
        if (!res.success || !res.data) {
          notify.error(res.message || 'The request could not be completed.');
          return { ok: false, fieldErrors: {} };
        }
        onUpdated(res.data);
        notify.success(res.message || successFallback);
        return { ok: true, fieldErrors: {} };
      } catch (err: unknown) {
        const code = getApiErrorCode(err);
        if (code === 'TICKET_CLOSED' || code === 'TICKET_ALREADY_CLOSED' || code === 'TICKET_NOT_FOUND') {
          notify.warning(getApiErrorMessage(err, FALLBACK_MESSAGES[code]));
          onStale();
        } else if (code === 'TOO_MANY_REQUESTS') {
          notify.warning(getApiErrorMessage(err, FALLBACK_MESSAGES[code]));
        } else {
          notify.error(err, 'The request could not be completed.');
        }
        return { ok: false, fieldErrors: getApiFieldErrors(err) };
      } finally {
        inFlight.current = false;
        setPending(null);
      }
    },
    [notify, onUpdated, onStale]
  );

  const reply = useCallback(
    async (text: string): Promise<ActionResult> => {
      const message = text.trim();
      if (!message) return { ok: false, fieldErrors: { message: 'Write a reply before sending.' } };
      if (message.length > REPLY_MAX_LENGTH) {
        return { ok: false, fieldErrors: { message: `Replies can be at most ${REPLY_MAX_LENGTH} characters.` } };
      }
      return run('reply', () => supportTicketsApi.reply(referenceNumber, message), 'Reply sent.');
    },
    [referenceNumber, run]
  );

  const setStatus = useCallback(
    (status: AdminSettableStatus) => run('status', () => supportTicketsApi.updateStatus(referenceNumber, status), 'Ticket status updated.'),
    [referenceNumber, run]
  );

  return { reply, setStatus, pending, isBusy: pending !== null };
};
