import { useCallback, useState } from 'react';
import { reviewsApi } from '../api/reviewsApi';
import type { AdminReview } from '../types/review.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind } from '../../../utils/apiErrorKind';
import { getApiErrorCode, getApiFieldErrors } from '../../../utils/apiError';

export const REVIEW_NO_ACCESS_MESSAGE = 'You do not have access to moderate reviews. Contact an Admin L2 if you need it.';

export type ModerationResult =
  | { ok: true; review: AdminReview }
  /** `reasonError` is set when the backend rejected the reason; show it on the field and keep the dialog open. */
  | { ok: false; reasonError?: string };

interface Options {
  onUpdated: (review: AdminReview) => void;
  /** The review was deleted elsewhere: the list should be refreshed. */
  onNotFound: (reviewId: number) => void;
}

/** Activate / deactivate a review (PATCH /admin/reviews/{id}/status). Content can never be edited. */
export const useReviewModeration = ({ onUpdated, onNotFound }: Options) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useNotify();

  const setActive = useCallback(
    async (review: AdminReview, active: boolean, reason: string): Promise<ModerationResult> => {
      setIsSubmitting(true);
      try {
        const trimmed = reason.trim();
        const res = await reviewsApi.updateStatus(review.id, { active, ...(trimmed ? { reason: trimmed } : {}) });
        if (res.success && res.data) {
          notify.success(res.message || (active ? 'Review activated.' : 'Review deactivated.'));
          onUpdated(res.data);
          return { ok: true, review: res.data };
        }
        notify.error(res, 'Failed to update the review.');
        return { ok: false };
      } catch (err: unknown) {
        const kind = getApiErrorKind(err);
        if (kind === 'notFound' || getApiErrorCode(err) === 'REVIEW_NOT_FOUND') {
          notify.error(err, 'This review no longer exists.');
          onNotFound(review.id);
          return { ok: false };
        }
        if (kind === 'forbidden') {
          notify.error(REVIEW_NO_ACCESS_MESSAGE);
          return { ok: false };
        }
        const reasonError = kind === 'validation' ? getApiFieldErrors(err).reason : undefined;
        if (reasonError) return { ok: false, reasonError };
        notify.error(err, 'Failed to update the review.');
        return { ok: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    [notify, onUpdated, onNotFound]
  );

  return { setActive, isSubmitting };
};
