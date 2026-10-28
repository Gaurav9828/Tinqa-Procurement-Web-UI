import { useCallback, useEffect } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { fetchCompanyOverview } from '../../../store/companyProfileSlice';

/**
 * Company profile changes waiting for approval (the `pendingChanges` of GET /admin/company/profile: at most one per
 * section). Loads only for checkers who can read the profile. The review (changes vs live, approve / reject) is each
 * version's own page. Uses the shared overview (store/companyProfileSlice) the navigation badge also loads, so
 * opening the hub does not fetch it a second time; `refresh` fetches it again.
 */
export const useCompanyProfileApprovals = () => {
  const { canAll } = useAccess();
  const allowed = canAll('COMPANY_PROFILE_APPROVE', 'COMPANY_PROFILE_VIEW');
  const notify = useNotify();
  const dispatch = useAppDispatch();
  const overview = useAppSelector((state) => state.companyProfile.overview);
  const isLoading = useAppSelector((state) => state.companyProfile.status === 'loading');

  const load = useCallback(
    async (force: boolean) => {
      if (!allowed) return;
      const result = await dispatch(fetchCompanyOverview(force ? { force: true } : undefined));
      // A load skipped because one is already running (or the data is still fresh) is not a failure
      if (fetchCompanyOverview.rejected.match(result) && !result.meta.condition) {
        notify.error('The company profile changes could not be loaded.');
      }
    },
    [allowed, dispatch, notify]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { allowed, pending: allowed ? overview?.pendingChanges ?? [] : [], isLoading, refresh };
};
