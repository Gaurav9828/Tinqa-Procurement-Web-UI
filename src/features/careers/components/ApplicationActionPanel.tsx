import React from 'react';
import { CalendarPlus, CheckCircle2, Info, ListChecks, Trophy, Undo2, UserMinus, XCircle } from 'lucide-react';
import type { ApplicationDetail } from '../types/careers.types';
import type { ApplicationAbilities } from '../utils/applicationAccess';
import { PENDING_KIND_LABELS, formatDateTime } from '../utils/careers';
import { ActionButton } from './CareersUi';

export type ApplicationAction = 'shortlist' | 'schedule' | 'select' | 'reject' | 'withdraw' | 'approve' | 'return';

/** What happens next, in a line, for the status the application is in. */
const nextStep = (application: ApplicationDetail): string => {
  switch (application.status) {
    case 'APPLIED':
      return 'Screen the résumé. Shortlisting sends it to a Level 2 approver; the candidate hears from us once it is confirmed.';
    case 'SHORTLIST_PENDING':
      return 'Waiting for a Level 2 approver to confirm the shortlist.';
    case 'SHORTLISTED':
      return 'Shortlist confirmed. Schedule the first interview.';
    case 'INTERVIEWING':
      return 'Record each interview’s outcome. Once one is passed, select the candidate; a Level 2 approver confirms it.';
    case 'SELECTION_PENDING':
      return 'Waiting for a Level 2 approver to confirm the selection.';
    case 'SELECTED':
      return 'Selected. The candidate has been emailed.';
    case 'REJECTED':
      return 'Rejected.';
    case 'WITHDRAWN':
      return 'Withdrawn by the candidate.';
  }
};

/**
 * The buttons for what the signed-in user may do now (each gated by its permission, applicationAbilities), and the
 * waiting decision with who asked for it. An approver who asked for it themself is told someone else confirms it.
 */
export const ApplicationActionPanel: React.FC<{
  application: ApplicationDetail;
  abilities: ApplicationAbilities;
  busy: boolean;
  onAction: (action: ApplicationAction) => void;
}> = ({ application, abilities, busy, onAction }) => {
  const icon = 'w-3.5 h-3.5';
  const { pending } = application;
  return (
    <section aria-label="Next step" className="apple-card p-5 space-y-3 text-xs">
      <p className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#0071e3]" /> {nextStep(application)}
      </p>
      {pending && (
        <div className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 space-y-0.5">
          <p className="font-semibold">
            {PENDING_KIND_LABELS[pending.kind]} asked by {pending.requestedBy} on {formatDateTime(pending.requestedAt)}
          </p>
          {pending.note && <p className="whitespace-pre-line break-words">“{pending.note}”</p>}
        </div>
      )}
      {abilities.ownRequest && (
        <p className="text-amber-700 dark:text-amber-400">You asked for this {pending ? PENDING_KIND_LABELS[pending.kind].toLowerCase() : 'decision'}, so another Level 2 approver confirms or returns it.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {abilities.decide && (
          <>
            <ActionButton label={`Approve ${pending ? PENDING_KIND_LABELS[pending.kind].toLowerCase() : ''}`.trim()} icon={<CheckCircle2 className={icon} />} tone="approve"
              disabled={busy} onClick={() => onAction('approve')} />
            <ActionButton label="Return" icon={<Undo2 className={icon} />} tone="warning" disabled={busy} onClick={() => onAction('return')} />
          </>
        )}
        {abilities.shortlist && <ActionButton label="Shortlist" icon={<ListChecks className={icon} />} tone="approve" disabled={busy} onClick={() => onAction('shortlist')} />}
        {abilities.scheduleInterview && (
          <ActionButton label="Schedule interview" icon={<CalendarPlus className={icon} />} tone="primary" disabled={busy} onClick={() => onAction('schedule')} />
        )}
        {abilities.select && (
          <ActionButton label="Select" icon={<Trophy className={icon} />} tone="approve" disabled={busy || !!abilities.selectBlockedReason}
            title={abilities.selectBlockedReason ?? undefined} onClick={() => onAction('select')} />
        )}
        {abilities.withdraw && <ActionButton label="Mark withdrawn" icon={<UserMinus className={icon} />} tone="warning" disabled={busy} onClick={() => onAction('withdraw')} />}
        {abilities.reject && <ActionButton label="Reject" icon={<XCircle className={icon} />} tone="danger" disabled={busy} onClick={() => onAction('reject')} />}
      </div>
      {abilities.select && abilities.selectBlockedReason && <p className="text-gray-500">Select: {abilities.selectBlockedReason}</p>}
    </section>
  );
};
