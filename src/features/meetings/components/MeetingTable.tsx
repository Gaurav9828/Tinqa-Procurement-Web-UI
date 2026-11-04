import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, MapPin, Video } from 'lucide-react';
import type { Meeting } from '../types/meeting.types';
import { AttendeeStatusBadge, MeetingStatusBadge } from './MeetingBadges';
import { MEETING_TYPE_LABELS, formatSpan, meetingFeedbackPath, meetingPath } from '../utils/meeting';

/** Meetings as rows; each opens its page. `mine`: My Meetings, with my own attendance and feedback to give. */
export const MeetingTable: React.FC<{ meetings: Meeting[]; isLoading: boolean; empty: string; label: string; mine?: boolean }> = ({
  meetings,
  isLoading,
  empty,
  label,
  mine = false,
}) => {
  if (meetings.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center" role="status">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline" aria-label="Loading" /> : empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs" aria-label={label}>
        <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
          <tr>
            <th className="pb-2 pr-3 font-semibold">Meeting</th>
            <th className="pb-2 pr-3 font-semibold">With</th>
            <th className="pb-2 pr-3 font-semibold">When</th>
            <th className="pb-2 pr-3 font-semibold">Where</th>
            <th className="pb-2 pr-3 font-semibold">{mine ? 'You' : 'Organiser'}</th>
            <th className="pb-2 pr-3 font-semibold">Status</th>
            <th className="pb-2 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
          {meetings.map((meeting) => {
            const giveFeedback = mine && meeting.feedbackPending;
            return (
              <tr key={meeting.id}>
                <td className="py-2.5 pr-3">
                  <span className="font-semibold">{meeting.title}</span>
                  <span className="block text-[10px] text-gray-400">
                    <span className="font-mono">{meeting.code}</span> · {MEETING_TYPE_LABELS[meeting.meetingType]}
                  </span>
                </td>
                <td className="py-2.5 pr-3">{meeting.clientName ?? '—'}</td>
                <td className="py-2.5 pr-3 whitespace-nowrap">{formatSpan(meeting.startsAt, meeting.endsAt)}</td>
                <td className="py-2.5 pr-3">
                  {meeting.mode === 'ONLINE' ? (
                    <span className="inline-flex items-center gap-1"><Video className="w-3.5 h-3.5 text-gray-400" /> Online</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {meeting.placeName ?? 'Face-to-face'}</span>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  {mine ? (
                    <span className="inline-flex items-center gap-1">
                      {meeting.canManage ? 'Organiser' : meeting.myAttendance && <AttendeeStatusBadge status={meeting.myAttendance.status} />}
                    </span>
                  ) : (
                    <>
                      {meeting.organizerName}
                      <span className="block text-[10px] text-gray-400">{meeting.attendeeCount} {meeting.attendeeCount === 1 ? 'attendee' : 'attendees'}</span>
                    </>
                  )}
                </td>
                <td className="py-2.5 pr-3"><MeetingStatusBadge status={meeting.status} /></td>
                <td className="py-2.5 text-right">
                  <Link to={giveFeedback ? meetingFeedbackPath(meeting.id) : meetingPath(meeting.id)} aria-label={`Open ${meeting.code}`}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-white font-semibold whitespace-nowrap ${
                      giveFeedback ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#0071e3] hover:bg-[#0077ed]'}`}>
                    {giveFeedback ? 'Give feedback' : 'Open'} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
