import React, { useEffect, useId, useState } from 'react';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import type { AdminReview } from '../types/review.types';
import { REVIEW_REASON_MAX_LENGTH } from '../types/review.types';
import type { ModerationResult } from '../hooks/useReviewModeration';

interface Props {
  review: AdminReview;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (review: AdminReview, active: boolean, reason: string) => Promise<ModerationResult>;
}

/** Confirm showing or hiding a review, with an optional internal reason. Mount it with a `key` per review. */
export const ReviewStatusDialog: React.FC<Props> = ({ review, isSubmitting, onClose, onConfirm }) => {
  const titleId = useId();
  const reasonId = useId();
  const reasonErrorId = useId();
  const deactivating = review.active;
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length > REVIEW_REASON_MAX_LENGTH) {
      setReasonError(`Reason cannot exceed ${REVIEW_REASON_MAX_LENGTH} characters.`);
      return;
    }
    const result = await onConfirm(review, !deactivating, reason);
    if (result.ok) onClose();
    else if (result.reasonError) setReasonError(result.reasonError);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl text-xs"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 id={titleId} className="flex items-center gap-2 font-bold text-black dark:text-white text-sm">
            {deactivating ? <EyeOff className="w-4 h-4 text-rose-500" /> : <Eye className="w-4 h-4 text-emerald-500" />}
            {deactivating ? 'Deactivate review?' : 'Activate review?'}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-neutral-300 leading-relaxed">
            {deactivating
              ? 'This review will be hidden from the storefront and no longer count towards the product rating. You can activate it again later.'
              : 'This review will be visible on the storefront again and count towards the product rating.'}
          </p>

          <div>
            <label htmlFor={reasonId} className="block font-semibold text-gray-700 dark:text-neutral-300 mb-1">
              Reason (internal) <span className="font-normal text-gray-400">— optional, never shown to customers</span>
            </label>
            <textarea
              id={reasonId}
              rows={3}
              autoFocus
              value={reason}
              maxLength={REVIEW_REASON_MAX_LENGTH}
              aria-invalid={!!reasonError}
              aria-describedby={reasonError ? reasonErrorId : undefined}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder={deactivating ? 'e.g. Contains personal contact details' : 'e.g. Reviewed again, content is fine'}
              className={`w-full p-3 rounded-xl border bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                reasonError ? 'border-red-500/70' : 'border-black/10 dark:border-white/10'
              }`}
            />
            <div className="flex justify-between gap-2 mt-1">
              {reasonError ? (
                <p id={reasonErrorId} role="alert" className="text-[11px] text-red-500">
                  {reasonError}
                </p>
              ) : (
                <span />
              )}
              <span className="text-[10px] text-gray-400 shrink-0">
                {reason.length}/{REVIEW_REASON_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 text-black dark:text-white rounded-xl font-medium cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer ${
                deactivating ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {deactivating ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
