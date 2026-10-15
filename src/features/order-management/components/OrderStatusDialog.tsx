import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Loader2, Lock, X } from 'lucide-react';
import type { OrderStatus } from '../../../types/common.types';
import type { OrderResponse, UpdateOrderStatusRequest } from '../types/order.types';
import { NextStepPicker } from '../../../components/ui/NextStepPicker';
import { CommonInput, CommonTextArea } from '../../../components/ui/FormInputs';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderProgress } from './OrderProgress';
import { todayLocalIsoDate } from '../validator/orderValidator';
import {
  FINAL_ORDER_STATUSES,
  ORDER_STATUS_INFO,
  REASON_MAX_LENGTH,
  REASON_REQUIRED_STATUSES,
  getNextOrderStatuses,
  getOrderBlockReason,
  validateMove,
  type OrderAccess,
} from '../utils/orderWorkflow';

interface Props {
  order: OrderResponse | null;
  access: OrderAccess;
  isSubmitting: boolean;
  onClose: () => void;
  /** Resolves true when the server accepted the move. */
  onSubmit: (order: OrderResponse, payload: UpdateOrderStatusRequest) => Promise<boolean>;
}

/**
 * Status changes for a procurement order: shows where the order is and offers only the steps that
 * may follow, with whatever each step needs (delivery date, reason). There is no way to pick an
 * arbitrary status or go back.
 */
export const OrderStatusDialog: React.FC<Props> = ({ order, access, isSubmitting, onClose, onSubmit }) => {
  const [next, setNext] = useState<OrderStatus | ''>('');
  const [reason, setReason] = useState('');
  const [actualDelivery, setActualDelivery] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !isSubmitting && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, isSubmitting, onClose]);

  if (!order) return null;

  const options = getNextOrderStatuses(order.orderStatus, access);
  const blockReason = options.length ? null : getOrderBlockReason(order.orderStatus, access);
  const today = todayLocalIsoDate();
  const reasonRequired = !!next && REASON_REQUIRED_STATUSES.has(next);
  const requiredFilled =
    !!next && (!reasonRequired || !!reason.trim()) && (next !== 'DELIVERED' || !!actualDelivery);

  const choose = (value: string) => {
    const status = value as OrderStatus;
    setNext(status);
    setErrors({});
    if (status === 'DELIVERED' && !actualDelivery) setActualDelivery(order.actualDelivery || today);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!next) return setErrors({ next: 'Choose the next step.' });
    const found = validateMove(next, { reason, actualDelivery }, { orderDate: order.orderDate, today });
    setErrors(found);
    if (Object.keys(found).length) return;
    const ok = await onSubmit(order, {
      status: next,
      ...(next === 'DELIVERED' ? { actualDelivery } : {}),
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Update status of ${order.orderNumber}`}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow-2xl text-xs"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-black/10 dark:border-white/10">
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm font-bold text-black dark:text-white">Update status</h3>
            <p className="text-gray-500 flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-black dark:text-white">{order.orderNumber}</span>
              <span>·</span>
              <span className="truncate">{order.dealerName}</span>
              <OrderStatusBadge status={order.orderStatus} />
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <OrderProgress status={order.orderStatus} />

          {blockReason ? (
            <div role="status" aria-label="No status change available" className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] space-y-1.5">
              <p className="flex items-center gap-1.5 font-semibold text-black dark:text-white">
                <Lock className="w-3.5 h-3.5" /> No status change available
              </p>
              <p className="text-gray-600 dark:text-gray-300">{blockReason}</p>
              {order.orderStatus === 'PENDING' && access.canApprove && (
                <Link to="/approvals" className="inline-block font-semibold text-[#0071e3] hover:underline">
                  Open Approvals Hub
                </Link>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate aria-label="Next step">
              <NextStepPicker
                options={options.map((status) => ({
                  value: status,
                  label: ORDER_STATUS_INFO[status].action,
                  description: ORDER_STATUS_INFO[status].description,
                  tone: ORDER_STATUS_INFO[status].tone,
                }))}
                value={next}
                onChange={choose}
                disabled={isSubmitting}
                error={errors.next}
              />

              {next === 'DELIVERED' && (
                <CommonInput
                  label="Actual delivery date"
                  aria-label="Actual Delivery Date"
                  type="date"
                  required
                  value={actualDelivery}
                  min={order.orderDate}
                  max={today}
                  error={errors.actualDelivery}
                  onChange={(e) => setActualDelivery(e.target.value)}
                />
              )}

              {next && (
                <CommonTextArea
                  label={reasonRequired ? 'Reason' : 'Note (optional)'}
                  aria-label={reasonRequired ? 'Reason' : 'Note'}
                  required={reasonRequired}
                  rows={2}
                  maxLength={REASON_MAX_LENGTH}
                  value={reason}
                  error={errors.reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              )}

              {next && FINAL_ORDER_STATUSES.has(next) && (
                <p role="note" className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <Info className="w-3.5 h-3.5 mt-px shrink-0" /> This closes the order. Its status can't be changed afterwards.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 font-medium rounded-xl border border-black/10 dark:border-white/10 text-gray-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !requiredFilled}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 font-semibold rounded-xl text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${
                    next && ORDER_STATUS_INFO[next].tone === 'exception' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0071e3] hover:bg-[#0071e3]/90'
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {next ? ORDER_STATUS_INFO[next].action : 'Choose a step'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
