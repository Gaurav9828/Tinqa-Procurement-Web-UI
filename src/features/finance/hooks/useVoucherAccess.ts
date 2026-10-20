import { useMemo } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { getAdminIdentity } from '../../../auth/adminIdentity';
import { sameUser } from '../../company-profile/utils/companyProfile.utils';
import type { Voucher } from '../types/finance.types';

/**
 * Maker-checker for vouchers (UX only; the backend refuses with 403 otherwise).
 *  - Maker (EXPENSE_SUBMIT): raises, edits and withdraws their own voucher while it awaits approval.
 *  - Checker (EXPENSE_APPROVE): approves (posts) or rejects someone else's voucher, and reverses a posted one.
 */
export const useVoucherAccess = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    const { username } = getAdminIdentity(token, user);
    const permissions = user?.permissions ?? [];
    const canSubmit = permissions.includes('EXPENSE_SUBMIT');
    const isApprover = permissions.includes('EXPENSE_APPROVE');
    const isOwn = (voucher: Pick<Voucher, 'submittedBy'>) => sameUser(voucher.submittedBy, username);
    const pending = (voucher: Voucher) => voucher.status === 'SUBMITTED';
    return {
      username,
      canSubmit,
      isApprover,
      isOwn,
      canEdit: (voucher: Voucher) => canSubmit && pending(voucher) && isOwn(voucher),
      canWithdraw: (voucher: Voucher) => canSubmit && pending(voucher) && isOwn(voucher),
      canDecide: (voucher: Voucher) => isApprover && pending(voucher) && !isOwn(voucher),
      canReverse: (voucher: Voucher) => isApprover && voucher.status === 'APPROVED' && !isOwn(voucher),
    };
  }, [token, user]);
};
