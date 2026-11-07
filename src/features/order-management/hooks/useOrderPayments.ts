import { useCallback, useEffect, useState } from 'react';
import { supplierPaymentApi } from '../api/supplierPaymentApi';
import type { MarkPaidRequest, OrderPayments, RecordPaymentRequest, RefundDuePaymentRequest, RepaymentRequest, ResendPaymentRequest } from '../types/supplierPayment.types';
import { downloadBlob } from '../../finance/export/chartImage';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { useApiAction } from '../../../hooks/useApiAction';

/**
 * An order's payments to its supplier: loads them only while `enabled` (staff: PROCUREMENT_ORDER_VIEW; the supplier:
 * their own view, SUPPLIER_PORTAL_VIEW). Payments are requested, approved by the Super Admin, paid (reference), and
 * re-sent with proof after a "not received". Money back from the supplier (a reversal ask, a return, a refund due) is
 * paid by the supplier in their portal and checked by the Finance Manager. After each change only this order's
 * payments are read again. Errors (e.g. 409 SUPPLIER_PAYMENT_OUT_OF_ORDER) and results go to the global alert.
 */
export const useOrderPayments = (orderId: number | null, enabled: boolean, view: 'staff' | 'supplier' = 'staff', onChanged?: () => void) => {
  const { can } = useAccess();
  const notify = useNotify();
  const canView = view === 'supplier' ? can('SUPPLIER_PORTAL_VIEW') : can('PROCUREMENT_ORDER_VIEW');
  const active = enabled && orderId !== null && canView;
  const [loaded, setLoaded] = useState<{ orderId: number; data: OrderPayments | null } | null>(null);
  const [round, setRound] = useState(0);
  // After a change: this order's payments, and whatever the caller shows from them (e.g. the supplier's list badge)
  const reload = useCallback(() => {
    setRound((n) => n + 1);
    onChanged?.();
  }, [onChanged]);
  const { run, isSubmitting } = useApiAction(reload);

  useEffect(() => {
    if (!active || orderId === null) return;
    let current = true;
    (view === 'supplier' ? supplierPaymentApi.forSupplier(orderId) : supplierPaymentApi.forOrder(orderId))
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
      : run(() => supplierPaymentApi.record(orderId, payload), {
          success: 'Payment requested: the Super Admin approves it before you pay.',
          failure: "Couldn't request the payment.",
        });
  const update = (paymentId: number, payload: RecordPaymentRequest) =>
    run(() => supplierPaymentApi.update(paymentId, payload), { success: 'Entry corrected.', failure: "Couldn't correct the entry." });
  const withdraw = (paymentId: number) => run(() => supplierPaymentApi.withdraw(paymentId), { success: 'Entry withdrawn.', failure: "Couldn't withdraw the entry." });
  const reverse = (paymentId: number, reason: string) =>
    run(() => supplierPaymentApi.reverse(paymentId, reason), {
      success: 'Reversal asked: the supplier pays it back and a Finance Manager checks it arrived.',
      failure: "Couldn't reverse the entry.",
    });
  const checkRepayment = (paymentId: number, received: boolean, reason?: string) =>
    run(() => supplierPaymentApi.checkRepayment(paymentId, received, reason), {
      success: received ? 'Repayment confirmed: it now counts.' : 'Sent back to the supplier: they pay it again with a receipt.',
      failure: "Couldn't save the check.",
    });
  const submitRepayment = (paymentId: number, payload: RepaymentRequest) =>
    run(() => supplierPaymentApi.submitRepayment(paymentId, payload), {
      success: 'Thank you: a Finance Manager checks it arrived.',
      failure: "Couldn't send the repayment.",
    });
  const payRefundDue = (payload: RefundDuePaymentRequest) =>
    orderId === null
      ? Promise.resolve(false)
      : run(() => supplierPaymentApi.payRefundDue(orderId, payload), {
          success: 'Thank you: a Finance Manager checks the refund arrived.',
          failure: "Couldn't send the refund.",
        });
  const decide = (paymentId: number, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    run(() => supplierPaymentApi.decide(paymentId, decision, reason), {
      success: decision === 'APPROVED' ? 'Approved. A payment request now goes to the Finance Manager to pay.' : 'Rejected.',
      failure: "Couldn't decide the entry.",
    });
  const markPaid = (paymentId: number, payload: MarkPaidRequest) =>
    run(() => supplierPaymentApi.markPaid(paymentId, payload), {
      success: 'Payment recorded: the supplier confirms whether they received it.',
      failure: "Couldn't record the payment.",
    });
  const resend = (paymentId: number, payload: ResendPaymentRequest) =>
    run(() => supplierPaymentApi.resend(paymentId, payload), {
      success: 'Sent to the supplier again.',
      failure: "Couldn't send the payment again.",
    });
  const downloadProof = async (paymentId: number, documentId: number, fileName: string | null) => {
    try {
      downloadBlob(await supplierPaymentApi.downloadProof(paymentId, documentId, view), fileName || `payment-${paymentId}-proof`);
    } catch (err) {
      notify.error(err, "Couldn't download the proof.");
    }
  };
  const confirmReceipt = (paymentId: number, received: boolean, reason?: string) =>
    run(() => supplierPaymentApi.confirmReceipt(paymentId, received, reason), {
      success: received ? 'Thank you: the payment is confirmed.' : 'Thank you: the Finance Manager will check it and send it again.',
      failure: "Couldn't send your answer.",
    });
  const adjustClaim = (agreedAmount: number, reason: string) =>
    orderId === null
      ? Promise.resolve(false)
      : run(() => supplierPaymentApi.adjustClaim(orderId, agreedAmount, reason), { success: 'Refund claim updated.', failure: "Couldn't update the refund claim." });

  return {
    data,
    loading,
    isSubmitting,
    canRecord: view === 'staff' && can('SUPPLIER_PAYMENT_RECORD'),
    canApprove: view === 'staff' && can('SUPPLIER_PAYMENT_APPROVE'),
    /** The supplier answers payments waiting for them */
    canConfirmReceipt: view === 'supplier' && can('SUPPLIER_PAYMENT_CONFIRM'),
    /** The supplier pays back what is asked of them, and refunds due */
    canRepay: view === 'supplier' && can('SUPPLIER_REPAYMENT_SUBMIT'),
    record,
    update,
    withdraw,
    reverse,
    decide,
    markPaid,
    resend,
    downloadProof,
    confirmReceipt,
    adjustClaim,
    checkRepayment,
    submitRepayment,
    payRefundDue,
  };
};
