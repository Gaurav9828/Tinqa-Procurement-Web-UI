import { useCallback, useEffect, useState } from 'react';
import { refundApi } from '../api/refundApi';
import type { Refund, RefundListParams } from '../types/refund.types';
import type { PageResponse } from '../../../types/common.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/** One page of GET /admin/refunds for the approvals queue; reloads whenever the filter or page changes. */
export const useRefundList = ({ status, page, size }: RefundListParams) => {
  const [data, setData] = useState<PageResponse<Refund> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const load = useCallback(async () => {
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await refundApi.listRefunds({ status, page, size });
      if (!isCurrent()) return;
      if (res.success && res.data) {
        setData(res.data);
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
        notify.error(res, 'Refunds could not be loaded.');
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setLoadFailed(true);
      notify.error(err, 'Refunds could not be loaded.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [status, page, size, beginRequest, notify]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, loadFailed, refresh: load };
};
