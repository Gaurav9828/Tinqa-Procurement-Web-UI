import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CommonTextArea } from '../../../components/ui/FormInputs';
import { formatPaise } from '../../order-tracking/utils/payment.utils';
import type { Refund } from '../types/refund.types';
import type { RefundMutationResult } from '../hooks/useRefundMutations';
import { REFUND_TEXT_MAX_LENGTH, validateRefundText } from '../utils/refund.utils';
import { RefundDialogShell } from './RefundDialogShell';

/** L2: rejects a REQUESTED refund with a required comment (3–500 characters). */
export const RejectRefundDialog: React.FC<{
  refund: Refund;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<RefundMutationResult>;
}> = ({ refund, isSubmitting, onClose, onSubmit }) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !comment.trim()) return;
    const invalid = validateRefundText(comment, 'Comment');
    if (invalid) {
      setError(invalid);
      return;
    }
    const result = await onSubmit(comment.trim());
    if (result.ok) onClose();
    else if (result.fieldErrors.comment) setError(result.fieldErrors.comment);
    // Any other failure (e.g. someone else already acted) reloads the refund; this dialog no longer applies.
    else onClose();
  };

  return (
    <RefundDialogShell
      title="Reject refund"
      subtitle={`${formatPaise(refund.amountPaise, refund.currency)} for order ${refund.orderNumber}`}
      disabled={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Reject refund">
        <div>
          <CommonTextArea
            label="Comment"
            aria-label="Rejection comment"
            required
            rows={3}
            maxLength={REFUND_TEXT_MAX_LENGTH}
            value={comment}
            disabled={isSubmitting}
            error={error}
            onChange={(e) => {
              setComment(e.target.value);
              setError('');
            }}
          />
          <p className="text-[10px] text-gray-400 px-1 mt-1 flex justify-between gap-2">
            <span>Shown to the requesting admin.</span>
            <span className="shrink-0">
              {comment.length}/{REFUND_TEXT_MAX_LENGTH}
            </span>
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !comment.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Reject refund
          </button>
        </div>
      </form>
    </RefundDialogShell>
  );
};
