import { useCallback, useEffect, useState } from 'react';
import { supplierReturnApi } from '../api/supplierReturnApi';
import type { DispatchReturnRequest, OrderReturns, RaiseReturnRequest } from '../types/supplierReturn.types';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { useApiAction } from '../../../hooks/useApiAction';

/**
 * An order's failed-piece returns, loaded only while `enabled` (the section is open) and allowed: staff need
 * PROCUREMENT_ORDER_VIEW, the supplier SUPPLIER_PORTAL_VIEW. A Supplier Manager (SUPPLIER_RETURN_REQUEST) raises,
 * dispatches, sends again and cancels; the supplier (SUPPLIER_RETURN_RESPOND) accepts or declines and confirms the
 * pieces arrived. After each change only this order's returns are read again (and `onChanged` tells the caller, e.g.
 * to refresh the payments and the flow history). Errors and results go to the global alert.
 */
export const useOrderReturns = (orderId: number | null, enabled: boolean, view: 'staff' | 'supplier' = 'staff', onChanged?: () => void) => {
  const { can } = useAccess();
  const notify = useNotify();
  const active = enabled && orderId !== null && can(view === 'supplier' ? 'SUPPLIER_PORTAL_VIEW' : 'PROCUREMENT_ORDER_VIEW');
  const [loaded, setLoaded] = useState<{ key: string; data: OrderReturns | null } | null>(null);
  const [round, setRound] = useState(0);
  const key = `${view}-${orderId}-${round}`;
  const reload = useCallback(() => {
    setRound((n) => n + 1);
    onChanged?.();
  }, [onChanged]);
  const { run, isSubmitting } = useApiAction(reload);

  useEffect(() => {
    if (!active || orderId === null) return;
    let current = true;
    supplierReturnApi
      .forOrder(orderId, view)
      .then((res) => {
        if (current) setLoaded({ key, data: res.success ? res.data ?? null : null });
      })
      .catch((err: unknown) => {
        if (!current) return;
        setLoaded({ key, data: null });
        notify.error(err, "Couldn't load the order's returns.");
      });
    return () => {
      current = false;
    };
  }, [active, orderId, view, key, notify]);

  const raise = (payload: RaiseReturnRequest) =>
    orderId === null
      ? Promise.resolve(false)
      : run(() => supplierReturnApi.raise(orderId, payload), {
          success: 'Return raised: the Super Admin approves it before it goes to the supplier.',
          failure: "Couldn't raise the return.",
        });
  const dispatch = (returnId: number, payload: DispatchReturnRequest) =>
    run(() => supplierReturnApi.dispatch(returnId, payload), {
      success: 'Dispatch recorded: the supplier confirms when the pieces arrive.',
      failure: "Couldn't record the dispatch.",
    });
  const resend = (returnId: number, note: string) =>
    run(() => supplierReturnApi.resend(returnId, note), { success: 'Sent to the supplier again.', failure: "Couldn't send the return again." });
  const cancel = (returnId: number, reason: string) =>
    run(() => supplierReturnApi.cancel(returnId, reason), { success: 'Return cancelled.', failure: "Couldn't cancel the return." });
  const respond = (returnId: number, accepted: boolean, reason?: string) =>
    run(() => supplierReturnApi.respond(returnId, accepted, reason), {
      success: accepted ? 'Thank you: the return is accepted. TinQa sends the pieces or you collect them.' : 'Thank you: TinQa will look at your reason.',
      failure: "Couldn't send your answer.",
    });
  const received = (returnId: number, note?: string) =>
    run(() => supplierReturnApi.received(returnId, note), {
      success: 'Thank you. Please pay back what TinQa paid for these pieces (Payments to the supplier).',
      failure: "Couldn't confirm the pieces arrived.",
    });

  return {
    data: active && loaded?.key === key ? loaded.data : null,
    loading: active && loaded?.key !== key,
    isSubmitting,
    canRequest: view === 'staff' && can('SUPPLIER_RETURN_REQUEST'),
    canRespond: view === 'supplier' && can('SUPPLIER_RETURN_RESPOND'),
    raise,
    dispatch,
    resend,
    cancel,
    respond,
    received,
  };
};
