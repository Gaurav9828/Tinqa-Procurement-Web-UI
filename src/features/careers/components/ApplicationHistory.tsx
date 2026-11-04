import React from 'react';
import { CalendarClock, History, Mail, MapPin, Phone, Video } from 'lucide-react';
import type { EmailRecord, HistoryEntry, Interview } from '../types/careers.types';
import { APPLICATION_STATUS_LABELS, INTERVIEW_MODE_LABELS, OUTCOME_LABELS, formatDateTime } from '../utils/careers';
import { isOnline } from '../utils/interviewForm';
import { ActionButton } from './CareersUi';

const DOT: Partial<Record<string, string>> = {
  SELECTED: 'bg-emerald-500',
  SHORTLISTED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
  WITHDRAWN: 'bg-gray-400',
  SHORTLIST_PENDING: 'bg-amber-500',
  SELECTION_PENDING: 'bg-amber-500',
  INTERVIEWING: 'bg-purple-500',
};

const actionText = (action: string) => action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, ' ');

/** Everything that happened to the application, oldest first as the server keeps it, shown newest first. */
export const ApplicationTimeline: React.FC<{ history: HistoryEntry[] }> = ({ history }) => (
  <section aria-label="Timeline" className="apple-card p-5 space-y-3 text-xs">
    <h2 className="text-sm font-semibold flex items-center gap-2">
      <History className="w-4 h-4 text-[#0071e3]" /> Timeline
    </h2>
    {history.length === 0 ? (
      <p className="text-gray-500">Nothing yet.</p>
    ) : (
      <ol className="space-y-3">
        {[...history].reverse().map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="flex gap-3">
            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${DOT[entry.toStatus ?? ''] ?? 'bg-blue-400'}`} aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {actionText(entry.action)}
                {entry.toStatus && entry.toStatus !== entry.fromStatus && <span className="font-normal text-gray-500"> → {APPLICATION_STATUS_LABELS[entry.toStatus] ?? entry.toStatus}</span>}
                <span className="font-normal text-gray-400"> · {entry.actor ?? 'Candidate'} · {formatDateTime(entry.at)}</span>
              </p>
              {entry.note && <p className="text-gray-600 dark:text-gray-400 break-words whitespace-pre-line">{entry.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    )}
  </section>
);

const emailStatusText = (email: EmailRecord) => {
  if (email.status === 'SENT') return `Sent ${formatDateTime(email.sentAt)}`;
  return email.status === 'FAILED' ? 'Failed' : 'Waiting to send';
};

const EMAIL_TONE: Record<EmailRecord['status'], string> = {
  SENT: 'text-emerald-600 dark:text-emerald-400',
  PENDING: 'text-amber-600 dark:text-amber-400',
  FAILED: 'text-rose-600 dark:text-rose-400',
};

/** The emails sent to the candidate and whether each went out. */
export const EmailList: React.FC<{ emails: EmailRecord[] }> = ({ emails }) => (
  <section aria-label="Emails to the candidate" className="apple-card p-5 space-y-3 text-xs">
    <h2 className="text-sm font-semibold flex items-center gap-2">
      <Mail className="w-4 h-4 text-[#0071e3]" /> Emails to the candidate
    </h2>
    {emails.length === 0 ? (
      <p className="text-gray-500">None yet.</p>
    ) : (
      <ul className="divide-y divide-black/5 dark:divide-white/5">
        {emails.map((email, index) => (
          <li key={`${email.createdAt}-${index}`} className="py-1.5 flex justify-between gap-3">
            <span className="break-words">{email.subject}</span>
            <span className={`whitespace-nowrap font-semibold ${EMAIL_TONE[email.status]}`}>
              {emailStatusText(email)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const ModeIcon: React.FC<{ interview: Interview }> = ({ interview }) => {
  if (isOnline(interview.mode)) return <Video className="w-3.5 h-3.5" />;
  return interview.mode === 'PHONE' ? <Phone className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />;
};

const statusLine = (interview: Interview) => {
  if (interview.status === 'CANCELLED') return interview.cancelReason ? `Cancelled: ${interview.cancelReason}` : 'Cancelled';
  if (interview.status === 'COMPLETED') {
    const outcome = interview.outcome ? OUTCOME_LABELS[interview.outcome] : 'Completed';
    return interview.rating ? `${outcome} · ${interview.rating}/5` : outcome;
  }
  return 'Scheduled';
};

const STATUS_TONE: Record<Interview['status'], string> = {
  SCHEDULED: 'text-purple-600 dark:text-purple-400',
  COMPLETED: 'text-emerald-600 dark:text-emerald-400',
  CANCELLED: 'text-gray-400',
};

/**
 * The interviews, newest first. They happen on Teams, Meet, Zoom, by phone or in person, not in TinQa; each scheduled
 * one can be rescheduled, cancelled or given its outcome.
 */
export const InterviewsList: React.FC<{
  interviews: Interview[];
  canManage: boolean;
  busy: boolean;
  onReschedule: (interview: Interview) => void;
  onCancel: (interview: Interview) => void;
  onOutcome: (interview: Interview) => void;
}> = ({ interviews, canManage, busy, onReschedule, onCancel, onOutcome }) => (
  <section aria-label="Interviews" className="apple-card p-5 space-y-3 text-xs">
    <h2 className="text-sm font-semibold flex items-center gap-2">
      <CalendarClock className="w-4 h-4 text-[#0071e3]" /> Interviews
    </h2>
    {interviews.length === 0 ? (
      <p className="text-gray-500">None scheduled.</p>
    ) : (
      <ul className="space-y-3">
        {interviews.map((interview) => (
          <li key={interview.id} className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {interview.roundName}
                {interview.revision > 0 && <span className="font-normal text-gray-400"> · rescheduled {interview.revision}×</span>}
              </p>
              <span className={`font-semibold ${STATUS_TONE[interview.status]}`}>{statusLine(interview)}</span>
            </div>
            <p className="flex flex-wrap items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <ModeIcon interview={interview} /> {INTERVIEW_MODE_LABELS[interview.mode]} · {formatDateTime(interview.startsAt)} ({interview.timeZone}) ·{' '}
              {interview.durationMinutes} min
            </p>
            {interview.meetingLink && /^https:\/\//i.test(interview.meetingLink) && (
              <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="text-[#0071e3] hover:underline break-all">{interview.meetingLink}</a>
            )}
            {interview.location && <p className="text-gray-600 dark:text-gray-300">{interview.location}</p>}
            {interview.interviewers && <p className="text-gray-500">Interviewers: {interview.interviewers}</p>}
            {interview.feedback && <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line break-words">Feedback: {interview.feedback}</p>}
            <p className="text-gray-400">Scheduled by {interview.scheduledBy ?? '—'}{interview.scheduledAt ? `, ${formatDateTime(interview.scheduledAt)}` : ''}</p>
            {canManage && interview.status === 'SCHEDULED' && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <ActionButton small label="Record outcome" tone="approve" disabled={busy} onClick={() => onOutcome(interview)} />
                <ActionButton small label="Reschedule" tone="primary" disabled={busy} onClick={() => onReschedule(interview)} />
                <ActionButton small label="Cancel interview" tone="danger" disabled={busy} onClick={() => onCancel(interview)} />
              </div>
            )}
          </li>
        ))}
      </ul>
    )}
  </section>
);
