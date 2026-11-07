import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Pencil, Truck, Undo2, X, XCircle } from 'lucide-react';
import { dealerPortalApi } from '../api/dealerPortalApi';
import type { DealerChange, DealerOrder, OrderResponseRequest } from '../types/dealerPortal.types';
import { DealerStatusBadge } from './DealerStatusBadge';
import { ChangeDiff } from './ChangeDiff';
import { PrintMenu } from '../../printing/components/PrintMenu';
import { TaxBreakupSummary } from '../../order-management/components/TaxBreakupSummary';
import { OrderPaymentsPanel } from '../../order-management/components/OrderPaymentsPanel';
import { PAYMENT_STAGES, describePlan } from '../../order-management/utils/paymentPlan';
import { dealerStatusLabel } from '../utils/dealerOrderStage';
import { formatCurrency, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { formatUnit } from '../../../constants/unitsOfMeasure';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';

interface DealerOrderDetailModalProps {
  orderId: number;
  /** Bumped by the page after an action, so the open view reloads. */
  version: number;
  isSubmitting: boolean;
  onClose: () => void;
  onRequestChange: (order: DealerOrder) => void;
  onWithdrawChange: (change: DealerChange) => void;
  /** Accept or reject an order awaiting the dealer; resolves true when it was saved. */
  onRespond: (order: DealerOrder, payload: OrderResponseRequest) => Promise<boolean>;
  /** Mark a confirmed order as shipped; resolves true when it was saved. */
  onShip: (order: DealerOrder) => Promise<boolean>;
}

const REASON_MAX_LENGTH = 500;

/** Accept the order, or reject it with a reason the procurement team will see. */
const ResponsePanel: React.FC<{
  order: DealerOrder;
  isSubmitting: boolean;
  onRespond: DealerOrderDetailModalProps['onRespond'];
}> = ({ order, isSubmitting, onRespond }) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reject = async () => {
    const text = reason.trim();
    if (!text) {
      setError('Tell the procurement team why you are rejecting this order.');
      return;
    }
    if (text.length > REASON_MAX_LENGTH) {
      setError(`Keep the reason under ${REASON_MAX_LENGTH} characters.`);
      return;
    }
    await onRespond(order, { decision: 'REJECT', reason: text });
  };

  return (
    <section aria-label="Your confirmation" className="space-y-3 rounded-2xl border border-[#0071e3]/30 bg-[#0071e3]/5 p-4">
      <div>
        <h3 className="text-sm font-semibold text-[#0071e3] dark:text-blue-400">This order is waiting for your confirmation</h3>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
          The procurement team approved it. Accept to confirm you will supply it, or reject it and say why.
        </p>
      </div>
      {rejecting ? (
        <div className="space-y-2">
          <label htmlFor="dealer-reject-reason" className="text-xs font-semibold">
            Reason for rejecting <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="dealer-reject-reason"
            rows={3}
            value={reason}
            maxLength={REASON_MAX_LENGTH}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            placeholder="e.g. Out of stock until next month"
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
              className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={reject}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.danger}`}
            >
              <XCircle className="w-3.5 h-3.5" /> Reject order
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setRejecting(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-50 ${CHOICE_TONE.danger.idle}`}
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onRespond(order, { decision: 'ACCEPT' })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.approve}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Accept order
          </button>
        </div>
      )}
    </section>
  );
};

/** Mark a confirmed order as shipped once it has left; asks once before saving, since it can't be undone. */
const ShipPanel: React.FC<{
  order: DealerOrder;
  isSubmitting: boolean;
  onShip: DealerOrderDetailModalProps['onShip'];
}> = ({ order, isSubmitting, onShip }) => {
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-label="Shipping" className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div>
        <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Ready to ship?</h3>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
          {confirming
            ? 'Mark this order as shipped? The procurement team is told it is on its way, and this can’t be undone.'
            : 'Once the goods have left, mark the order as shipped so the procurement team can expect the delivery.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {confirming && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setConfirming(false)}
            className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Back
          </button>
        )}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={async () => {
            if (!confirming) setConfirming(true);
            else if (await onShip(order)) setConfirming(false);
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.approve}`}
        >
          <Truck className="w-3.5 h-3.5" /> {confirming ? 'Yes, mark as shipped' : 'Mark as shipped'}
        </button>
      </div>
    </section>
  );
};

const CHANGE_STATUS_LABEL: Record<DealerChange['status'], string> = {
  PENDING: 'Waiting for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
    <dd className="text-sm font-medium mt-0.5 break-words">{children}</dd>
  </div>
);

export const DealerOrderDetailModal: React.FC<DealerOrderDetailModalProps> = ({
  orderId,
  version,
  isSubmitting,
  onClose,
  onRequestChange,
  onWithdrawChange,
  onRespond,
  onShip,
}) => {
  const { can } = useAccess();
  const notify = useNotify();
  const [order, setOrder] = useState<DealerOrder | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!can('DEALER_PORTAL_VIEW')) return;
    let current = true;
    dealerPortalApi
      .getOrder(orderId)
      .then((res) => {
        if (!current) return;
        if (res.success && res.data) setOrder(res.data);
        else {
          setFailed(true);
          notify.error(res, 'This order could not be loaded.');
        }
      })
      .catch((err: unknown) => {
        if (!current) return;
        setFailed(true);
        notify.error(err, 'This order could not be loaded.');
      });
    return () => {
      current = false;
    };
  }, [orderId, version, can, notify]);

  const pending = order?.pendingChange ?? null;
  const pastChanges = (order?.changes ?? []).filter((change) => change.status !== 'PENDING');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={order ? `Order ${order.orderNumber}` : 'Order details'}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-black/10 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold font-mono">{order?.orderNumber ?? 'Order'}</h2>
            {order && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <DealerStatusBadge status={order.orderStatus} />
                <span>{order.raisedByYou ? 'Raised by you' : 'Raised by the procurement team'}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {!order && !failed && (
            <div className="py-10 flex justify-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {failed && <p className="text-sm text-rose-600">This order could not be loaded.</p>}

          {order && (
            <>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Fact label="Item">
                  {order.itemName}
                  {order.itemSku && <span className="block text-xs text-gray-400 font-mono">{order.itemSku}</span>}
                </Fact>
                <Fact label="Quantity">
                  {order.orderQuantity} {formatUnit(order.unitType)}
                </Fact>
                <Fact label="Unit price">{formatCurrency(order.unitPrice)}</Fact>
                <Fact label="Shipment">{formatCurrency(order.shipmentPrice)}</Fact>
                <Fact label="Total before GST">
                  <span className="font-mono">{formatCurrency(order.totalPrice)}</span>
                </Fact>
                <Fact label="Quoted on">{formatDate(order.orderDate)}</Fact>
                <Fact label="Expected delivery">{formatDate(order.expectedDelivery)}</Fact>
                {order.actualDelivery && <Fact label="Delivered on">{formatDate(order.actualDelivery)}</Fact>}
              </dl>
              <p className="text-sm rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2" data-testid="dealer-payment-plan">
                <span className="text-xs text-gray-400 block">Payment plan</span>
                {describePlan(order) ?? 'None: paid after the delivered units are tested'}
              </p>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2">
                <TaxBreakupSummary taxBreakup={order.taxBreakup} totalPrice={order.totalPrice} />
                <p className="text-[10px] text-gray-400 mt-1">Your invoice for this order is checked against these figures when it is delivered.</p>
              </div>
              {order.note && (
                <p className="text-sm rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2">
                  <span className="text-xs text-gray-400 block">Remarks</span>
                  {order.note}
                </p>
              )}

              <OrderPaymentsPanel orderId={order.id} enabled={PAYMENT_STAGES.has(order.orderStatus)} view="dealer" />

              {order.awaitingYourResponse && can('DEALER_ORDER_RESPOND') && (
                <ResponsePanel key={order.id} order={order} isSubmitting={isSubmitting} onRespond={onRespond} />
              )}

              {order.shippable && can('DEALER_ORDER_SHIP') && (
                <ShipPanel key={order.id} order={order} isSubmitting={isSubmitting} onShip={onShip} />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <PrintMenu orderId={order.id} status={order.orderStatus} />
                {order.changeable && can('DEALER_QUOTATION_CHANGE_REQUEST') && (
                  <button
                    type="button"
                    onClick={() => onRequestChange(order)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${CHOICE_TONE.primary.idle}`}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Request a change
                  </button>
                )}
              </div>

              {pending && (
                <section aria-label="Change waiting for approval" className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <Clock className="w-4 h-4" /> Change waiting for approval
                    </h3>
                    {can('DEALER_QUOTATION_CHANGE_REQUEST') && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => onWithdrawChange(pending)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-50 ${CHOICE_TONE.warning.idle}`}
                      >
                        <Undo2 className="w-3.5 h-3.5" /> Withdraw change
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Sent {formatDateTime(pending.requestedAt)}. Your quotation stays as shown above until it is approved.
                  </p>
                  <ChangeDiff changes={pending.changes} previous={pending.previous} />
                  {pending.proposedTotalPrice != null && (
                    <p className="text-xs">
                      New total if approved: <span className="font-mono font-semibold">{formatCurrency(pending.proposedTotalPrice)}</span>
                    </p>
                  )}
                </section>
              )}

              {(order.history ?? []).length > 0 && (
                <section aria-label="Status history">
                  <h3 className="text-sm font-semibold mb-2">Progress</h3>
                  <ol className="space-y-2 border-l border-black/10 dark:border-white/10 pl-4">
                    {(order.history ?? []).map((step, index) => (
                      <li key={`${step.toStatus}-${index}`} className="text-sm">
                        <span className="font-medium">{dealerStatusLabel(step.toStatus)}</span>
                        <span className="text-xs text-gray-400 ml-2">{formatDateTime(step.changedAt)}</span>
                        {step.reason && <p className="text-xs text-gray-500">Reason: {step.reason}</p>}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {pastChanges.length > 0 && (
                <section aria-label="Earlier changes" className="space-y-3">
                  <h3 className="text-sm font-semibold">Earlier changes</h3>
                  {pastChanges.map((change) => (
                    <div key={change.id} className="space-y-1.5">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold">{CHANGE_STATUS_LABEL[change.status]}</span> · sent {formatDateTime(change.requestedAt)}
                        {change.decisionReason && <> · {change.decisionReason}</>}
                      </p>
                      <ChangeDiff changes={change.changes} previous={change.previous} />
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
