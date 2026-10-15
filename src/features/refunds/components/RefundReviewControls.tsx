import React, { useState } from 'react';
import { Check, Loader2, RefreshCw, RotateCcw, X } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { formatPaise } from '../../order-tracking/utils/payment.utils';
import type { Refund } from '../types/refund.types';
import { useRefundAccess } from '../hooks/useRefundAccess';
import { useApproveRefund, useRejectRefund, useSyncRefund } from '../hooks/useRefundMutations';
import { RejectRefundDialog } from './RejectRefundDialog';

const BUTTON = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

/**
 * Actions on one refund, by role and status: Approve / Reject (L2, REQUESTED), Retry approval (L2, APPROVED
 * after Razorpay was unreachable) and Refresh status (L1/L2, PENDING). Every outcome reloads via `onChanged`.
 */
export const RefundReviewControls: React.FC<{ refund: Refund; onChanged: () => void }> = ({ refund, onChanged }) => {
  const access = useRefundAccess();
  const { approveRefund, isSubmitting: isApproving } = useApproveRefund(onChanged);
  const { rejectRefund, isSubmitting: isRejecting } = useRejectRefund(onChanged);
  const { syncRefund, isSubmitting: isSyncing } = useSyncRefund(onChanged);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const busy = isApproving || isRejecting || isSyncing;
  const canApprove = access.canApprove(refund);
  const canRetry = access.canRetryApproval(refund);
  const canReject = access.canReject(refund);
  const canSync = access.canSync(refund);
  const ownPending = access.isApprover && refund.status === 'REQUESTED' && access.isOwnRequest(refund);

  if (!canApprove && !canRetry && !canReject && !canSync && !ownPending) return null;

  const amount = formatPaise(refund.amountPaise, refund.currency);

  const approve = async () => {
    await approveRefund(refund.id);
    // Success or failure, the reloaded refund shows what happened (e.g. FAILED, or APPROVED with Retry).
    setApproveOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={`Actions for refund ${refund.id}`} role="group">
      {canApprove && (
        <button type="button" disabled={busy} onClick={() => setApproveOpen(true)} className={`${BUTTON} bg-emerald-500 hover:bg-emerald-600 text-white`}>
          <Check className="w-3.5 h-3.5" /> Approve
        </button>
      )}
      {canRetry && (
        <button type="button" disabled={busy} onClick={() => setApproveOpen(true)} className={`${BUTTON} bg-[#0071e3] hover:bg-[#0077ed] text-white`}>
          <RotateCcw className="w-3.5 h-3.5" /> Retry approval
        </button>
      )}
      {canReject && (
        <button type="button" disabled={busy} onClick={() => setRejectOpen(true)} className={`${BUTTON} bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400`}>
          <X className="w-3.5 h-3.5" /> Reject
        </button>
      )}
      {canSync && (
        <button
          type="button"
          disabled={busy}
          onClick={() => syncRefund(refund.id)}
          className={`${BUTTON} bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white`}
        >
          {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh status
        </button>
      )}
      {ownPending && <p className="text-[11px] text-gray-500 dark:text-neutral-400">You requested this refund. Another approver must approve it.</p>}

      <ConfirmationModal
        isOpen={approveOpen}
        actionType="APPROVED"
        title={canRetry ? 'Retry this refund?' : 'Approve this refund?'}
        description={`${amount} will be sent back to the customer via Razorpay for order ${refund.orderNumber} (payment ${refund.razorpayPaymentId}). This can't be undone.`}
        isSubmitting={isApproving}
        onClose={() => setApproveOpen(false)}
        onConfirm={approve}
      />
      {rejectOpen && (
        <RejectRefundDialog
          refund={refund}
          isSubmitting={isRejecting}
          onClose={() => setRejectOpen(false)}
          onSubmit={(comment) => rejectRefund(refund.id, comment)}
        />
      )}
    </div>
  );
};
