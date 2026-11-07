import { useCallback, useEffect, useState } from 'react';
import { dealerPaymentApi } from '../api/dealerPaymentApi';
import type { OrderPayments, RecordPaymentRequest } from '../types/dealerPayment.types';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { useApiAction } from '../../../hooks/useApiAction';

/**
 * An order's payments to its dealer: loads them only while `enabled` (staff: PROCUREMENT_ORDER_VIEW; the dealer:
 * their own view, DEALER_PORTAL_VIEW), and records, corrects, withdraws, reverses and decides entries. After each
 * change only this order's payments are read again. Errors and results go to the global alert.
 */
export const useOrderPayments = (orderId: number | null, enabled: boolean, view: 'staff' | 'dealer' = 'staff') => {
  const { can } = useAccess();
  const notify = useNotify();
  const canView = view === 'dealer' ? can('DEALER_PORTAL_VIEW') : can('PROCUREMENT_ORDER_VIEW');
  const active = enabled && orderId !== null && canView;
  const [loaded, setLoaded] = useState<{ orderId: number; data: OrderPayments | null } | null>(null);
  const [round, setRound] = useState(0);
  const reload = useCallback(() => setRound((n) => n + 1), []);
  const { run, isSubmitting } = useApiAction(reload);

  useEffect(() => {
    if (!active || orderId === null) return;
    let current = true;
    (view === 'dealer' ? dealerPaymentApi.forDealer(orderId) : dealerPaymentApi.forOrder(orderId))
      .then((res) => {
        if (current) setLoaded({ orderId, data: res.success ? res.data ?? null : null });
      })
      .catch((err: unknown) => {
        if (!current) return;
        setLoaded({ orderId, data: null });
        notify.error(err, "Couldn't load the order's payments.");
      });
    return () => {
      current = false;
    };
  }, [orderId, active, view, round, notify]);

  const data = active && loaded?.orderId === orderId ? loaded.data : null;
  const loading = active && loaded?.orderId !== orderId;

  const record = (payload: RecordPaymentRequest) =>
    orderId === null
      ? Promise.resolve(false)
      : run(() => dealerPaymentApi.record(orderId, payload), { success: 'Recorded; it counts once someone else confirms it.', failure: "Couldn't record the payment." });
  const update = (paymentId: number, payload: RecordPaymentRequest) =>
    run(() => dealerPaymentApi.update(paymentId, payload), { success: 'Entry corrected.', failure: "Couldn't correct the entry." });
  const withdraw = (paymentId: number) => run(() => dealerPaymentApi.withdraw(paymentId), { success: 'Entry withdrawn.', failure: "Couldn't withdraw the entry." });
  const reverse = (paymentId: number, reason: string) =>
    run(() => dealerPaymentApi.reverse(paymentId, reason), { success: 'Reversal recorded; it counts once confirmed.', failure: "Couldn't reverse the entry." });
  const decide = (paymentId: number, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    run(() => dealerPaymentApi.decide(paymentId, decision, reason), {
      success: decision === 'APPROVED' ? 'Payment entry confirmed.' : 'Payment entry rejected.',
      failure: "Couldn't decide the entry.",
    });
  const adjustClaim = (agreedAmount: number, reason: string) =>
    orderId === null
      ? Promise.resolve(false)
      : run(() => dealerPaymentApi.adjustClaim(orderId, agreedAmount, reason), { success: 'Refund claim updated.', failure: "Couldn't update the refund claim." });

  return {
    data,
    loading,
    isSubmitting,
    canRecord: view === 'staff' && can('DEALER_PAYMENT_RECORD'),
    canApprove: view === 'staff' && can('DEALER_PAYMENT_APPROVE'),
    record,
    update,
    withdraw,
    reverse,
    decide,
    adjustClaim,
  };
};
