import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supportTicketsApi } from '../api/supportTicketsApi';
import { TICKETS_PAGE_SIZE, TICKET_STATUSES, type TicketSummary } from '../types/supportTicket.types';
import type { PageResponse } from '../../../types/common.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

const readStatus = (params: URLSearchParams) => {
  const status = params.get('status') ?? '';
  return (TICKET_STATUSES as readonly string[]).includes(status) ? status : '';
};

const readPage = (params: URLSearchParams) => {
  const page = Number(params.get('page') ?? 0);
  return Number.isInteger(page) && page > 0 ? page : 0;
};

/**
 * Admin ticket list (GET /admin/support/queries). Status filter and page live in the URL
 * so they survive opening a ticket, Back and refreshes.
 */
export const useSupportTickets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = readStatus(searchParams);
  const page = readPage(searchParams);

  const [data, setData] = useState<PageResponse<TicketSummary> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ApiErrorKind | null>(null);

  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const fetchTickets = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);
    setErrorKind(null);
    try {
      const res = await supportTicketsApi.listTickets({ status, page, size: TICKETS_PAGE_SIZE });
      if (!isCurrent()) return;
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setErrorKind('unknown');
        notify.error(res.message || 'Failed to load support tickets.');
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setErrorKind(getApiErrorKind(err));
      notify.error(err, 'Failed to load support tickets.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [status, page, beginRequest, notify]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const write = useCallback(
    (mutate: (next: URLSearchParams) => void) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  /** Changing the filter returns to the first page. */
  const setStatus = useCallback(
    (value: string) =>
      write((next) => {
        if (value) next.set('status', value);
        else next.delete('status');
        next.delete('page');
      }),
    [write]
  );

  const setPage = useCallback(
    (value: number) =>
      write((next) => {
        if (value > 0) next.set('page', String(value));
        else next.delete('page');
      }),
    [write]
  );

  return {
    tickets: data?.content ?? [],
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
    page,
    setPage,
    status,
    setStatus,
    hasLoaded: !!data,
    isLoading,
    errorKind,
    refetch: fetchTickets,
  };
};
