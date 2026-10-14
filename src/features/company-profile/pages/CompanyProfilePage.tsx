import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Clock, Eye, FilePlus2, History, Pencil, RefreshCw, Send } from 'lucide-react';
import { useCompanyProfileOverview } from '../hooks/useCompanyProfileData';
import { useCompanyProfileAccess } from '../hooks/useCompanyProfileAccess';
import { useCompanyProfileActions } from '../hooks/useCompanyProfileActions';
import { ProfileDetails, VersionStatusBadge } from '../components/ProfileDisplay';
import { ReviewActions } from '../components/ReviewActions';
import { Skeleton, StateMessage } from '../components/Dialogs';
import { BUTTON } from '../utils/companyProfileUi';
import type { CompanyProfileVersion } from '../types/companyProfile.types';
import { PENDING_SUBMIT_BLOCKED, companyDraftPath, companyHistoryPath, companyVersionPath, formatServerTime } from '../utils/companyProfile.utils';
import { missingForSubmit, toForm } from '../utils/companyProfileForm';

/** Settings → Company profile: live profile, the pending change and the maker's drafts. */
export const CompanyProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const access = useCompanyProfileAccess();
  const { overview, isLoading, errorKind, reload } = useCompanyProfileOverview();
  const actions = useCompanyProfileActions({ onStale: reload });

  const live = overview?.live ?? null;
  const pending = overview?.pending ?? null;
  const drafts = overview?.myDrafts ?? [];

  const proposeChange = async () => {
    // No live profile yet: the first version is written from an empty form.
    if (!live) return navigate(companyDraftPath('new'));
    const result = await actions.createDraft({ copyFromLive: true });
    if (result.ok && result.version) navigate(companyDraftPath(result.version.id));
  };

  const submitDraft = async (draft: CompanyProfileVersion) => {
    const missing = missingForSubmit(toForm(draft));
    // Incomplete drafts open in the editor, which lists what's missing.
    if (missing.length) return navigate(companyDraftPath(draft.id), { state: { submitIntent: true } });
    const result = await actions.submitDraft(draft.id);
    if (result.ok || result.code) void reload();
  };

  if (!overview) {
    if (isLoading) return <Skeleton lines={8} label="Loading company profile" />;
    return <StateMessage variant={errorKind ?? 'unknown'} onRetry={reload} />;
  }

  return (
    <section aria-label="Company profile" className="p-6 space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0071e3]" /> Company profile
          </h1>
          <p className="text-gray-500 mt-0.5">
            Brand, legal and contact details shown on the storefront and invoices. Every change needs Level 2 approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={companyHistoryPath} className={BUTTON.secondary}>
            <History className="w-3.5 h-3.5" /> History
          </Link>
          <button type="button" onClick={() => void reload()} className={BUTTON.secondary} aria-label="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {pending && (
        <div role="region" aria-label="Pending change" className="apple-card p-5 space-y-3 border-amber-500/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-black dark:text-white">Change waiting for approval</h2>
                <VersionStatusBadge status={pending.status} />
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Version {pending.versionNo} submitted by {pending.submittedBy ?? 'unknown'} on {formatServerTime(pending.submittedAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to={companyVersionPath(pending.id)} className={BUTTON.secondary}>
                <Eye className="w-3.5 h-3.5" /> View changes
              </Link>
              <ReviewActions version={pending} access={access} onStale={reload} onDone={() => void reload()} />
            </div>
          </div>
          {access.isMaker && (
            <p role="note" className="p-2.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">
              A change is waiting for approval. You can keep editing drafts but can't submit until it is approved, rejected or withdrawn.
            </p>
          )}
        </div>
      )}

      <div role="region" aria-label="Live profile" className="apple-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-black dark:text-white">Live profile</h2>
              {live && <VersionStatusBadge status={live.status} live />}
            </div>
            {live && (
              <p className="text-gray-500">
                Version {live.versionNo}, approved by {live.reviewedBy ?? 'unknown'} on {formatServerTime(live.reviewedAt)}
              </p>
            )}
          </div>
          {access.isMaker && (
            <button type="button" onClick={() => void proposeChange()} disabled={!!actions.busy} className={BUTTON.primary}>
              <FilePlus2 className="w-3.5 h-3.5" /> {live ? 'Propose a change' : 'Create company profile'}
            </button>
          )}
        </div>
        {live ? (
          <ProfileDetails profile={live} />
        ) : (
          <p className="text-gray-500 italic">No company profile is live yet.{access.isMaker ? ' Create one to send it for approval.' : ''}</p>
        )}
      </div>

      {access.isMaker && (
        <div role="region" aria-label="My drafts" className="apple-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-black dark:text-white">My drafts</h2>
          {drafts.length === 0 ? (
            <p className="text-gray-500">No drafts yet.</p>
          ) : (
            <ul className="divide-y divide-black/10 dark:divide-white/10">
              {drafts.map((draft) => (
                <li key={draft.id} data-testid={`draft-${draft.id}`} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-black dark:text-white">Version {draft.versionNo}</span>
                      <VersionStatusBadge status={draft.status} />
                      <span className="text-gray-400">Updated {formatServerTime(draft.updatedAt ?? draft.createdAt)}</span>
                    </div>
                    {draft.status === 'REJECTED' && draft.reviewComment && (
                      <p className="p-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 break-words">
                        <span className="font-semibold">Rejected by {draft.reviewedBy ?? 'a Level 2 admin'}:</span> {draft.reviewComment}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={companyDraftPath(draft.id)} className={BUTTON.secondary} aria-label={`Edit version ${draft.versionNo}`}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Link>
                    <button
                      type="button"
                      disabled={!!pending || !!actions.busy}
                      title={pending ? PENDING_SUBMIT_BLOCKED : 'Submit for approval'}
                      aria-label={`Submit version ${draft.versionNo}`}
                      onClick={() => void submitDraft(draft)}
                      className={BUTTON.primary}
                    >
                      <Send className="w-3.5 h-3.5" /> Submit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
