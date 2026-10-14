import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-react';
import { useCompanyProfileVersion } from '../hooks/useCompanyProfileData';
import { useCompanyProfileAccess } from '../hooks/useCompanyProfileAccess';
import { ProfileDetails, VersionStatusBadge } from '../components/ProfileDisplay';
import { AuditTrail, ChangesTable } from '../components/VersionHistoryParts';
import { ReviewActions } from '../components/ReviewActions';
import { Skeleton, StateMessage } from '../components/Dialogs';
import { BUTTON } from '../utils/companyProfileUi';
import { COMPANY_PROFILE_PATH, companyDraftPath, formatServerTime } from '../utils/companyProfile.utils';

const Meta: React.FC<{ label: string; who: string | null; when: string | null }> = ({ label, who, when }) =>
  who || when ? (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
      <dd className="text-black dark:text-white">
        {who ?? '—'} · {formatServerTime(when)}
      </dd>
    </div>
  ) : null;

/** Review screen: /settings/company-profile/versions/:id — changes vs live, full proposal, audit trail, actions. */
export const CompanyProfileReviewPage: React.FC = () => {
  const { id: idParam = '' } = useParams<{ id: string }>();
  const id = Number(idParam) || null;
  const navigate = useNavigate();
  const access = useCompanyProfileAccess();
  const { version, isLoading, errorKind, reload } = useCompanyProfileVersion(id);

  if (!id) return <StateMessage variant="notFound" />;
  if (!version) {
    if (isLoading) return <Skeleton lines={10} label="Loading version" />;
    return <StateMessage variant={errorKind ?? 'unknown'} onRetry={reload} />;
  }

  return (
    <section aria-label={`Company profile version ${version.versionNo}`} className="p-6 space-y-6 text-xs max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate(COMPANY_PROFILE_PATH)} className="p-2 rounded-xl bg-black/5 dark:bg-white/10 cursor-pointer" aria-label="Back to company profile">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="space-y-2">
            <h1 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
              Version {version.versionNo} <VersionStatusBadge status={version.status} />
            </h1>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Meta label="Created" who={version.createdBy} when={version.createdAt} />
              <Meta label="Submitted" who={version.submittedBy} when={version.submittedAt} />
              <Meta label="Reviewed" who={version.reviewedBy} when={version.reviewedAt} />
            </dl>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void reload()} className={BUTTON.secondary} aria-label="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {access.canEdit(version) && (
            <Link to={companyDraftPath(version.id)} className={BUTTON.secondary}>
              <Pencil className="w-3.5 h-3.5" /> Edit draft
            </Link>
          )}
          <ReviewActions
            version={version}
            access={access}
            onStale={reload}
            onDone={(_, action) => (action === 'withdraw' ? void reload() : navigate(COMPANY_PROFILE_PATH))}
          />
        </div>
      </div>

      {version.reviewComment && (
        <div role="note" className={`p-4 rounded-2xl border ${version.status === 'REJECTED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10'}`}>
          <p className="font-semibold">Reviewer comment</p>
          <p className="break-words whitespace-pre-line">{version.reviewComment}</p>
        </div>
      )}

      <div role="region" aria-label="Changes vs live" className="apple-card">
        <h2 className="text-sm font-bold text-black dark:text-white px-5 pt-5">Changes vs live</h2>
        <ChangesTable changes={version.changes} />
      </div>

      <div role="region" aria-label="Proposed profile" className="apple-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-black dark:text-white">{version.status === 'APPROVED' ? 'Profile' : 'Proposed profile'}</h2>
        <ProfileDetails profile={version} />
      </div>

      <div role="region" aria-label="Audit trail section" className="apple-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-black dark:text-white">Audit trail</h2>
        <AuditTrail entries={version.auditTrail} />
      </div>
    </section>
  );
};
