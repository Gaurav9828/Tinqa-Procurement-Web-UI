import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CHOICE_TONE } from '../../../components/ui/actionTones';
import { Pager } from '../../../components/ui/Pager';
import { useMyMeetings } from '../hooks/useMeetingData';
import { MeetingTable } from '../components/MeetingTable';
import type { MeetingStatus } from '../types/meeting.types';

const VIEWS: { value: MeetingStatus | null; label: string; empty: string }[] = [
  { value: 'SCHEDULED', label: 'Upcoming', empty: 'No meetings coming up.' },
  { value: 'COMPLETED', label: 'Past', empty: 'No completed meetings yet.' },
  { value: 'CANCELLED', label: 'Cancelled', empty: 'No cancelled meetings.' },
  { value: null, label: 'All', empty: 'You are not on any meeting yet.' },
];

/**
 * My Meetings (MEETING_VIEW_OWN): meetings you organise or are invited to. Open one to decline it (within 24 hours of
 * the invite) or, once it is completed, to give your feedback.
 */
export const MyMeetingsPage: React.FC = () => {
  const [view, setView] = useState(VIEWS[0]);
  const [page, setPage] = useState(0);
  const mine = useMyMeetings(view.value, page);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">My Meetings</h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1 max-w-3xl">
            Meetings you organise or are invited to. You may decline an invite, with a reason, within 24 hours of receiving it; after that you
            must attend. Once a meeting is completed, give your feedback.
          </p>
        </div>
        <button type="button" onClick={mine.refresh} aria-label="Refresh my meetings"
          className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${mine.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <section className="apple-card p-5 space-y-4">
        <div role="group" aria-label="Which meetings" className="flex flex-wrap gap-1.5">
          {VIEWS.map((option) => (
            <button key={option.label} type="button" aria-pressed={view === option} onClick={() => {
              setView(option);
              setPage(0);
            }}
              className={`px-3 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${view === option ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
              {option.label}
            </button>
          ))}
        </div>
        <MeetingTable mine meetings={mine.data?.content ?? []} isLoading={mine.isLoading} label="My meetings"
          empty={mine.loadFailed ? 'Your meetings could not be loaded.' : view.empty} />
        <Pager page={page} totalPages={mine.data?.totalPages ?? 0} disabled={mine.isLoading} onPage={setPage} />
      </section>
    </div>
  );
};
