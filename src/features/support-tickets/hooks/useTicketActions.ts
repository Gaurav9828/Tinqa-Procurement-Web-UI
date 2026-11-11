import { useCallback, useRef, useState } from 'react';
import { supportTicketsApi } from '../api/supportTicketsApi';
import {
  CLOSE_REASON_MAX_LENGTH,
  CLOSE_REASON_MIN_LENGTH,
  REPLY_MAX_LENGTH,
  type AdminSettableStatus,
  type TicketDetail,
} from '../types/supportTicket.types';
import type { ApiResponse } from '../../../types/common.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '../../../utils/apiError';
import { decencyError } from '../../../utils/decency';
import { withOffensiveFieldError } from '../../../utils/decencyField';

export interface ActionResult {
  ok: boolean;
  fieldErrors: Record<string, string>;
}

/** The close reason staff must give: 5–500 characters, polite. '' when it is fine. */
export const closeReasonError = (text: string): string => {
  const reason = text.trim();
  if (reason.length < CLOSE_REASON_MIN_LENGTH) return `Say why you are closing the ticket (at least ${CLOSE_REASON_MIN_LENGTH} characters).`;
  if (reason.length > CLOSE_REASON_MAX_LENGTH) return `Keep the reason within ${CLOSE_REASON_MAX_LENGTH} characters.`;
  return decencyError(reason);
};

const FALLBACK_MESSAGES: Record<string, string> = {
  TICKET_NOT_FOUND: 'This ticket no longer exists.',
  TICKET_CLOSED: 'This ticket is closed and cannot receive replies.',
  TICKET_ALREADY_CLOSED: 'This ticket is already closed.',
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment and try again.',
  TICKET_CLOSE_TOO_EARLY:
    "This ticket can't be closed yet: the customer has 24 hours to answer our latest reply. Showing its latest state.",
};

/**
 * Reply and status actions for one ticket. On success the returned detail is applied directly
 * (server values only). Known error codes get a friendly treatment:
 *  - TICKET_CLOSED / TICKET_ALREADY_CLOSED / TICKET_NOT_FOUND → message + reload (the page becomes read-only / not found)
 *  - TICKET_CLOSE_TOO_EARLY → warning + reload (the customer replied, or the 24 hours are not over yet)
 *  - OFFENSIVE_LANGUAGE → the courtesy message under the box (`field`)
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
    async (
      kind: 'reply' | 'status',
      call: () => Promise<ApiResponse<TicketDetail>>,
      successFallback: string,
      field: string
    ): Promise<ActionResult> => {
      if (inFlight.current) return { ok: false, fieldErrors: {} };
      inFlight.current = true;
      setPending(kind);
      try {
        const res = await call();
        if (!res.success || !res.data) {
          notify.error(res, 'The request could not be completed.');
          return { ok: false, fieldErrors: {} };
        }
        onUpdated(res.data);
        notify.success(res.message || successFallback);
        return { ok: true, fieldErrors: {} };
      } catch (err: unknown) {
        const code = getApiErrorCode(err);
        if (code === 'TICKET_CLOSED' || code === 'TICKET_ALREADY_CLOSED' || code === 'TICKET_NOT_FOUND' || code === 'TICKET_CLOSE_TOO_EARLY') {
          notify.warning(getApiErrorMessage(err, FALLBACK_MESSAGES[code]));
          onStale();
        } else if (code === 'TOO_MANY_REQUESTS') {
          notify.warning(getApiErrorMessage(err, FALLBACK_MESSAGES[code]));
        } else {
          notify.error(err, 'The request could not be completed.');
        }
        return { ok: false, fieldErrors: withOffensiveFieldError(getApiFieldErrors(err), code, field) };
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
      const rude = decencyError(message);
      if (rude) return { ok: false, fieldErrors: { message: rude } };
      return run('reply', () => supportTicketsApi.reply(referenceNumber, message), 'Reply sent.', 'message');
    },
    [referenceNumber, run]
  );

  /** IN_PROGRESS / RESOLVED as they are; CLOSED only with a reason (checked here first, then by the server). */
  const setStatus = useCallback(
    async (status: AdminSettableStatus, reasonText?: string): Promise<ActionResult> => {
      if (status !== 'CLOSED') {
        return run('status', () => supportTicketsApi.updateStatus(referenceNumber, status), 'Ticket status updated.', 'status');
      }
      const reason = (reasonText ?? '').trim();
      const problem = closeReasonError(reason);
      if (problem) return { ok: false, fieldErrors: { reason: problem } };
      return run('status', () => supportTicketsApi.updateStatus(referenceNumber, status, reason), 'Ticket closed.', 'reason');
    },
    [referenceNumber, run]
  );

  return { reply, setStatus, pending, isBusy: pending !== null };
};
