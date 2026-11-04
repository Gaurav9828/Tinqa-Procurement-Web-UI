import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { ReasonDialog } from '../../client-demos/components/ReasonDialog';
import { useApplication, useSignedInUsername } from '../hooks/useCareersData';
import { useApplicationActions } from '../hooks/useCareerActions';
import { useResumeMatch } from '../hooks/useResumeMatch';
import type { ApplicationDetail, Interview } from '../types/careers.types';
import { applicationAbilities } from '../utils/applicationAccess';
import { APPLICANTS_PATH, PENDING_KIND_LABELS, formatDate, openingPath } from '../utils/careers';
import { ApplicationStatusBadge, MatchBadge } from '../components/Badges';
import { CandidateCard } from '../components/CandidateCard';
import { ResumePreview } from '../components/ResumePreview';
import { MatchPanel } from '../components/MatchPanel';
import { ApplicationTimeline, EmailList, InterviewsList } from '../components/ApplicationHistory';
import { ApplicationActionPanel, type ApplicationAction } from '../components/ApplicationActionPanel';
import { InterviewDialog, OutcomeDialog, RejectDialog } from '../components/CareerDialogs';

type Dialog =
  | { kind: Exclude<ApplicationAction, 'schedule'> }
  | { kind: 'interview'; interview: Interview | null }
  | { kind: 'cancel-interview'; interview: Interview }
  | { kind: 'outcome'; interview: Interview }
  | null;

type Actions = ReturnType<typeof useApplicationActions>;

/** The open dialog: each asks what its action needs and closes once it worked. */
const ApplicationDialog: React.FC<{ application: ApplicationDetail; dialog: Exclude<Dialog, null>; actions: Actions; onClose: () => void }> = ({
  application: a,
  dialog,
  actions,
  onClose,
}) => {
  const busy = actions.isSubmitting;
  const done = async (result: Promise<ApplicationDetail | null>) => (await result) !== null;
  const kind = a.pending ? PENDING_KIND_LABELS[a.pending.kind].toLowerCase() : 'decision';
  switch (dialog.kind) {
    case 'shortlist':
      return (
        <ReasonDialog title={`Shortlist ${a.fullName}?`} subtitle="A Level 2 approver confirms it; then the candidate is emailed." label="Note for the approver (optional)"
          required={false} confirmLabel="Send for approval" tone="approve" isSubmitting={busy} onClose={onClose} onConfirm={(note) => done(actions.shortlist(a.id, note || null))} />
      );
    case 'select':
      return (
        <ReasonDialog title={`Select ${a.fullName}?`} subtitle="A Level 2 approver confirms it; then the candidate is emailed." label="Note for the approver (optional)"
          required={false} confirmLabel="Send for approval" tone="approve" isSubmitting={busy} onClose={onClose} onConfirm={(note) => done(actions.select(a.id, note || null))} />
      );
    case 'approve':
      return (
        <ReasonDialog title={`Confirm the ${kind}?`} subtitle="The candidate is emailed." label="Note (optional)" required={false} confirmLabel="Approve" tone="approve"
          isSubmitting={busy} onClose={onClose} onConfirm={(note) => done(actions.approve(a.id, note || null))} />
      );
    case 'return':
      return (
        <ReasonDialog title={`Return the ${kind}?`} subtitle="It goes back to the screener with your note; the candidate is not emailed." label="Note" confirmLabel="Return"
          tone="warning" isSubmitting={busy} onClose={onClose} onConfirm={(note) => done(actions.returnDecision(a.id, note))} />
      );
    case 'withdraw':
      return (
        <ReasonDialog title={`Mark ${a.fullName} as withdrawn?`} subtitle="Use this when the candidate pulls out. Scheduled interviews are cancelled." label="Reason"
          confirmLabel="Mark withdrawn" tone="warning" isSubmitting={busy} onClose={onClose} onConfirm={(reason) => done(actions.withdraw(a.id, reason))} />
      );
    case 'reject':
      return <RejectDialog name={a.fullName} busy={busy} onClose={onClose} onConfirm={(reason, notify) => done(actions.reject(a.id, reason, notify))} />;
    case 'interview':
      return (
        <InterviewDialog interview={dialog.interview} roundNumber={a.interviews.length + 1} busy={busy} onClose={onClose}
          onSave={(request) => done(dialog.interview ? actions.reschedule(a.id, dialog.interview.id, request) : actions.schedule(a.id, request))} />
      );
    case 'cancel-interview':
      return (
        <ReasonDialog title={`Cancel ${dialog.interview.roundName}?`} subtitle="The candidate is emailed that it is cancelled." label="Reason" confirmLabel="Cancel interview"
          tone="danger" isSubmitting={busy} onClose={onClose} onConfirm={(reason) => done(actions.cancelInterview(a.id, dialog.interview.id, reason))} />
      );
    case 'outcome':
      return <OutcomeDialog interview={dialog.interview} busy={busy} onClose={onClose} onSave={(outcome) => done(actions.recordOutcome(a.id, dialog.interview.id, outcome))} />;
  }
};

/**
 * One application (/careers/applications/:id): the candidate, the résumé (previewed on demand), the résumé match, the
 * interviews, the timeline and the emails sent, with the actions the signed-in user may take now. One call to load
 * (plus saving the match the first time a screener opens it); the résumé PDF loads only when shown.
 */
export const ApplicationDetailPage: React.FC = () => {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const { can } = useAccess();
  const username = useSignedInUsername();
  const { data: application, isLoading, refresh, replace } = useApplication(Number.isFinite(id) ? id : null);
  const actions = useApplicationActions(replace, refresh);
  const match = useResumeMatch(application, actions.saveMatch);
  const [dialog, setDialog] = useState<Dialog>(null);

  if (!application) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-sm text-gray-500 flex items-center gap-2">
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading the application…</> : 'This application could not be loaded.'}
        <Link to={APPLICANTS_PATH} className="text-[#0071e3] font-semibold hover:underline ml-2">Back</Link>
      </div>
    );
  }

  const abilities = applicationAbilities(application, can, username);
  const act = (action: ApplicationAction) => setDialog(action === 'schedule' ? { kind: 'interview', interview: null } : { kind: action });

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div>
        <Link to={can('CAREER_OPENING_VIEW') ? openingPath(application.opening.id) : APPLICANTS_PATH} className="inline-flex items-center gap-1 text-xs text-[#0071e3] font-semibold hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> {application.opening.title} applicants
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white mt-2 flex flex-wrap items-center gap-2">
          {application.fullName}
          <span className="font-mono text-sm text-gray-400">{application.referenceNumber}</span>
          <ApplicationStatusBadge status={application.status} />
          <MatchBadge match={application.match} />
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Applied for {application.opening.title} (<span className="font-mono">{application.opening.jobCode}</span>) on {formatDate(application.appliedAt)}
        </p>
      </div>

      <ApplicationActionPanel application={application} abilities={abilities} busy={actions.isSubmitting} onAction={act} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <MatchPanel result={match.result} stored={application.match} canRerun={match.canRerun} busy={actions.isSubmitting} onRerun={match.rerun} />
          <ResumePreview application={application} />
          <InterviewsList interviews={application.interviews} canManage={abilities.manageInterviews} busy={actions.isSubmitting}
            onReschedule={(interview) => setDialog({ kind: 'interview', interview })}
            onCancel={(interview) => setDialog({ kind: 'cancel-interview', interview })}
            onOutcome={(interview) => setDialog({ kind: 'outcome', interview })} />
        </div>
        <div className="space-y-5">
          <CandidateCard application={application} />
          <ApplicationTimeline history={application.history} />
          <EmailList emails={application.emails} />
        </div>
      </div>

      {dialog && <ApplicationDialog application={application} dialog={dialog} actions={actions} onClose={() => setDialog(null)} />}
    </div>
  );
};
