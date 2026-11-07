import { useEffect, useState } from 'react';
import { supplierPaymentApi } from '../api/supplierPaymentApi';
import type { OrderTimeline } from '../types/orderTimeline.types';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';

/**
 * An order's flow history, loaded only while `enabled` (the section is open) and allowed: staff need
 * PROCUREMENT_ORDER_VIEW, the supplier SUPPLIER_PORTAL_VIEW. `round` reloads it after a change elsewhere.
 */
export const useOrderTimeline = (orderId: number | null, enabled: boolean, view: 'staff' | 'supplier' = 'staff', round = 0) => {
  const { can } = useAccess();
  const notify = useNotify();
  const active = enabled && orderId !== null && can(view === 'supplier' ? 'SUPPLIER_PORTAL_VIEW' : 'PROCUREMENT_ORDER_VIEW');
  const [loaded, setLoaded] = useState<{ key: string; data: OrderTimeline | null } | null>(null);
  const key = `${view}-${orderId}-${round}`;

  useEffect(() => {
    if (!active || orderId === null) return;
    let current = true;
    supplierPaymentApi
      .timeline(orderId, view)
      .then((res) => {
        if (current) setLoaded({ key, data: res.success ? res.data ?? null : null });
      })
      .catch((err: unknown) => {
        if (!current) return;
        setLoaded({ key, data: null });
        notify.error(err, "Couldn't load the order's flow history.");
      });
    return () => {
      current = false;
    };
  }, [active, orderId, view, key, notify]);

  return {
    timeline: active && loaded?.key === key ? loaded.data : null,
    loading: active && loaded?.key !== key,
  };
};
