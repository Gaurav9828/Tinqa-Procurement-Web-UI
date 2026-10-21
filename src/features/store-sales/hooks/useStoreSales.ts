import { useCallback, useEffect, useState } from 'react';
import { storeSaleApi } from '../api/storeSaleApi';
import type { StoreSale } from '../types/storeSale.types';
import { STORE_SALES_PAGE_SIZE } from '../utils/storeSale.constants';
import { useAccess } from '../../../hooks/useAccess';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/** `mine`: the signed-in agent's own sales (STORE_ORDER_VIEW). `all`: every agent's (STORE_SALES_VIEW_ALL). */
export type StoreSalesScope = 'mine' | 'all';

interface Options {
  /** Starting payment status filter, e.g. PENDING for online sales still unpaid. */
  paymentStatus?: string;
  size?: number;
}

/** A page of store sales. Loads only when the user holds the scope's permission; filters are applied on submit. */
export const useStoreSales = (scope: StoreSalesScope, { paymentStatus: initialStatus = '', size = STORE_SALES_PAGE_SIZE }: Options = {}) => {
  const allowed = useAccess().can(scope === 'mine' ? 'STORE_ORDER_VIEW' : 'STORE_SALES_VIEW_ALL');
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const [sales, setSales] = useState<StoreSale[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState(initialStatus);
  // Exact seller login; changes only when the filter is submitted, so typing never calls the server
  const [soldBy, setSoldBy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(async () => {
    if (!allowed) return;
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const params = { page, size, paymentStatus: paymentStatus || undefined, soldBy: scope === 'all' ? soldBy || undefined : undefined };
      const res = scope === 'mine' ? await storeSaleApi.listMySales(params) : await storeSaleApi.listAllSales(params);
      if (!isCurrent()) return;
      if (res.success && res.data) {
        setSales(res.data.content ?? []);
        setTotalPages(res.data.totalPages ?? 0);
        setTotal(res.data.totalElements ?? 0);
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
        notify.error(res, 'Store sales could not be loaded.');
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setLoadFailed(true);
      notify.error(err, 'Store sales could not be loaded.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [allowed, beginRequest, notify, page, paymentStatus, scope, size, soldBy]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filterByStatus = useCallback((status: string) => {
    setPaymentStatus(status);
    setPage(0);
  }, []);

  const filterBySeller = useCallback((login: string) => {
    setSoldBy(login.trim());
    setPage(0);
  }, []);

  return { allowed, sales, page, totalPages, total, paymentStatus, soldBy, isLoading, loadFailed, setPage, filterByStatus, filterBySeller, refresh };
};
