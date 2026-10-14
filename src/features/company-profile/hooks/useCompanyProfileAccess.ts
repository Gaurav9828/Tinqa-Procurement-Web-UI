import { useMemo } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { getAdminIdentity } from '../../../auth/adminIdentity';
import type { CompanyProfileVersion } from '../types/companyProfile.types';
import { sameUser } from '../utils/companyProfile.utils';

/**
 * Maker-checker rules for the current admin (UX only; the backend answers 403 otherwise).
 *  - Maker (ADMIN_L1): create / edit own DRAFT or REJECTED versions, upload, submit, withdraw what they submitted.
 *  - Checker (ADMIN_L2): approve / reject a pending change — never one they created or submitted.
 */
export const useCompanyProfileAccess = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    const { username, roles } = getAdminIdentity(token, user);
    const isMaker = roles.includes('ADMIN_L1');
    const isChecker = roles.includes('ADMIN_L2');
    const isMine = (v: Pick<CompanyProfileVersion, 'createdBy' | 'submittedBy'>) =>
      sameUser(v.createdBy, username) || sameUser(v.submittedBy, username);

    return {
      username,
      isMaker,
      isChecker,
      /** Own DRAFT / REJECTED version. */
      canEdit: (v: CompanyProfileVersion) =>
        isMaker && (v.status === 'DRAFT' || v.status === 'REJECTED') && sameUser(v.createdBy, username),
      /** Pending change that someone else made. */
      canReview: (v: CompanyProfileVersion) => isChecker && v.status === 'PENDING_APPROVAL' && !isMine(v),
      /** The checker made this pending change themselves (shown instead of Approve). */
      isOwnPendingChange: (v: CompanyProfileVersion) => isChecker && v.status === 'PENDING_APPROVAL' && isMine(v),
      canWithdraw: (v: CompanyProfileVersion) => isMaker && v.status === 'PENDING_APPROVAL' && sameUser(v.submittedBy, username),
    };
  }, [token, user]);
};

export type CompanyProfileAccess = ReturnType<typeof useCompanyProfileAccess>;
