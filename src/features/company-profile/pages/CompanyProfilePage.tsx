import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Clock, Eye, FilePlus2, History, Pencil, RefreshCw, Send } from 'lucide-react';
import { useCompanyProfileOverview } from '../hooks/useCompanyProfileData';
import { useCompanyProfileAccess, type CompanyProfileAccess } from '../hooks/useCompanyProfileAccess';
import { useCompanyProfileActions } from '../hooks/useCompanyProfileActions';
import { SectionBadge, SectionDetails, VersionStatusBadge } from '../components/ProfileDisplay';
import { ReviewActions } from '../components/ReviewActions';
import { DeleteDraftButton } from '../components/DeleteDraftButton';
import { EmailSettingsCard } from '../components/EmailSettingsCard';
import { Skeleton, StateMessage } from '../components/Dialogs';
import { BUTTON } from '../utils/companyProfileUi';
import type { CompanyProfileVersion, ProfileSection } from '../types/companyProfile.types';
import { companyDraftPath, companyHistoryPath, companyVersionPath, formatServerTime, pendingSubmitBlocked } from '../utils/companyProfile.utils';
import { PROFILE_SECTIONS, SECTIONS, blockingPending, missingInSection, sectionFromSlug, sectionLabel } from '../utils/companyProfileSections';
import { toForm } from '../utils/companyProfileForm';

/** Settings → Company profile: one tab per section with its live values, its pending change and the maker's drafts. */
export const CompanyProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const access = useCompanyProfileAccess();
  const { overview, isLoading, errorKind, reload } = useCompanyProfileOverview();
  const actions = useCompanyProfileActions({ onStale: reload });

  const section = sectionFromSlug(params.get('section')) ?? PROFILE_SECTIONS[0];
  const live = overview?.live ?? null;
  const pendingChanges = overview?.pendingChanges ?? [];
  const drafts = overview?.myDrafts ?? [];
  // Whole-profile versions (the first profile, or ones made before sections) aren't in any tab.
  const wholePending = pendingChanges.filter((p) => !p.section);
  const wholeDrafts = drafts.filter((d) => !d.section);

  const selectSection = (next: ProfileSection) => setParams({ section: SECTIONS[next].slug }, { replace: true });

  const proposeChange = async (target: ProfileSection) => {
    const result = await actions.createDraft({ copyFromLive: true, section: target });
    if (result.ok && result.version) navigate(companyDraftPath(result.version.id));
  };

  const submitDraft = async (draft: CompanyProfileVersion) => {
    // Incomplete drafts open in the editor, which lists what's missing (a section draft only answers for its own fields).
    if (missingInSection(draft.section, toForm(draft)).length) return navigate(companyDraftPath(draft.id), { state: { submitIntent: true } });
    const result = await actions.submitDraft(draft.id);
    if (result.ok || result.code) void reload();
  };

  if (!overview) {
    if (isLoading) return <Skeleton lines={8} label="Loading company profile" />;
    return <StateMessage variant={errorKind ?? 'unknown'} onRetry={reload} />;
  }

  const sectionPending = pendingChanges.find((p) => p.section === section) ?? null;
  const sectionDrafts = drafts.filter((d) => d.section === section);
  const submitBlocker = (draft: CompanyProfileVersion) => blockingPending(pendingChanges, draft.section);

  return (
    <section aria-label="Company profile" className="p-6 space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0071e3]" /> Company profile
          </h1>
          <p className="text-gray-500 mt-0.5">
            Brand, legal and contact details shown on the storefront and invoices. Each section is changed and approved on its own.
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

      {wholePending.map((pending) => (
        <PendingCard key={pending.id} pending={pending} access={access} live={live} onChanged={reload} />
      ))}

      {!live ? (
        <div role="region" aria-label="Live profile" className="apple-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-black dark:text-white">Live profile</h2>
          <p className="text-gray-500 italic">
            No company profile is live yet.{access.isMaker ? ' Create the first one with every section; after that, each section is changed on its own.' : ''}
          </p>
          {access.isMaker && (
            <button type="button" onClick={() => navigate(companyDraftPath('new'))} disabled={!!actions.busy} className={BUTTON.primary}>
              <FilePlus2 className="w-3.5 h-3.5" /> Create company profile
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-500">
            Live: version {live.versionNo}, approved by {live.reviewedBy ?? 'unknown'} on {formatServerTime(live.reviewedAt)}
          </p>
          <div className="overflow-x-auto">
            <div role="tablist" aria-label="Profile sections" className="inline-flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
              {PROFILE_SECTIONS.map((id) => {
                const waiting = pendingChanges.some((p) => p.section === id);
                const draftCount = drafts.filter((d) => d.section === id).length;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`section-tab-${id}`}
                    aria-selected={section === id}
                    aria-controls="section-panel"
                    onClick={() => selectSection(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                      section === id ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {SECTIONS[id].label}
                    {waiting && <span aria-label="change awaiting approval" className="w-2 h-2 rounded-full bg-amber-500" />}
                    {access.isMaker && draftCount > 0 && (
                      <span aria-label={`${draftCount} of your drafts`} className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-black/10 dark:bg-white/15 text-[10px] font-bold">
                        {draftCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div id="section-panel" role="tabpanel" aria-labelledby={`section-tab-${section}`} className="space-y-4">
            {sectionPending && <PendingCard pending={sectionPending} access={access} live={live} onChanged={reload} />}

            <div role="region" aria-label={`Live ${SECTIONS[section].label}`} className="apple-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-black dark:text-white">{SECTIONS[section].label}</h2>
                    <VersionStatusBadge status={live.status} live />
                  </div>
                  <p className="text-gray-500 max-w-2xl">{SECTIONS[section].description}</p>
                </div>
                {access.isMaker && (
                  <button type="button" onClick={() => void proposeChange(section)} disabled={!!actions.busy} className={`${BUTTON.primary} shrink-0`}>
                    <FilePlus2 className="w-3.5 h-3.5" /> Propose a change
                  </button>
                )}
              </div>
              <SectionDetails section={section} profile={live} />
            </div>

            {access.isMaker && (
              <DraftList
                title={`My ${SECTIONS[section].label} drafts`}
                empty={`No ${SECTIONS[section].label} drafts.`}
                drafts={sectionDrafts}
                access={access}
                busy={!!actions.busy}
                submitBlocker={submitBlocker}
                onSubmit={submitDraft}
                onChanged={reload}
              />
            )}
          </div>
        </div>
      )}

      {access.isMaker && wholeDrafts.length > 0 && (
        <DraftList
          title="Whole-profile drafts"
          note={live ? 'These change every section at once. To change one section, propose a change in its tab instead.' : undefined}
          drafts={wholeDrafts}
          access={access}
          busy={!!actions.busy}
          submitBlocker={submitBlocker}
          onSubmit={submitDraft}
          onChanged={reload}
        />
      )}

      <EmailSettingsCard />
    </section>
  );
};

/** A change waiting for approval: who submitted it, View changes, and Approve / Reject / Withdraw. */
const PendingCard: React.FC<{ pending: CompanyProfileVersion; access: CompanyProfileAccess; live: CompanyProfileVersion | null; onChanged: () => void }> = ({
  pending,
  access,
  live,
  onChanged,
}) => (
  <div role="region" aria-label={`Pending ${sectionLabel(pending.section)} change`} className="apple-card p-5 space-y-3 border-amber-500/40">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-bold text-black dark:text-white">{sectionLabel(pending.section)} change waiting for approval</h2>
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
        <ReviewActions version={pending} access={access} live={live} onStale={onChanged} onDone={() => void onChanged()} />
      </div>
    </div>
    {access.isMaker && (
      <p role="note" className="p-2.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">
        {pending.section
          ? `You can keep editing ${sectionLabel(pending.section)} drafts but can't submit one until this change is approved, rejected or withdrawn. Other sections aren't affected.`
          : "This changes the whole profile: no other change can be submitted until it is approved, rejected or withdrawn."}
      </p>
    )}
  </div>
);

interface DraftListProps {
  title: string;
  empty?: string;
  note?: string;
  drafts: CompanyProfileVersion[];
  access: CompanyProfileAccess;
  busy: boolean;
  submitBlocker: (draft: CompanyProfileVersion) => CompanyProfileVersion | null;
  onSubmit: (draft: CompanyProfileVersion) => void;
  onChanged: () => void;
}

const DraftList: React.FC<DraftListProps> = ({ title, empty, note, drafts, access, busy, submitBlocker, onSubmit, onChanged }) => (
  <div role="region" aria-label={title} className="apple-card p-5 space-y-3">
    <h2 className="text-sm font-bold text-black dark:text-white">{title}</h2>
    {note && <p className="text-gray-500">{note}</p>}
    {drafts.length === 0 ? (
      <p className="text-gray-500">{empty}</p>
    ) : (
      <ul className="divide-y divide-black/10 dark:divide-white/10">
        {drafts.map((draft) => {
          const blocker = submitBlocker(draft);
          return (
            <li key={draft.id} data-testid={`draft-${draft.id}`} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-black dark:text-white">Version {draft.versionNo}</span>
                  <VersionStatusBadge status={draft.status} />
                  {!draft.section && <SectionBadge section={null} />}
                  <span className="text-gray-400">Updated {formatServerTime(draft.updatedAt ?? draft.createdAt)}</span>
                </div>
                {draft.status === 'REJECTED' && draft.reviewComment && (
                  <p className="p-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 break-words">
                    <span className="font-semibold">Rejected by {draft.reviewedBy ?? 'an approver'}:</span> {draft.reviewComment}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={companyDraftPath(draft.id)} className={BUTTON.secondary} aria-label={`Edit version ${draft.versionNo}`}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Link>
                <button
                  type="button"
                  disabled={!!blocker || busy}
                  title={blocker ? pendingSubmitBlocked(sectionLabel(blocker.section)) : 'Submit for approval'}
                  aria-label={`Submit version ${draft.versionNo}`}
                  onClick={() => void onSubmit(draft)}
                  className={BUTTON.primary}
                >
                  <Send className="w-3.5 h-3.5" /> Submit
                </button>
                <DeleteDraftButton version={draft} access={access} onStale={onChanged} onDeleted={() => void onChanged()} />
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
