import { useCallback, useEffect, useMemo, useState } from 'react';
import { productApprovalApi } from '../api/productApprovalApi';
import type { ProductApprovalResponse } from '../types/productApproval.types';
import { getApiErrorMessage } from '../../../utils/apiError';

interface Loaded {
  key: string;
  version: number;
  approvals: ProductApprovalResponse[];
  error: string | null;
}

/**
 * Latest approval request per product (Procurement backend) for the listed products.
 * While loading or on failure, `loaded` is false and callers must not allow activation.
 */
export const useProductApprovals = (productIds: number[]) => {
  const key = useMemo(() => [...new Set(productIds)].sort((a, b) => a - b).join(','), [productIds]);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Loaded>({ key: '', version: -1, approvals: [], error: null });

  useEffect(() => {
    if (!key) return;
    let active = true;
    productApprovalApi
      .getLatestForProducts(key.split(',').map(Number))
      .then((res) => {
        if (!active) return;
        if (!res.success) throw new Error(res.message || 'Failed to load approval status.');
        setResult({ key, version, approvals: Array.isArray(res.data) ? res.data : [], error: null });
      })
      .catch((err: unknown) => {
        if (active) setResult({ key, version, approvals: [], error: getApiErrorMessage(err, 'Failed to load approval status.') });
      });
    return () => {
      active = false;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const isCurrent = !key || (result.key === key && result.version === version);
  const byProductId = useMemo(
    () => new Map((isCurrent ? result.approvals : []).map((a) => [a.ecommerceProductId, a])),
    [isCurrent, result.approvals]
  );

  return {
    byProductId,
    /** True once the current list's statuses are known (and didn't fail). */
    loaded: !key || (isCurrent && !result.error),
    isLoading: !!key && !isCurrent,
    error: isCurrent ? result.error : null,
    reload,
  };
};
