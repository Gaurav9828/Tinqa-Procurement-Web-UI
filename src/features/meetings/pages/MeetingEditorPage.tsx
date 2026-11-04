import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, Loader2, MapPin, Video } from 'lucide-react';
import { CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import { TimeSelect } from '../../client-demos/components/TimeSelect';
import { at } from '../../client-demos/utils/timeBlocks';
import { addDays, todayIso } from '../../client-demos/utils/clientDemo';
import { useNotify } from '../../../hooks/useNotify';
import { useBusyTimes, useMeeting } from '../hooks/useMeetingData';
import { useMeetingActions } from '../hooks/useMeetingActions';
import { InviteePicker } from '../components/InviteePicker';
import { BusyWarning } from '../components/BusyWarning';
import { busyBlocks, busyDuring } from '../utils/busy';
import type { Meeting, MeetingMode, MeetingType } from '../types/meeting.types';
import { MEETINGS_TAB_PATH, MEETING_TYPES, MEETING_TYPE_LABELS, MODE_LABELS, meetingPath, toOffsetIso } from '../utils/meeting';
import {
  LIMITS,
  emptyMeetingForm,
  formFromMeeting,
  meetingPayload,
  validateMeetingForm,
  type MeetingForm,
  type MeetingFormErrors,
} from '../utils/meetingForm';

const nowHhmm = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="apple-card p-5 space-y-4">
    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
    {children}
  </section>
);

/** The meeting's form: new (with invitees) or a saved one being changed (`meeting`). */
const MeetingFormView: React.FC<{ meeting: Meeting | null }> = ({ meeting }) => {
  const isNew = meeting === null;
  const navigate = useNavigate();
  const [form, setForm] = useState<MeetingForm>(() => (meeting ? formFromMeeting(meeting) : emptyMeetingForm()));
  const [errors, setErrors] = useState<MeetingFormErrors>({});
  const notify = useNotify();

  // Who is already in another meeting that day (the invitees, those still attending when editing, and me): greyed out
  // on the clock, and a clash with the chosen time is warned about and refused
  const people = isNew
    ? form.attendees.map((person) => person.employeeId)
    : meeting.attendees.filter((person) => person.status === 'INVITED').map((person) => person.employeeId);
  const busy = useBusyTimes(form.date ? toOffsetIso(form.date, '00:00') : '', form.date ? toOffsetIso(addDays(form.date, 1), '00:00') : '',
    people, meeting?.id ?? null, !!form.date);
  const slots = busy.data ?? [];
  const taken = busyBlocks(slots);
  const clashes = form.date && form.startTime && form.endTime
    ? busyDuring(slots, toOffsetIso(form.date, form.startTime), toOffsetIso(form.date, form.endTime))
    : [];
  // A 409 MEETING_TIME_CLASH means someone was booked meanwhile: ask again, so the clock and warning show it
  const actions = useMeetingActions(() => undefined, busy.refresh);

  const set = <K extends keyof MeetingForm>(key: K, value: MeetingForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const text = (key: keyof MeetingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    set(key, e.target.value as never);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actions.isSubmitting) return;
    const found = validateMeetingForm(form, isNew);
    if (clashes.length > 0 && !found.startTime) found.startTime = 'Someone is already in another meeting at this time.';
    setErrors(found);
    if (clashes.length > 0) notify.error('Time clash: someone is already in another meeting at this time. Pick another time, or invite someone else.');
    if (Object.values(found).some(Boolean)) return;
    const payload = meetingPayload(form, isNew);
    const saved = meeting ? await actions.update(meeting.id, payload) : await actions.create(payload);
    if (!saved) return;
    const id = saved.id ?? meeting?.id;
    navigate(id ? meetingPath(id) : MEETINGS_TAB_PATH);
  };

  const isToday = form.date === todayIso();
  const backPath = meeting ? meetingPath(meeting.id) : MEETINGS_TAB_PATH;

  return (
    <form onSubmit={save} noValidate className="space-y-5 p-6 max-w-4xl mx-auto">
      <div>
        <Link to={backPath} className="inline-flex items-center gap-1 text-xs text-[#0071e3] font-semibold hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> {meeting ? 'Back to the meeting' : 'Back to meetings'}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white mt-2">
          {meeting ? <>Change meeting <span className="font-mono text-sm text-gray-400">{meeting.code}</span></> : 'Schedule a meeting'}
        </h1>
        <p className="text-xs text-gray-500 mt-1 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#0071e3]" />
          {meeting
            ? 'A change of time, place or link emails every attendee again. Attendees are changed on the meeting’s page.'
            : 'No approval is needed. The meeting ID (MTG-year-number) is generated when you save, and every invitee is emailed an invite with a calendar file.'}
        </p>
      </div>

      <Section title="How it is held">
        <div role="radiogroup" aria-label="Meeting mode" className="flex flex-wrap gap-2">
          {(['ONLINE', 'IN_PERSON'] as MeetingMode[]).map((mode) => (
            <button key={mode} type="button" role="radio" aria-checked={form.mode === mode} onClick={() => set('mode', mode)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold cursor-pointer ${
                form.mode === mode ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
              {mode === 'ONLINE' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />} {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        {form.mode === 'ONLINE' ? (
          <CommonInput label="Join link" required type="url" value={form.joinUrl} maxLength={LIMITS.url} error={errors.joinUrl}
            placeholder="https://meet.google.com/…, https://teams.microsoft.com/…, https://zoom.us/j/…" onChange={text('joinUrl')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CommonInput label="Place" required value={form.placeName} maxLength={LIMITS.placeName} error={errors.placeName}
              placeholder="e.g. Hotel Pearl, conference room" onChange={text('placeName')} />
            <CommonInput label="Google Maps link" type="url" value={form.googleMapsUrl} maxLength={LIMITS.url} error={errors.googleMapsUrl}
              placeholder="https://maps.app.goo.gl/…" onChange={text('googleMapsUrl')} />
            <div className="sm:col-span-2">
              <CommonTextArea label="Address" required rows={2} value={form.address} maxLength={LIMITS.address} error={errors.address} onChange={text('address')} />
            </div>
          </div>
        )}
        {form.mode === 'ONLINE' && (
          <p className="text-[11px] text-gray-400">Create the meeting on Google Meet, Teams or Zoom first and paste its link here. TinQa does not create it.</p>
        )}
      </Section>

      <Section title="What it is about">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CommonInput label="Meeting name" required value={form.title} maxLength={LIMITS.title} error={errors.title} onChange={text('title')} />
          <CommonSelect label="Meeting type" required value={form.meetingType}
            options={MEETING_TYPES.map((value) => ({ value, label: MEETING_TYPE_LABELS[value] }))}
            onChange={(e) => set('meetingType', e.target.value as MeetingType)} />
          <div className="sm:col-span-2">
            <CommonInput label="Subject" value={form.subject} maxLength={LIMITS.subject} onChange={text('subject')} />
          </div>
          <div className="sm:col-span-2">
            <CommonTextArea label="Description" rows={3} value={form.description} maxLength={LIMITS.description} onChange={text('description')} />
          </div>
        </div>
      </Section>

      <Section title="Who it is with">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CommonInput label="Client / business name" value={form.clientName} maxLength={LIMITS.clientName} onChange={text('clientName')} />
          <CommonInput label="Contact" value={form.clientContact} maxLength={LIMITS.clientContact} placeholder="Person, phone or email"
            onChange={text('clientContact')} />
          <div className="sm:col-span-2">
            <CommonTextArea label="About the client" rows={2} value={form.clientDescription} maxLength={LIMITS.clientDescription}
              onChange={text('clientDescription')} />
          </div>
        </div>
      </Section>

      <Section title="When">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <CommonInput label="Day" required type="date" value={form.date} min={todayIso()} error={errors.date} onChange={text('date')} />
          <TimeSelect label="Starts" required value={form.startTime} error={errors.startTime} date={form.date} taken={taken}
            isBlocked={(time) => isToday && time <= nowHhmm()} onChange={(time) => set('startTime', time)} />
          <TimeSelect label="Ends" required value={form.endTime} error={errors.endTime} date={form.date} taken={taken}
            startAt={form.startTime ? at(form.date, form.startTime) : undefined}
            isBlocked={(time) => !!form.startTime && time <= form.startTime} onChange={(time) => set('endTime', time)} />
        </div>
        <p className="text-[11px] text-gray-400">
          Ends the same day, at most 12 hours after it starts. Time when you or an invitee is already in another meeting is greyed out on the clock.
        </p>
      </Section>

      {isNew && (
        <Section title="Invitees">
          <InviteePicker selected={form.attendees} error={errors.attendees} onChange={(people) => set('attendees', people)} />
          <p className="text-[11px] text-gray-400">You are added as the organiser.</p>
        </Section>
      )}

      <BusyWarning clashes={clashes} />

      <div className="flex justify-end gap-2">
        <Link to={backPath} className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 font-semibold text-sm hover:bg-black/5 dark:hover:bg-white/10">
          Back
        </Link>
        <button type="submit" disabled={actions.isSubmitting}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE.approve}`}>
          {actions.isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isNew ? 'Schedule meeting' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

/**
 * /meetings/new and /meetings/:id/edit (MEETING_SCHEDULE): schedule a meeting, online (a pasted Meet/Teams/Zoom link)
 * or face-to-face (place, address, Maps link), or change one you organise while it is scheduled.
 */
export const MeetingEditorPage: React.FC = () => {
  const { id: idParam } = useParams();
  const id = idParam ? Number(idParam) : null;
  const editing = id !== null && Number.isFinite(id);
  const { data: meeting, isLoading } = useMeeting(editing ? id : null);

  if (!editing) return <MeetingFormView meeting={null} />;
  if (!meeting) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-sm text-gray-500 flex items-center gap-2">
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading the meeting…</> : 'This meeting could not be loaded.'}
        <Link to={MEETINGS_TAB_PATH} className="text-[#0071e3] font-semibold hover:underline ml-2">Back</Link>
      </div>
    );
  }
  if (!meeting.canManage || meeting.status !== 'SCHEDULED') {
    return (
      <div className="p-6 max-w-4xl mx-auto text-sm text-gray-500">
        {meeting.canManage ? 'Only a scheduled meeting can be changed.' : 'Only its organiser changes this meeting.'}{' '}
        <Link to={meetingPath(meeting.id)} className="text-[#0071e3] font-semibold hover:underline">Open the meeting</Link>
      </div>
    );
  }
  return <MeetingFormView key={meeting.id} meeting={meeting} />;
};
