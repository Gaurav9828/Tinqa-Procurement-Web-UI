import { useCallback, useEffect, useState } from 'react';
import { companyProfileApi } from '../../company-profile/api/companyProfileApi';
import type { CompanyProfileVersion } from '../../company-profile/types/companyProfile.types';
import { useAccess } from '../../../hooks/useAccess';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/**
 * Company profile changes waiting for approval (the `pendingChanges` of GET /admin/company/profile: at most one per
 * section). Loads only for checkers who can read the profile. The review (changes vs live, approve / reject) is each
 * version's own page.
 */
export const useCompanyProfileApprovals = () => {
  const { canAll } = useAccess();
  const allowed = canAll('COMPANY_PROFILE_APPROVE', 'COMPANY_PROFILE_VIEW');
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const [pending, setPending] = useState<CompanyProfileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!allowed) return;
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await companyProfileApi.getOverview();
      if (!isCurrent()) return;
      if (res.success) setPending(res.data?.pendingChanges ?? []);
      else notify.error(res, 'The company profile changes could not be loaded.');
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'The company profile changes could not be loaded.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [allowed, beginRequest, notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { allowed, pending, isLoading, refresh };
};
