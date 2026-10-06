import React from 'react';
import { Check, RotateCcw, XCircle } from 'lucide-react';
import { MAIN_STAGES, STAGE_LABELS, getStage } from '../utils/statusWorkflow';
import { formatStatusLabel } from '../utils/orderTracking.utils';

interface Props {
  currentStatus: string | null;
}

/**
 * Stage-wise view of where the order is: Placed → Confirmed → Fulfilment → Out for delivery → Delivered,
 * with a distinct banner when the order is in returns or closed.
 */
export const StageProgress: React.FC<Props> = ({ currentStatus }) => {
  const stage = getStage(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';
  const isReturn = stage === 'RETURNS' || currentStatus === 'RETURN_COMPLETED';
  // Returns happen after delivery, so the main track is complete for them.
  const activeIndex = isReturn ? MAIN_STAGES.length - 1 : stage ? MAIN_STAGES.indexOf(stage) : -1;

  return (
    <div aria-label="Order stage" data-stage={isCancelled ? 'CANCELLED' : isReturn ? 'RETURNS' : stage ?? 'UNKNOWN'} className="space-y-2">
      <ol className="flex items-center gap-1">
        {MAIN_STAGES.map((s, index) => {
          const done = !isCancelled && activeIndex > index;
          const current = !isCancelled && activeIndex === index;
          return (
            <li key={s} aria-current={current ? 'step' : undefined} className="flex-1 min-w-0">
              <div
                className={`h-1.5 rounded-full ${
                  isCancelled ? 'bg-gray-200 dark:bg-neutral-700' : done || current ? 'bg-[#0071e3]' : 'bg-gray-200 dark:bg-neutral-700'
                }`}
              />
              <span
                className={`mt-1 flex items-center gap-0.5 text-[10px] truncate ${
                  current ? 'font-bold text-[#0071e3]' : done ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'
                }`}
              >
                {done && <Check className="w-2.5 h-2.5 shrink-0" />}
                {STAGE_LABELS[s]}
              </span>
            </li>
          );
        })}
      </ol>

      {isCancelled && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
          <XCircle className="w-3.5 h-3.5" /> Cancelled — order closed
        </p>
      )}
      {isReturn && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
          <RotateCcw className="w-3.5 h-3.5" /> Return: {formatStatusLabel(currentStatus)}
        </p>
      )}
    </div>
  );
};
