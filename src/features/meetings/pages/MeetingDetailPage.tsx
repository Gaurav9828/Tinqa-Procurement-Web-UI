import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, Loader2, MapPin, MessageSquareText, Pencil, UserPlus, Video, XCircle } from 'lucide-react';
import { SOLID_TONE, type ActionTone } from '../../../components/ui/actionTones';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useAccess } from '../../../hooks/useAccess';
import { ReasonDialog } from '../../client-demos/components/ReasonDialog';
import { useMeeting } from '../hooks/useMeetingData';
import { useMeetingActions } from '../hooks/useMeetingActions';
import { useNow } from '../hooks/useNow';
import { MeetingStatusBadge } from '../components/MeetingBadges';
import { AttendeeList } from '../components/AttendeeList';
import { InviteDialog } from '../components/InviteDialog';
import { AllFeedbackPanel } from '../components/FeedbackCard';
import type { Attendee, Meeting } from '../types/meeting.types';
import {
  MAX_REASON,
  MEETINGS_TAB_PATH,
  MEETING_TYPE_LABELS,
  MODE_LABELS,
  MY_MEETINGS_PATH,
  canStillDecline,
  feedbackOpenFor,
  formatSpan,
  formatWhen,
  hasStarted,
  joinService,
  meetingEditPath,
  meetingFeedbackPath,
  timeLeft,
} from '../utils/meeting';

type Dialog = { kind: 'cancel' | 'complete' | 'decline' } | { kind: 'invite'; replacing: Attendee | null } | null;

const ActionButton: React.FC<{ label: string; icon: React.ReactNode; tone: ActionTone; disabled?: boolean; title?: string; onClick: () => void }> = ({
  label, icon, tone, disabled, title, onClick,
}) => (
  <button type="button" onClick={onClick} disabled={disabled} title={title}
    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE[tone]}`}>
    {icon} {label}
  </button>
);

const Fact: React.FC<{ label: string; children: React.ReactNode; wide?: boolean }> = ({ label, children, wide }) => (
  <div className={wide ? 'sm:col-span-2' : undefined}>
    <dt className="text-gray-400">{label}</dt>
    <dd className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{children}</dd>
  </div>
);

/** Where I stand on the meeting as an invitee: may I still decline, must I attend, is my feedback asked for. */
const MyAttendance: React.FC<{ meeting: Meeting; now: number; canRespond: boolean; onDecline: () => void }> = ({ meeting, now, canRespond, onDecline }) => {
  const mine = meeting.myAttendance;
  if (!mine || mine.organizer) return null;
  let body: React.ReactNode;
  if (mine.status === 'DECLINED' || mine.status === 'REPLACED') {
    body = <p className="text-rose-600 dark:text-rose-400">You declined{mine.declineReason ? `: ${mine.declineReason}` : '.'}</p>;
  } else if (meeting.status === 'CANCELLED') {
    body = <p className="text-gray-500">The meeting was cancelled; nothing is asked of you.</p>;
  } else if (meeting.status === 'COMPLETED') {
    body = null;
  } else if (canStillDecline(meeting, mine, now)) {
    body = (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-amber-500" />
          You can decline until <strong>{formatWhen(mine.declineDeadline)}</strong> ({timeLeft(mine.declineDeadline ?? '', now)} left), with a reason.
          After that you must attend.
        </p>
        {canRespond && <ActionButton label="Decline" icon={<XCircle className="w-3.5 h-3.5" />} tone="danger" onClick={onDecline} />}
      </div>
    );
  } else {
    body = (
      <p className="text-amber-700 dark:text-amber-400 font-semibold">
        You must attend: the time to decline ended {formatWhen(mine.declineDeadline)}.
      </p>
    );
  }
  if (!body) return null;
  return <section className="apple-card p-4 text-xs" aria-label="Your attendance">{body}</section>;
};

/**
 * /meetings/:id: one meeting with everything about it, its join or map link, and its attendees. The organiser edits,
 * cancels, invites (also in place of a decliner), marks it completed once it has started and reads all feedback. An
 * invitee declines here before the deadline, and gives feedback once it is completed.
 */
export const MeetingDetailPage: React.FC = () => {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const { can } = useAccess();
  const now = useNow();
  const { data: meeting, isLoading, refresh, replace } = useMeeting(Number.isFinite(id) ? id : null);
  const actions = useMeetingActions(replace, refresh);
  const [dialog, setDialog] = useState<Dialog>(null);
  const backPath = can('MEETING_VIEW_ALL') ? MEETINGS_TAB_PATH : MY_MEETINGS_PATH;

  if (!meeting) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-sm text-gray-500 flex items-center gap-2">
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading the meeting…</> : 'This meeting could not be loaded.'}
        <Link to={backPath} className="text-[#0071e3] font-semibold hover:underline ml-2">Back</Link>
      </div>
    );
  }

  const manages = meeting.canManage && can('MEETING_SCHEDULE');
  const scheduled = meeting.status === 'SCHEDULED';
  const started = hasStarted(meeting, now);
  const canRespond = can('MEETING_RESPOND_OWN');
  const feedbackAsked = feedbackOpenFor(meeting) && canRespond;
  const showAllFeedback = meeting.status === 'COMPLETED' && (meeting.canManage || can('MEETING_VIEW_ALL'));
  const taken = meeting.attendees.filter((attendee) => attendee.status !== 'REPLACED').map((attendee) => attendee.employeeId);
  const asked = meeting.attendees.filter((attendee) => attendee.status === 'INVITED').length;
  const done = async (result: Promise<boolean>) => result;

  return (
    <div className="space-y-5 p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={backPath} className="inline-flex items-center gap-1 text-xs text-[#0071e3] font-semibold hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> {backPath === MY_MEETINGS_PATH ? 'Back to my meetings' : 'Back to meetings'}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white mt-2 flex flex-wrap items-center gap-2">
            {meeting.title}
            <span className="font-mono text-sm text-gray-400">{meeting.code}</span>
            <MeetingStatusBadge status={meeting.status} />
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {MODE_LABELS[meeting.mode]} · {MEETING_TYPE_LABELS[meeting.meetingType]} · {formatSpan(meeting.startsAt, meeting.endsAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {feedbackAsked && (
            <Link to={meetingFeedbackPath(meeting.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${meeting.myAttendance?.feedbackSubmittedAt ? SOLID_TONE.primary : SOLID_TONE.approve}`}>
              <MessageSquareText className="w-3.5 h-3.5" /> {meeting.myAttendance?.feedbackSubmittedAt ? 'Your feedback' : 'Give feedback'}
            </Link>
          )}
          {manages && scheduled && (
            <>
              <ActionButton label="Edit" icon={<Pencil className="w-3.5 h-3.5" />} tone="primary" disabled={actions.isSubmitting}
                onClick={() => navigate(meetingEditPath(meeting.id))} />
              <ActionButton label="Invite more" icon={<UserPlus className="w-3.5 h-3.5" />} tone="primary" disabled={actions.isSubmitting}
                onClick={() => setDialog({ kind: 'invite', replacing: null })} />
              <ActionButton label="Mark completed" icon={<CheckCircle2 className="w-3.5 h-3.5" />} tone="approve" disabled={actions.isSubmitting || !started}
                title={started ? undefined : `It starts ${formatWhen(meeting.startsAt)}.`} onClick={() => setDialog({ kind: 'complete' })} />
              <ActionButton label="Cancel meeting" icon={<XCircle className="w-3.5 h-3.5" />} tone="danger" disabled={actions.isSubmitting}
                onClick={() => setDialog({ kind: 'cancel' })} />
            </>
          )}
        </div>
      </div>

      {meeting.status === 'CANCELLED' && meeting.cancelReason && (
        <p className="apple-card p-4 text-xs text-rose-600 dark:text-rose-400">Cancelled: {meeting.cancelReason}</p>
      )}
      <MyAttendance meeting={meeting} now={now} canRespond={canRespond} onDecline={() => setDialog({ kind: 'decline' })} />

      <section className="apple-card p-5 space-y-4">
        {meeting.mode === 'ONLINE' && meeting.joinUrl && (
          <a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold">
            <Video className="w-4 h-4" /> Join on {joinService(meeting.joinUrl)} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {meeting.mode === 'IN_PERSON' && (
            <>
              <Fact label="Place">{meeting.placeName ?? '—'}</Fact>
              <Fact label="Map">
                {meeting.googleMapsUrl ? (
                  <a href={meeting.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0071e3] font-semibold hover:underline">
                    <MapPin className="w-3.5 h-3.5" /> Open in Google Maps
                  </a>
                ) : '—'}
              </Fact>
              <Fact label="Address" wide>{meeting.address ?? '—'}</Fact>
            </>
          )}
          {meeting.mode === 'ONLINE' && <Fact label="Join link" wide><span className="break-all">{meeting.joinUrl ?? '—'}</span></Fact>}
          <Fact label="Subject" wide>{meeting.subject ?? '—'}</Fact>
          <Fact label="Description" wide>{meeting.description ?? '—'}</Fact>
          <Fact label="Client / business">{meeting.clientName ?? '—'}</Fact>
          <Fact label="Contact">{meeting.clientContact ?? '—'}</Fact>
          <Fact label="About the client" wide>{meeting.clientDescription ?? '—'}</Fact>
          <Fact label="Organiser">{meeting.organizerName}</Fact>
          <Fact label="Scheduled">{formatWhen(meeting.createdAt)}</Fact>
          {meeting.completedAt && <Fact label="Completed">{formatWhen(meeting.completedAt)}</Fact>}
        </dl>
      </section>

      <section className="apple-card p-5 space-y-2">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Attendees <span className="font-normal text-gray-400">· {meeting.attendeeCount}</span>
        </h2>
        <p className="text-[11px] text-gray-400">Each invitee may decline within 24 hours of being invited (never after the start); after that they must attend.</p>
        <AttendeeList attendees={meeting.attendees} showFeedback={meeting.status === 'COMPLETED'}
          onReplace={manages && scheduled ? (attendee) => setDialog({ kind: 'invite', replacing: attendee }) : undefined} />
      </section>

      {showAllFeedback && <AllFeedbackPanel meetingId={meeting.id} given={meeting.feedbackCount} asked={asked} />}

      {dialog?.kind === 'cancel' && (
        <ReasonDialog title="Cancel this meeting?" subtitle="Every attendee is emailed and told in the app." label="Reason" maxLength={MAX_REASON}
          confirmLabel="Cancel meeting" tone="danger" isSubmitting={actions.isSubmitting} onClose={() => setDialog(null)}
          onConfirm={(reason) => done(actions.cancel(meeting.id, reason))} />
      )}
      {dialog?.kind === 'decline' && (
        <ReasonDialog title="Decline this meeting?" subtitle={`The organiser, ${meeting.organizerName}, is told and may invite someone else.`} label="Reason"
          maxLength={MAX_REASON} confirmLabel="Decline" tone="danger" isSubmitting={actions.isSubmitting} onClose={() => setDialog(null)}
          onConfirm={(reason) => done(actions.decline(meeting.id, reason))} />
      )}
      {dialog?.kind === 'complete' && (
        <ConfirmationModal isOpen actionType="CONFIRM" title="Mark this meeting completed?" tone="approve" confirmLabel="Mark completed"
          description="Every attendee who did not decline, you included, is asked for feedback. The meeting can no longer be changed."
          isSubmitting={actions.isSubmitting} onClose={() => setDialog(null)}
          onConfirm={async () => {
            if (await actions.complete(meeting.id)) setDialog(null);
          }} />
      )}
      {dialog?.kind === 'invite' && (
        <InviteDialog meeting={meeting} replacing={dialog.replacing} taken={taken} isSubmitting={actions.isSubmitting} onClose={() => setDialog(null)}
          onInvite={(employeeIds) => actions.invite(meeting.id, employeeIds, dialog.replacing?.id ?? null)} />
      )}
    </div>
  );
};
