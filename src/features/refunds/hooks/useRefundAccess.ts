import { useMemo } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { getAdminIdentity } from '../../../auth/adminIdentity';
import { sameUser } from '../../company-profile/utils/companyProfile.utils';
import type { Refund } from '../types/refund.types';

/**
 * Maker-checker rules for refunds (UX only; the backend answers 403 otherwise).
 *  - Maker (REFUND_REQUEST): requests a refund.
 *  - Checker (REFUND_APPROVE): approves or rejects a REQUESTED refund — never approves one they requested.
 *  - REFUND_SYNC: refresh a refund that is waiting on Razorpay.
 */
export const useRefundAccess = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    const { username } = getAdminIdentity(token, user);
    const permissions = user?.permissions ?? [];
    const canRequest = permissions.includes('REFUND_REQUEST');
    const isApprover = permissions.includes('REFUND_APPROVE');
    const canSyncRefunds = permissions.includes('REFUND_SYNC');
    const isOwnRequest = (refund: Pick<Refund, 'requestedBy'>) => sameUser(refund.requestedBy, username);

    return {
      username,
      canRequest,
      isApprover,
      isOwnRequest,
      canApprove: (refund: Refund) => isApprover && refund.status === 'REQUESTED' && !isOwnRequest(refund),
      canReject: (refund: Refund) => isApprover && refund.status === 'REQUESTED',
      /** Razorpay was unreachable at approval: the same approve call retries it. */
      canRetryApproval: (refund: Refund) => isApprover && refund.status === 'APPROVED' && !!refund.failureReason && !isOwnRequest(refund),
      canSync: (refund: Refund) => canSyncRefunds && refund.status === 'PENDING',
    };
  }, [token, user]);
};

export type RefundAccess = ReturnType<typeof useRefundAccess>;
