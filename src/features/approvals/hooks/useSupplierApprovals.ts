import { useCallback, useEffect, useState } from 'react';
import { supplierLoginApi } from '../../supplier-management/api/supplierLoginApi';
import type { SupplierLogin } from '../../supplier-management/types/supplierLogin.types';
import { orderApi } from '../../order-management/api/orderApi';
import type { OrderChangeRequest } from '../../order-management/types/order.types';
import { useAccess } from '../../../hooks/useAccess';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/**
 * What suppliers are waiting on: logins to approve (SUPPLIER_LOGIN_APPROVE) and quotation changes to decide
 * (SUPPLIER_QUOTATION_CHANGE_APPROVE). Each list loads only for those who may decide it. `quiet` skips error alerts,
 * for the hub's tab badge.
 */
export const useSupplierApprovals = ({ quiet = false }: { quiet?: boolean } = {}) => {
  const { can } = useAccess();
  const canLogins = can('SUPPLIER_LOGIN_APPROVE');
  const canChanges = can('SUPPLIER_QUOTATION_CHANGE_APPROVE');
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const [logins, setLogins] = useState<SupplierLogin[]>([]);
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
      canLogins ? supplierLoginApi.listLogins('APPROVAL_PENDING').catch((err: unknown) => (report(err, 'Supplier logins could not be loaded.'), null)) : null,
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
