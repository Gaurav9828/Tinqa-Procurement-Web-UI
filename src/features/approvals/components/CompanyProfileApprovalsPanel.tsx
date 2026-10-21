import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Loader2, RefreshCw } from 'lucide-react';
import type { CompanyProfileVersion } from '../../company-profile/types/companyProfile.types';
import { companyVersionPath, formatServerTime } from '../../company-profile/utils/companyProfile.utils';
import { sectionLabel } from '../../company-profile/utils/companyProfileSections';
import { useCompanyProfileAccess } from '../../company-profile/hooks/useCompanyProfileAccess';

interface Props {
  pending: CompanyProfileVersion[];
  isLoading: boolean;
  onRefresh: () => void;
}

/**
 * The Approvals hub's Company profile tab: the changes waiting for a checker, at most one per section. Review opens the
 * version, which shows the fields it changes against the live profile and holds Approve / Reject.
 */
export const CompanyProfileApprovalsPanel: React.FC<Props> = ({ pending, isLoading, onRefresh }) => {
  const access = useCompanyProfileAccess();

  return (
    <section aria-label="Company profile changes awaiting approval" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0071e3]" /> Company profile changes
          </h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-1 max-w-2xl">
            Brand, legal, contact and invoice details used on the storefront and printed documents. Each change covers one
            section and goes live as soon as it's approved, without touching the other sections; someone other than its maker
            approves it.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh company profile changes"
          className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-gray-500">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'No change waiting.'}</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((change) => (
            <li key={change.id}>
              <article className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-black/[0.03] dark:bg-white/5">
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold">
                    {sectionLabel(change.section)} · version {change.versionNo}
                  </p>
                  <p className="text-xs text-gray-500">
                    Submitted by {change.submittedBy ?? '—'} on {formatServerTime(change.submittedAt)}
                  </p>
                  {access.isOwnPendingChange(change) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">You made this change, so someone else approves it.</p>
                  )}
                </div>
                <Link
                  to={companyVersionPath(change.id)}
                  aria-label={`Review company profile version ${change.versionNo}`}
                  className="self-start sm:self-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold"
                >
                  Review changes <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
