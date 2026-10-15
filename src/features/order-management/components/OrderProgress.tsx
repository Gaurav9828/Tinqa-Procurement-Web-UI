import React from 'react';
import { RotateCcw, XCircle } from 'lucide-react';
import type { OrderStatus } from '../../../types/common.types';
import { StatusStepper } from '../../../components/ui/StatusStepper';
import { MAIN_ORDER_TRACK, RETURN_ORDER_TRACK, isReturnStatus, orderStatusLabel } from '../utils/orderWorkflow';

/** Where a procurement order is: the main track, plus the return track once a return starts. */
export const OrderProgress: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const cancelled = status === 'CANCELLED';
  const inReturn = isReturnStatus(status);
  const mainIndex = inReturn ? MAIN_ORDER_TRACK.length - 1 : MAIN_ORDER_TRACK.findIndex((s) => s.status === status);
  const returnIndex = RETURN_ORDER_TRACK.findIndex((s) => s.status === status || s.also?.includes(status));

  return (
    <div className="space-y-3" data-status={status}>
      <StatusStepper
        label="Order progress"
        steps={MAIN_ORDER_TRACK.map((s) => ({ key: s.status, label: s.label }))}
        currentIndex={mainIndex}
        muted={cancelled}
        complete={status === 'DELIVERED' || inReturn}
      />
      {cancelled && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
          <XCircle className="w-3.5 h-3.5" /> Cancelled — order closed
        </p>
      )}
      {inReturn && (
        <div className="space-y-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
            <RotateCcw className="w-3.5 h-3.5" /> Return: {orderStatusLabel(status)}
          </p>
          <StatusStepper
            label="Return progress"
            tone="purple"
            steps={RETURN_ORDER_TRACK.map((s) => ({ key: s.status, label: s.label }))}
            currentIndex={returnIndex}
            warning={status === 'REFUND_FAILED'}
            muted={status === 'RETURN_REJECTED'}
            complete={status === 'REFUND_COMPLETED'}
          />
        </div>
      )}
    </div>
  );
};
