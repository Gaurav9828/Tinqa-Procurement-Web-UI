import { useCallback, useEffect, useState } from 'react';
import { supportTicketsApi } from '../api/supportTicketsApi';
import type { TicketDetail } from '../types/supportTicket.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

/**
 * One ticket (GET /admin/support/queries/{referenceNumber}).
 * `apply()` swaps in the detail returned by a successful action; `refresh()` reloads in the
 * background (e.g. after a TICKET_CLOSED conflict) without blanking the page.
 */
export const useSupportTicket = (referenceNumber: string) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorKind, setErrorKind] = useState<ApiErrorKind | null>(null);

  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const load = useCallback(
    async (background: boolean) => {
      const isCurrent = beginRequest();
      if (background) setIsRefreshing(true);
      else {
        setIsLoading(true);
        setErrorKind(null);
      }
      try {
        const res = await supportTicketsApi.getTicket(referenceNumber);
        if (!isCurrent()) return;
        if (res.success && res.data) {
          setTicket(res.data);
          setErrorKind(null);
        } else if (!background) {
          setErrorKind('unknown');
          notify.error(res.message || 'Failed to load the ticket.');
        }
      } catch (err: unknown) {
        if (!isCurrent()) return;
        const kind = getApiErrorKind(err);
        // In the background, keep showing the last data unless the ticket is gone or forbidden.
        if (!background || kind === 'notFound' || kind === 'forbidden') {
          setTicket(null);
          setErrorKind(kind);
        }
        notify.error(err, 'Failed to load the ticket.');
      } finally {
        if (isCurrent()) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [referenceNumber, beginRequest, notify]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const retry = useCallback(() => load(false), [load]);
  const refresh = useCallback(() => load(true), [load]);

  return { ticket, apply: setTicket, isLoading, isRefreshing, errorKind, retry, refresh };
};
