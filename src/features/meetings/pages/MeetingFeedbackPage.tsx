import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import { useMeeting, useMyFeedback } from '../hooks/useMeetingData';
import { useMeetingActions } from '../hooks/useMeetingActions';
import { FeedbackCard } from '../components/FeedbackCard';
import type { Meeting, MeetingFeedback, MeetingRating, MeetingType } from '../types/meeting.types';
import { MEETING_TYPES, MEETING_TYPE_LABELS, MY_MEETINGS_PATH, RATINGS, RATING_LABELS, feedbackOpenFor, formatSpan, meetingPath } from '../utils/meeting';
import { LIMITS, emptyFeedbackForm, feedbackPayload, validateFeedbackForm, type FeedbackForm, type FeedbackFormErrors } from '../utils/meetingForm';

const RATING_TONE: Record<MeetingRating, 'approve' | 'primary' | 'warning' | 'danger'> = {
  EXCELLENT: 'approve',
  GOOD: 'approve',
  AVERAGE: 'warning',
  BAD: 'danger',
  WORSE: 'danger',
};

/** The feedback form: agenda, feedback, decisions, deal confirmed, meeting type and rating. Final once sent. */
const FeedbackFormView: React.FC<{ meeting: Meeting; onSaved: (feedback: MeetingFeedback) => void }> = ({ meeting, onSaved }) => {
  const [form, setForm] = useState<FeedbackForm>(() => emptyFeedbackForm(meeting.meetingType));
  const [errors, setErrors] = useState<FeedbackFormErrors>({});
  const actions = useMeetingActions(() => undefined, () => undefined);

  const set = <K extends keyof FeedbackForm>(key: K, value: FeedbackForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actions.isSubmitting) return;
    const found = validateFeedbackForm(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    const payload = feedbackPayload(form);
    const saved = await actions.submitFeedback(meeting.id, payload);
    if (saved) onSaved(saved.submittedAt ? saved : { ...payload, submittedAt: new Date().toISOString() });
  };

  return (
    <form onSubmit={send} noValidate className="apple-card p-5 space-y-4">
      <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5" /> Your feedback is final once sent; it can't be changed afterwards.
      </p>
      <CommonTextArea label="Agenda" required rows={2} value={form.agenda} maxLength={LIMITS.feedbackText} error={errors.agenda}
        placeholder="What the meeting was for" onChange={(e) => set('agenda', e.target.value)} />
      <CommonTextArea label="Feedback" required rows={4} value={form.feedback} maxLength={LIMITS.feedbackText} error={errors.feedback}
        placeholder="How it went, the other side’s response, concerns" onChange={(e) => set('feedback', e.target.value)} />
      <CommonTextArea label="What was decided" required rows={3} value={form.decisions} maxLength={LIMITS.feedbackText} error={errors.decisions}
        placeholder="Decisions, next steps and who does them" onChange={(e) => set('decisions', e.target.value)} />

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500">Deal confirmed? <span className="text-red-500 font-bold">*</span></p>
        <div role="radiogroup" aria-label="Deal confirmed" className="flex gap-2">
          {([[true, 'Yes', 'approve'], [false, 'No', 'danger']] as const).map(([value, label, tone]) => (
            <button key={label} type="button" role="radio" aria-checked={form.dealConfirmed === value} onClick={() => set('dealConfirmed', value)}
              className={`px-4 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${form.dealConfirmed === value ? CHOICE_TONE[tone].active : CHOICE_TONE[tone].idle}`}>
              {label}
            </button>
          ))}
        </div>
        {errors.dealConfirmed && <p className="text-[11px] text-red-500">{errors.dealConfirmed}</p>}
      </div>
      <CommonTextArea label="Deal notes" rows={2} value={form.dealNotes} maxLength={LIMITS.dealNotes}
        placeholder={form.dealConfirmed ? 'What was agreed: products, quantities, value' : 'Why not yet, or what would close it'}
        onChange={(e) => set('dealNotes', e.target.value)} />

      <CommonSelect label="Meeting type" required value={form.meetingType}
        options={MEETING_TYPES.map((value) => ({ value, label: MEETING_TYPE_LABELS[value] }))}
        onChange={(e) => set('meetingType', e.target.value as MeetingType)} />

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500">How was the meeting? <span className="text-red-500 font-bold">*</span></p>
        <div role="radiogroup" aria-label="Rating" className="flex flex-wrap gap-2">
          {RATINGS.map((rating) => (
            <button key={rating} type="button" role="radio" aria-checked={form.rating === rating} onClick={() => set('rating', rating)}
              className={`px-4 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                form.rating === rating ? CHOICE_TONE[RATING_TONE[rating]].active : CHOICE_TONE[RATING_TONE[rating]].idle}`}>
              {RATING_LABELS[rating]}
            </button>
          ))}
        </div>
        {errors.rating && <p className="text-[11px] text-red-500">{errors.rating}</p>}
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={actions.isSubmitting}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE.approve}`}>
          {actions.isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Send feedback
        </button>
      </div>
    </form>
  );
};

/**
 * /meetings/:id/feedback (MEETING_RESPOND_OWN; the link in the feedback-request email): my feedback on a completed
 * meeting I attended. The form until it is sent, then read-only. My earlier feedback is asked for only when the
 * meeting says I gave it.
 */
export const MeetingFeedbackPage: React.FC = () => {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const valid = Number.isFinite(id);
  const meeting = useMeeting(valid ? id : null);
  const data = meeting.data;
  const given = !!data?.myAttendance?.feedbackSubmittedAt;
  const earlier = useMyFeedback(id, valid && given);
  const [sent, setSent] = useState<MeetingFeedback | null>(null);
  const feedback = sent ?? earlier.data;

  let body: React.ReactNode;
  if (!data) {
    body = meeting.isLoading
      ? <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading the meeting…</p>
      : <p className="text-sm text-gray-500">This meeting could not be loaded.</p>;
  } else if (feedback) {
    body = (
      <section className="space-y-3">
        <p className="text-xs text-gray-500 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Your feedback is saved and final.</p>
        <FeedbackCard feedback={feedback} />
      </section>
    );
  } else if (given) {
    body = earlier.isLoading
      ? <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading your feedback…</p>
      : <p className="text-sm text-gray-500">You already gave your feedback; it could not be loaded.</p>;
  } else if (feedbackOpenFor(data)) {
    body = <FeedbackFormView meeting={data} onSaved={setSent} />;
  } else {
    body = (
      <p className="apple-card p-5 text-sm text-gray-500">
        {data.status === 'COMPLETED'
          ? 'Feedback is asked only of the people who attended.'
          : 'Feedback opens once the organiser marks the meeting completed.'}
      </p>
    );
  }

  return (
    <div className="space-y-5 p-6 max-w-3xl mx-auto">
      <div>
        <Link to={data ? meetingPath(data.id) : MY_MEETINGS_PATH} className="inline-flex items-center gap-1 text-xs text-[#0071e3] font-semibold hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> {data ? 'Back to the meeting' : 'Back to my meetings'}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white mt-2">Meeting feedback</h1>
        {data && (
          <p className="text-gray-500 text-sm mt-0.5">
            {data.title} <span className="font-mono text-xs text-gray-400">{data.code}</span> · {formatSpan(data.startsAt, data.endsAt)}
          </p>
        )}
      </div>
      {body}
    </div>
  );
};
