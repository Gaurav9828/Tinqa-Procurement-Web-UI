import { useCallback, useEffect, useState } from 'react';
import { refundApi } from '../api/refundApi';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useAccess } from '../../../hooks/useAccess';

/**
 * How many refunds await L2 approval (GET /admin/refunds?status=REQUESTED, one row is enough for the total),
 * so the Approvals hub can point to them. Silent on failure: the Refunds tab itself reports errors. Only refund
 * approvers ask (the hub is also open to other approvers, who never see refunds).
 */
export const usePendingRefundCount = () => {
  const [count, setCount] = useState<number | null>(null);
  const beginRequest = useLatestRequest();
  const { canAll } = useAccess();
  const allowed = canAll('REFUND_APPROVE', 'REFUND_VIEW');

  const refresh = useCallback(async () => {
    if (!allowed) return;
    const isCurrent = beginRequest();
    try {
      const res = await refundApi.listRefunds({ status: 'REQUESTED', page: 0, size: 1 });
      if (isCurrent()) setCount(res.success && res.data ? res.data.totalElements : null);
    } catch {
      if (isCurrent()) setCount(null);
    }
  }, [beginRequest, allowed]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, refresh };
};
