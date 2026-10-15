import { useCallback, useEffect, useState } from 'react';
import { refundApi } from '../api/refundApi';
import type { OrderRefundSummary } from '../types/refund.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/**
 * Refund summary of one order (GET /admin/orders/{orderNumber}/refunds). `refresh()` reloads it in the
 * background after any refund or status change, keeping the last data on failure.
 */
export const useOrderRefunds = (orderNumber: string | null) => {
  const [summary, setSummary] = useState<OrderRefundSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const load = useCallback(
    async (background: boolean) => {
      if (!orderNumber) {
        setSummary(null);
        setLoadFailed(false);
        return;
      }
      const isCurrent = beginRequest();
      if (!background) {
        setIsLoading(true);
        setLoadFailed(false);
      }
      try {
        const res = await refundApi.getOrderRefunds(orderNumber);
        if (!isCurrent()) return;
        if (res.success && res.data) {
          setSummary(res.data);
          setLoadFailed(false);
        } else {
          if (!background) setLoadFailed(true);
          notify.error(res, 'Refund details could not be loaded.');
        }
      } catch (err: unknown) {
        if (!isCurrent()) return;
        if (!background) {
          setSummary(null);
          setLoadFailed(true);
        }
        notify.error(err, 'Refund details could not be loaded.');
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
    },
    [orderNumber, beginRequest, notify]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const retry = useCallback(() => load(false), [load]);
  const refresh = useCallback(() => load(true), [load]);

  return { summary, isLoading, loadFailed, retry, refresh };
};

export type OrderRefundsState = ReturnType<typeof useOrderRefunds>;
