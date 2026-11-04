import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DialogShell } from '../../finance/components/DialogShell';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import type { Attendee, InvitableStaff, Meeting } from '../types/meeting.types';
import { useBusyTimes } from '../hooks/useMeetingData';
import { InviteePicker } from './InviteePicker';
import { BusyWarning } from './BusyWarning';

/**
 * Invites more people to a scheduled meeting, or one person in place of a declined attendee (`replacing`). Each new
 * invitee gets their own 24-hour window to decline. Someone already in another meeting at its time is named in a
 * warning and can't be invited. Closes only when the invitation was sent.
 */
export const InviteDialog: React.FC<{
  meeting: Meeting;
  replacing: Attendee | null;
  /** Employees already on the meeting, not offered again. */
  taken: number[];
  isSubmitting: boolean;
  onClose: () => void;
  onInvite: (employeeIds: number[]) => Promise<boolean>;
}> = ({ meeting, replacing, taken, isSubmitting, onClose, onInvite }) => {
  const [people, setPeople] = useState<InvitableStaff[]>([]);
  const [error, setError] = useState('');
  const busy = useBusyTimes(meeting.startsAt, meeting.endsAt, people.map((person) => person.employeeId), meeting.id, people.length > 0);
  // I am on this meeting already (it is left out), so only the people picked here can clash
  const clashes = (busy.data ?? []).filter((slot) => !slot.self);

  let subtitle = 'They are emailed an invite with a calendar file.';
  if (replacing) subtitle = replacing.declineReason ? `${replacing.name} declined: ${replacing.declineReason}` : `${replacing.name} declined.`;

  const send = async () => {
    if (isSubmitting) return;
    if (people.length === 0) {
      setError(replacing ? 'Pick who goes instead.' : 'Pick at least one person.');
      return;
    }
    if (clashes.length > 0) {
      setError('Remove whoever is already in another meeting at this time.');
      return;
    }
    if (await onInvite(people.map((person) => person.employeeId))) onClose();
  };

  return (
    <DialogShell wide title={replacing ? `Replace ${replacing.name}` : 'Invite more people'} disabled={isSubmitting} onClose={onClose} subtitle={subtitle}>
      <InviteePicker single={!!replacing} selected={people} taken={taken} error={error} label={replacing ? 'Invite instead' : 'Invite'}
        onChange={(next) => {
          setPeople(next);
          setError('');
        }} />
      <BusyWarning clashes={clashes} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={isSubmitting}
          className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 font-semibold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          Back
        </button>
        <button type="button" onClick={send} disabled={isSubmitting}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE.approve}`}>
          {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {replacing ? 'Invite replacement' : 'Send invites'}
        </button>
      </div>
    </DialogShell>
  );
};
