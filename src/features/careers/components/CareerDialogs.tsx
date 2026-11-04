import React, { useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { CommonCheckbox, CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { CHOICE_TONE, SOLID_TONE, type ActionTone } from '../../../components/ui/actionTones';
import { DialogShell } from '../../finance/components/DialogShell';
import { TimeSelect } from '../../client-demos/components/TimeSelect';
import type { Interview, InterviewMode, InterviewOutcome, InterviewRequest, OutcomeRequest } from '../types/careers.types';
import { INTERVIEW_MODE_LABELS, OUTCOME_LABELS, todayIso } from '../utils/careers';
import {
  DURATION_OPTIONS,
  TIME_ZONES,
  emptyInterviewForm,
  interviewToForm,
  isOnline,
  nowIn,
  toInterviewRequest,
  validateInterview,
  type InterviewErrors,
  type InterviewForm,
} from '../utils/interviewForm';

const Buttons: React.FC<{ busy: boolean; label: string; tone: ActionTone; onBack: () => void }> = ({ busy, label, tone, onBack }) => (
  <div className="flex justify-end gap-2">
    <button type="button" onClick={onBack} disabled={busy}
      className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 font-semibold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
      Back
    </button>
    <button type="submit" disabled={busy} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE[tone]}`}>
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {label}
    </button>
  </div>
);

/** Reject with a reason; the candidate is emailed unless unticked. Closes only when it worked. */
export const RejectDialog: React.FC<{ name: string; busy: boolean; onClose: () => void; onConfirm: (reason: string, notify: boolean) => Promise<boolean> }> = ({
  name,
  busy,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    if (await onConfirm(reason.trim(), notify)) onClose();
  };
  return (
    <DialogShell title={`Reject ${name}?`} subtitle="Any scheduled interviews are cancelled. The reason stays in the timeline." disabled={busy} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <CommonTextArea label="Reason" required maxLength={500} value={reason} error={error} placeholder="e.g. Needs more hands-on CNC experience"
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }} />
        <CommonCheckbox label="Email the candidate that we are not moving forward" checked={notify} onChange={setNotify} />
        <Buttons busy={busy} label="Reject" tone="danger" onBack={onClose} />
      </form>
    </DialogShell>
  );
};

const MODES = Object.keys(INTERVIEW_MODE_LABELS) as InterviewMode[];

const LINK_HINT: Partial<Record<InterviewMode, string>> = {
  TEAMS: 'https://teams.microsoft.com/l/meetup-join/…',
  GOOGLE_MEET: 'https://meet.google.com/abc-defg-hij',
  ZOOM: 'https://us02web.zoom.us/j/…',
};

/**
 * Schedule or reschedule an interview. The meeting itself happens on Teams, Meet or Zoom (or by phone, or in person):
 * create it there first and paste its link. TinQa emails the candidate the details with a calendar invite (.ics).
 */
export const InterviewDialog: React.FC<{
  interview: Interview | null;
  roundNumber: number;
  busy: boolean;
  onClose: () => void;
  onSave: (request: InterviewRequest) => Promise<boolean>;
}> = ({ interview, roundNumber, busy, onClose, onSave }) => {
  const [form, setForm] = useState<InterviewForm>(() => (interview ? interviewToForm(interview) : emptyInterviewForm(roundNumber)));
  const [errors, setErrors] = useState<InterviewErrors>({});
  const set = <K extends keyof InterviewForm>(field: K, value: InterviewForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const found = validateInterview(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (await onSave(toInterviewRequest(form))) onClose();
  };
  // Past times of today (in the chosen time zone) can't be picked
  const now = nowIn(form.timeZone);
  const isPast = (time: string) => !!form.date && `${form.date}T${time}` <= now;

  return (
    <DialogShell wide title={interview ? `Reschedule ${interview.roundName}` : 'Schedule an interview'} disabled={busy} onClose={onClose}
      subtitle="The candidate is emailed the details and a calendar invite.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          The interview takes place on Microsoft Teams, Google Meet or Zoom (or by phone or in person), not in TinQa. Create the meeting there, paste its
          link here, and TinQa emails the candidate the link with a calendar invite (.ics).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CommonInput label="Round" required maxLength={80} value={form.roundName} error={errors.roundName} onChange={(e) => set('roundName', e.target.value)}
            placeholder="e.g. Technical round" />
          <CommonSelect label="How" required value={form.mode} options={MODES.map((value) => ({ value, label: INTERVIEW_MODE_LABELS[value] }))}
            onChange={(e) => set('mode', e.target.value as InterviewMode)} />
        </div>
        {isOnline(form.mode) && (
          <CommonInput label={`${INTERVIEW_MODE_LABELS[form.mode]} meeting link`} required type="url" maxLength={500} value={form.meetingLink} error={errors.meetingLink}
            placeholder={LINK_HINT[form.mode]} onChange={(e) => set('meetingLink', e.target.value)} />
        )}
        {form.mode === 'IN_PERSON' && (
          <CommonTextArea label="Address" required rows={2} maxLength={300} value={form.location} error={errors.location}
            placeholder="Where to come and whom to ask for" onChange={(e) => set('location', e.target.value)} />
        )}
        {form.mode === 'PHONE' && <p className="text-gray-500">We call the candidate on the phone number they gave.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <CommonInput label="Date" required type="date" min={todayIso()} value={form.date} error={errors.date} onChange={(e) => set('date', e.target.value)} />
          <TimeSelect label="Time" required value={form.time} date={form.date} isBlocked={isPast} error={errors.time} onChange={(time) => set('time', time)} />
          <CommonSelect label="Duration" required value={form.durationMinutes} error={errors.durationMinutes}
            options={[...new Set([...DURATION_OPTIONS, Number(form.durationMinutes)])].filter((n) => n > 0).sort((a, b) => a - b).map((n) => ({ value: String(n), label: `${n} min` }))}
            onChange={(e) => set('durationMinutes', e.target.value)} />
          <CommonSelect label="Time zone" required value={form.timeZone} options={TIME_ZONES} onChange={(e) => set('timeZone', e.target.value)} />
        </div>
        <CommonInput label="Interviewers" maxLength={300} value={form.interviewers} onChange={(e) => set('interviewers', e.target.value)}
          placeholder="e.g. Anil (Production head), Meera (HR)" />
        <CommonTextArea label="Notes for the candidate" rows={3} maxLength={1000} value={form.candidateNotes} onChange={(e) => set('candidateNotes', e.target.value)}
          placeholder="Shown in the email, e.g. keep your ID and a copy of your résumé ready" />
        <Buttons busy={busy} label={interview ? 'Reschedule and email' : 'Schedule and email'} tone="approve" onBack={onClose} />
      </form>
    </DialogShell>
  );
};

const OUTCOME_TONES: Record<InterviewOutcome, ActionTone> = { PASSED: 'approve', FAILED: 'danger', NO_SHOW: 'warning' };

/** The interview's result: passed, failed or no-show, with a 1–5 rating and feedback. */
export const OutcomeDialog: React.FC<{ interview: Interview; busy: boolean; onClose: () => void; onSave: (outcome: OutcomeRequest) => Promise<boolean> }> = ({
  interview,
  busy,
  onClose,
  onSave,
}) => {
  const [outcome, setOutcome] = useState<InterviewOutcome | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!outcome) {
      setError('Choose the outcome.');
      return;
    }
    if (await onSave({ outcome, rating, feedback: feedback.trim() || null })) onClose();
  };
  return (
    <DialogShell title={`Outcome of ${interview.roundName}`} subtitle="A passed interview lets you select the candidate." disabled={busy} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div role="radiogroup" aria-label="Outcome" className="flex flex-wrap gap-2">
          {(Object.keys(OUTCOME_LABELS) as InterviewOutcome[]).map((value) => (
            <button key={value} type="button" role="radio" aria-checked={outcome === value}
              onClick={() => {
                setOutcome(value);
                setError('');
              }}
              className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer ${outcome === value ? CHOICE_TONE[OUTCOME_TONES[value]].active : CHOICE_TONE[OUTCOME_TONES[value]].idle}`}>
              {OUTCOME_LABELS[value]}
            </button>
          ))}
        </div>
        {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
        <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1.5">
          <span className="text-gray-500 mr-1">Rating</span>
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} of 5`} onClick={() => setRating(rating === value ? null : value)}
              className={`w-8 h-8 rounded-lg border font-semibold cursor-pointer ${rating !== null && value <= rating ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
              {value}
            </button>
          ))}
        </div>
        <CommonTextArea label="Feedback" rows={4} maxLength={2000} value={feedback} onChange={(e) => setFeedback(e.target.value)}
          placeholder="What went well, what didn't, and the recommendation" />
        <Buttons busy={busy} label="Save outcome" tone="approve" onBack={onClose} />
      </form>
    </DialogShell>
  );
};
