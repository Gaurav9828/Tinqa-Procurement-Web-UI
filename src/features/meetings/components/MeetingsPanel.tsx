import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, RefreshCw, Search } from 'lucide-react';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs';
import { Pager } from '../../../components/ui/Pager';
import { useAccess } from '../../../hooks/useAccess';
import { useMeetingList } from '../hooks/useMeetingData';
import type { MeetingStatus } from '../types/meeting.types';
import { MEETINGS_PATH, MEETING_STATUSES, STATUS_LABELS } from '../utils/meeting';
import { MeetingTable } from './MeetingTable';

/**
 * Client Demos & Meetings › Meetings (MEETING_VIEW_ALL): every meeting, by status, date range and search. Loads only
 * while the tab is open. Anyone with MEETING_SCHEDULE schedules one; there is no approval.
 */
export const MeetingsPanel: React.FC = () => {
  const { can } = useAccess();
  const list = useMeetingList(true);
  const { filter } = list;

  return (
    <section className="apple-card p-5 space-y-4" aria-label="Meetings">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-3xl">
          Online and face-to-face meetings with clients, businesses, suppliers and the team. Invitees are emailed, may decline within 24 hours of
          the invite, and give feedback once the organiser marks the meeting completed.
        </p>
        {can('MEETING_SCHEDULE') && (
          <Link to={`${MEETINGS_PATH}/new`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold">
            <CalendarPlus className="w-4 h-4" /> Schedule meeting
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <CommonInput label="Starting from" type="date" value={filter.from} onChange={(e) => list.setFilter({ from: e.target.value })} />
        <CommonInput label="Starting until" type="date" value={filter.to} min={filter.from || undefined} onChange={(e) => list.setFilter({ to: e.target.value })} />
        <CommonSelect label="Status" value={filter.status ?? ''} placeholder="Every status"
          options={[{ value: '', label: 'Every status' }, ...MEETING_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))]}
          onChange={(e) => list.setFilter({ status: (e.target.value || null) as MeetingStatus | null })} />
        <label className="relative sm:col-span-1 self-end">
          <span className="sr-only">Search meetings</span>
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" aria-label="Search meetings" value={list.search} maxLength={100}
            onChange={(e) => list.setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && list.searchNow()}
            placeholder="Name, ID or client"
            className="w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-black/20 dark:border-white/20 bg-transparent focus:outline-none focus:border-[#0071e3]" />
        </label>
        <button type="button" onClick={list.refresh} aria-label="Refresh meetings"
          className="justify-self-start p-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${list.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <MeetingTable meetings={list.data?.content ?? []} isLoading={list.isLoading} label="Meetings"
        empty={list.loadFailed ? 'The meetings could not be loaded.' : 'No meetings match.'} />
      <Pager page={list.page} totalPages={list.data?.totalPages ?? 0} disabled={list.isLoading} onPage={list.setPage} />
    </section>
  );
};
