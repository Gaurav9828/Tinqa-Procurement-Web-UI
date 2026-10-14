import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, CopyPlus, RefreshCw } from 'lucide-react';
import { useCompanyProfileHistory } from '../hooks/useCompanyProfileData';
import { useCompanyProfileAccess } from '../hooks/useCompanyProfileAccess';
import { useCompanyProfileActions } from '../hooks/useCompanyProfileActions';
import { BrandName, VersionStatusBadge } from '../components/ProfileDisplay';
import { Skeleton, StateMessage } from '../components/Dialogs';
import { BUTTON } from '../utils/companyProfileUi';
import type { CompanyProfileVersion } from '../types/companyProfile.types';
import { COMPANY_PROFILE_PATH, companyDraftPath, companyVersionPath, formatServerTime } from '../utils/companyProfile.utils';
import { fieldsOf } from '../utils/companyProfileForm';

const WhoWhen: React.FC<{ who: string | null; when: string | null }> = ({ who, when }) =>
  who || when ? (
    <>
      <span className="block text-black dark:text-white">{who ?? '—'}</span>
      <span className="block text-gray-400">{formatServerTime(when)}</span>
    </>
  ) : (
    <span className="text-gray-400">—</span>
  );

/** History: /settings/company-profile/history — every version, newest first. */
export const CompanyProfileHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const access = useCompanyProfileAccess();
  const { page, setPage, result, isLoading, errorKind, reload } = useCompanyProfileHistory();
  const actions = useCompanyProfileActions();

  // Client-side copy: a new draft with that version's field values.
  const startFrom = async (version: CompanyProfileVersion) => {
    const created = await actions.createDraft(fieldsOf(version));
    if (created.ok && created.version) navigate(companyDraftPath(created.version.id));
  };

  const renderBody = () => {
    if (!result) {
      if (isLoading) return <Skeleton lines={6} label="Loading history" />;
      return <StateMessage variant={errorKind ?? 'unknown'} onRetry={reload} />;
    }
    if (result.content.length === 0) return <StateMessage variant="empty" title="No versions yet" body="Versions appear here once a draft is created." />;
    return (
      <>
        <div className="overflow-x-auto apple-card">
          <table aria-label="Company profile versions" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-gray-500">
                <th className="p-3 font-semibold">Version</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Brand</th>
                <th className="p-3 font-semibold">Created</th>
                <th className="p-3 font-semibold">Submitted</th>
                <th className="p-3 font-semibold">Reviewed</th>
                <th className="p-3 font-semibold">Review comment</th>
                {access.isMaker && <th className="p-3 font-semibold sr-only">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10 align-top">
              {result.content.map((v) => (
                <tr
                  key={v.id}
                  data-testid={`version-row-${v.id}`}
                  tabIndex={0}
                  onClick={() => navigate(companyVersionPath(v.id))}
                  onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && navigate(companyVersionPath(v.id))}
                  className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer focus:outline-none focus:bg-blue-500/5"
                  aria-label={`Open version ${v.versionNo}`}
                >
                  <td className="p-3 font-semibold text-black dark:text-white">{v.versionNo}</td>
                  <td className="p-3">
                    <VersionStatusBadge status={v.status} live={v.status === 'APPROVED'} />
                  </td>
                  <td className="p-3">
                    <BrandName name={v.brandName} mark={v.trademarkMark} />
                  </td>
                  <td className="p-3">
                    <WhoWhen who={v.createdBy} when={v.createdAt} />
                  </td>
                  <td className="p-3">
                    <WhoWhen who={v.submittedBy} when={v.submittedAt} />
                  </td>
                  <td className="p-3">
                    <WhoWhen who={v.reviewedBy} when={v.reviewedAt} />
                  </td>
                  <td className="p-3 max-w-[220px]">
                    <span className="block truncate text-gray-600 dark:text-gray-300" title={v.reviewComment ?? undefined}>
                      {v.reviewComment ?? '—'}
                    </span>
                  </td>
                  {access.isMaker && (
                    <td className="p-3 text-right">
                      {(v.status === 'WITHDRAWN' || v.status === 'SUPERSEDED') && (
                        <button
                          type="button"
                          disabled={!!actions.busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            void startFrom(v);
                          }}
                          className={`${BUTTON.secondary} whitespace-nowrap`}
                          aria-label={`Start new draft from version ${v.versionNo}`}
                        >
                          <CopyPlus className="w-3.5 h-3.5" /> New draft from this
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between text-gray-500">
            <span>
              Page {page + 1} of {result.totalPages} · {result.totalElements} versions
            </span>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous page" disabled={result.first || isLoading} onClick={() => setPage(page - 1)} className={BUTTON.secondary}>
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button type="button" aria-label="Next page" disabled={result.last || isLoading} onClick={() => setPage(page + 1)} className={BUTTON.secondary}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </nav>
        )}
      </>
    );
  };

  return (
    <section aria-label="Company profile history" className="p-6 space-y-6 text-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(COMPANY_PROFILE_PATH)} className="p-2 rounded-xl bg-black/5 dark:bg-white/10 cursor-pointer" aria-label="Back to company profile">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-black dark:text-white">Company profile history</h1>
        </div>
        <button type="button" onClick={() => void reload()} className={BUTTON.secondary} aria-label="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {renderBody()}
    </section>
  );
};
