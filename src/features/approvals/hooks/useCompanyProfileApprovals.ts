import { useCallback, useEffect, useState } from 'react';
import { companyProfileApi } from '../../company-profile/api/companyProfileApi';
import type { CompanyProfileVersion } from '../../company-profile/types/companyProfile.types';
import { useAccess } from '../../../hooks/useAccess';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/**
 * The company profile change waiting for approval, if any (the `pending` of GET /admin/company/profile; there is at
 * most one). Loads only for checkers who can read the profile. The review (changes vs live, approve / reject) is the
 * version's own page.
 */
export const useCompanyProfileApprovals = () => {
  const { canAll } = useAccess();
  const allowed = canAll('COMPANY_PROFILE_APPROVE', 'COMPANY_PROFILE_VIEW');
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const [pending, setPending] = useState<CompanyProfileVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!allowed) return;
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await companyProfileApi.getOverview();
      if (!isCurrent()) return;
      if (res.success) setPending(res.data?.pending ?? null);
      else notify.error(res, 'The company profile change could not be loaded.');
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'The company profile change could not be loaded.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [allowed, beginRequest, notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { allowed, pending, isLoading, refresh };
};
