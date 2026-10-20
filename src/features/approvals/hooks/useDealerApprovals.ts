import { useCallback, useEffect, useState } from 'react';
import { dealerLoginApi } from '../../dealer-management/api/dealerLoginApi';
import type { DealerLogin } from '../../dealer-management/types/dealerLogin.types';
import { orderApi } from '../../order-management/api/orderApi';
import type { OrderChangeRequest } from '../../order-management/types/order.types';
import { useAccess } from '../../../hooks/useAccess';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/**
 * What dealers are waiting on: logins to approve (DEALER_LOGIN_APPROVE) and quotation changes to decide
 * (DEALER_QUOTATION_CHANGE_APPROVE). Each list loads only for those who may decide it. `quiet` skips error alerts,
 * for the hub's tab badge.
 */
export const useDealerApprovals = ({ quiet = false }: { quiet?: boolean } = {}) => {
  const { can } = useAccess();
  const canLogins = can('DEALER_LOGIN_APPROVE');
  const canChanges = can('DEALER_QUOTATION_CHANGE_APPROVE');
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const [logins, setLogins] = useState<DealerLogin[]>([]);
  const [changes, setChanges] = useState<OrderChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!canLogins && !canChanges) return;
    const isCurrent = beginRequest();
    setIsLoading(true);
    const report = (err: unknown, message: string) => {
      if (!quiet) notify.error(err, message);
    };
    const [loginRes, changeRes] = await Promise.all([
      canLogins ? dealerLoginApi.listLogins('APPROVAL_PENDING').catch((err: unknown) => (report(err, 'Dealer logins could not be loaded.'), null)) : null,
      canChanges ? orderApi.listChangeRequests('PENDING').catch((err: unknown) => (report(err, 'Quotation changes could not be loaded.'), null)) : null,
    ]);
    if (!isCurrent()) return;
    if (loginRes?.success) setLogins(loginRes.data ?? []);
    if (changeRes?.success) setChanges(changeRes.data ?? []);
    setIsLoading(false);
  }, [beginRequest, canChanges, canLogins, notify, quiet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logins, changes, isLoading, refresh, canLogins, canChanges, count: logins.length + changes.length };
};
