import React, { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { MeetingFeedback } from '../types/meeting.types';
import { MEETING_TYPE_LABELS, RATING_LABELS, formatWhen } from '../utils/meeting';
import { useAllFeedback } from '../hooks/useMeetingData';

const RATING_TONE: Record<MeetingFeedback['rating'], string> = {
  EXCELLENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  GOOD: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  AVERAGE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  BAD: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  WORSE: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-gray-400">{label}</dt>
    <dd className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{children}</dd>
  </div>
);

/** One attendee's feedback, read-only (it is final once given). */
export const FeedbackCard: React.FC<{ feedback: MeetingFeedback }> = ({ feedback }) => (
  <article className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3 text-xs"
    aria-label={feedback.attendeeName ? `Feedback from ${feedback.attendeeName}` : 'Your feedback'}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-semibold text-gray-800 dark:text-gray-200">{feedback.attendeeName ?? 'Your feedback'}</p>
      <span className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${RATING_TONE[feedback.rating]}`}>{RATING_LABELS[feedback.rating]}</span>
        <span className="text-[10px] text-gray-400">{formatWhen(feedback.submittedAt)}</span>
      </span>
    </div>
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Row label="Agenda">{feedback.agenda}</Row>
      <Row label="What was decided">{feedback.decisions}</Row>
      <div className="sm:col-span-2"><Row label="Feedback">{feedback.feedback}</Row></div>
      <Row label="Deal confirmed">{feedback.dealConfirmed ? 'Yes' : 'No'}{feedback.dealNotes && ` · ${feedback.dealNotes}`}</Row>
      <Row label="Meeting type">{MEETING_TYPE_LABELS[feedback.meetingType]}</Row>
    </dl>
  </article>
);

/**
 * Every attendee's feedback on a completed meeting (the organiser, or MEETING_VIEW_ALL). Collapsed until opened, and
 * loaded only then.
 */
export const AllFeedbackPanel: React.FC<{ meetingId: number; given: number; asked: number }> = ({ meetingId, given, asked }) => {
  const [open, setOpen] = useState(false);
  const all = useAllFeedback(meetingId, open);
  const list = all.data ?? [];
  let body: React.ReactNode = null;
  if (open && all.isLoading) body = <p className="text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading feedback…</p>;
  else if (open && list.length === 0) body = <p className="text-xs text-gray-500">{all.loadFailed ? 'The feedback could not be loaded.' : 'No feedback yet.'}</p>;
  else if (open) body = list.map((feedback, index) => <FeedbackCard key={`${feedback.attendeeName ?? ''}-${index}`} feedback={feedback} />);

  return (
    <section className="apple-card p-5 space-y-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
        <span>Feedback <span className="font-normal text-gray-400">· {given} of {asked} given</span></span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {body}
    </section>
  );
};
