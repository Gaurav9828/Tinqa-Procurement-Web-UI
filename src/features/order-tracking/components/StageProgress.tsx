import React from 'react';
import { RotateCcw, XCircle } from 'lucide-react';
import { StatusStepper } from '../../../components/ui/StatusStepper';
import { CANCELLATION_REFUND_TRACK, MAIN_STAGES, RETURN_TRACK, STAGE_LABELS, getStage } from '../utils/statusWorkflow';
import { formatStatusLabel } from '../utils/orderTracking.utils';

interface Props {
  currentStatus: string | null;
  /** A cancelled order that was paid: its refund is shown step by step. */
  paid?: boolean;
  /** Every status the order has had (oldest first), to tell a cancelled-then-refunded order from a returned one. */
  history?: string[];
}

const WARNING_STATUSES = new Set(['DELIVERY_FAILED', 'CUSTOMER_UNAVAILABLE', 'INVALID_ADDRESS', 'CUSTOMER_CANCELLED_DELIVERY', 'REFUND_FAILED']);
const CLOSED_RETURN_STATUSES = new Set(['RETURN_REJECTED', 'RETURN_CANCELLED', 'RETURN_BACK_DELIVERED']);
// A failed inspection: no refund, the item is on its way back to the customer.
const FAILED_RETURN_STATUSES = new Set(['RETURN_INSPECTION_FAILED', 'RETURN_BACK_IN_TRANSIT']);

/**
 * Stage-wise view of where the order is: Placed → Confirmed → Fulfilment → Shipped → Out for delivery
 * → Delivered, then a separate return / refund track once a return (or a refund after cancelling) starts.
 */
export const StageProgress: React.FC<Props> = ({ currentStatus, paid = false, history = [] }) => {
  const stage = getStage(currentStatus);
  const status = currentStatus ?? '';
  const wasCancelled = status === 'CANCELLED' || (stage === 'REFUND' || status === 'REFUND_COMPLETED' ? history.includes('CANCELLED') && !history.includes('DELIVERED') : false);
  const returnIndex = RETURN_TRACK.findIndex((step) => step.statuses.includes(status));
  const inReturn = !wasCancelled && returnIndex >= 0;
  // Cancelled and paid (refund still due), or a refund under way after cancelling.
  const refunding = wasCancelled && (status !== 'CANCELLED' || paid);
  const activeIndex = inReturn ? MAIN_STAGES.length - 1 : stage ? MAIN_STAGES.indexOf(stage) : -1;

  return (
    <div aria-label="Order stage" data-stage={wasCancelled ? 'CANCELLED' : inReturn ? 'RETURNS' : stage ?? 'UNKNOWN'} className="space-y-3">
      <StatusStepper
        label="Order stages"
        steps={MAIN_STAGES.map((s) => ({ key: s, label: STAGE_LABELS[s] }))}
        currentIndex={activeIndex}
        muted={wasCancelled}
        warning={WARNING_STATUSES.has(status)}
        complete={status === 'DELIVERED' || inReturn}
      />

      {wasCancelled && !refunding && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
          <XCircle className="w-3.5 h-3.5" /> Cancelled — order closed
        </p>
      )}

      {refunding && (
        <div className="space-y-2 p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5" /> Cancelled — {status === 'CANCELLED' ? 'refund due' : formatStatusLabel(status)}
          </p>
          <StatusStepper
            label="Refund stages"
            steps={CANCELLATION_REFUND_TRACK.map((step) => ({ key: step.key, label: step.label }))}
            currentIndex={CANCELLATION_REFUND_TRACK.findIndex((step) => step.statuses.includes(status))}
            warning={status === 'REFUND_FAILED'}
            complete={status === 'REFUND_COMPLETED'}
          />
        </div>
      )}

      {inReturn && (
        <div className="space-y-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
            <RotateCcw className="w-3.5 h-3.5" /> Return: {formatStatusLabel(status)}
          </p>
          <StatusStepper
            label="Return stages"
            tone="purple"
            steps={RETURN_TRACK.map((step) => ({ key: step.key, label: step.label }))}
            currentIndex={returnIndex}
            warning={WARNING_STATUSES.has(status) || FAILED_RETURN_STATUSES.has(status)}
            muted={CLOSED_RETURN_STATUSES.has(status)}
            complete={status === 'REFUND_COMPLETED' || status === 'RETURN_COMPLETED'}
          />
        </div>
      )}
    </div>
  );
};
