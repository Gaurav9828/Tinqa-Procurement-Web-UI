import React from 'react';
import { Crown, UserPlus } from 'lucide-react';
import { CHOICE_TONE } from '../../../components/ui/actionTones';
import type { Attendee } from '../types/meeting.types';
import { AttendeeStatusBadge } from './MeetingBadges';
import { formatWhen } from '../utils/meeting';

/**
 * Who is invited, and how each stands: Invited (with the decline deadline), Declined (with the reason) or Replaced
 * (by whom). `onReplace`: the organiser invites someone in place of a declined attendee.
 */
export const AttendeeList: React.FC<{ attendees: Attendee[]; showFeedback: boolean; onReplace?: (attendee: Attendee) => void }> = ({
  attendees,
  showFeedback,
  onReplace,
}) => (
  <ul className="divide-y divide-black/5 dark:divide-white/5 text-xs" aria-label="Attendees">
    {attendees.map((attendee) => (
      <li key={attendee.id} className="py-2.5 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            {attendee.name}
            {attendee.organizer && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                <Crown className="w-3 h-3" /> Organiser
              </span>
            )}
            <AttendeeStatusBadge status={attendee.status} />
          </p>
          <p className="text-[11px] text-gray-400">
            {attendee.designationLabel ?? 'Staff'} · invited {formatWhen(attendee.invitedAt)}
            {attendee.status === 'INVITED' && !attendee.organizer && attendee.declineDeadline && ` · may decline until ${formatWhen(attendee.declineDeadline)}`}
            {showFeedback && attendee.status === 'INVITED' && (attendee.feedbackSubmittedAt ? ' · feedback given' : ' · feedback not given yet')}
          </p>
          {attendee.status === 'DECLINED' && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400">
              Declined {formatWhen(attendee.declinedAt)}{attendee.declineReason && `: ${attendee.declineReason}`}
            </p>
          )}
          {attendee.status === 'REPLACED' && (
            <p className="text-[11px] text-gray-500">
              Declined{attendee.declineReason && ` (${attendee.declineReason})`}; replaced by {attendee.replacedByName ?? 'another colleague'}
            </p>
          )}
        </div>
        {onReplace && attendee.status === 'DECLINED' && (
          <button type="button" onClick={() => onReplace(attendee)} aria-label={`Invite a replacement for ${attendee.name}`}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold cursor-pointer ${CHOICE_TONE.primary.idle}`}>
            <UserPlus className="w-3.5 h-3.5" /> Invite replacement
          </button>
        )}
      </li>
    ))}
  </ul>
);
