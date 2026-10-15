import { useCallback, useEffect, useState } from 'react';
import { refundApi } from '../api/refundApi';
import { useLatestRequest } from '../../../hooks/useLatestRequest';

/**
 * How many refunds await L2 approval (GET /admin/refunds?status=REQUESTED, one row is enough for the total),
 * so the Approvals hub can point to them. Silent on failure: the Refunds tab itself reports errors.
 */
export const usePendingRefundCount = () => {
  const [count, setCount] = useState<number | null>(null);
  const beginRequest = useLatestRequest();

  const refresh = useCallback(async () => {
    const isCurrent = beginRequest();
    try {
      const res = await refundApi.listRefunds({ status: 'REQUESTED', page: 0, size: 1 });
      if (isCurrent()) setCount(res.success && res.data ? res.data.totalElements : null);
    } catch {
      if (isCurrent()) setCount(null);
    }
  }, [beginRequest]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, refresh };
};
