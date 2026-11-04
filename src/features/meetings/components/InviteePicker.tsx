import React from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Pager } from '../../../components/ui/Pager';
import type { InvitableStaff } from '../types/meeting.types';
import { useInvitableStaff } from '../hooks/useMeetingData';

/**
 * Picks the people to invite from active employees, searched on the server (GET /v1/meetings/invitable-staff; typing
 * settles for 2 s, Enter searches at once). Loads only while shown. `single`: one person (a replacement). `taken`: on
 * the meeting already, so not offered.
 */
export const InviteePicker: React.FC<{
  selected: InvitableStaff[];
  onChange: (people: InvitableStaff[]) => void;
  taken?: number[];
  single?: boolean;
  error?: string;
  label?: string;
}> = ({ selected, onChange, taken = [], single = false, error, label = 'Invite' }) => {
  const staff = useInvitableStaff(true);
  const chosen = new Set(selected.map((person) => person.employeeId));
  const matches = (staff.data?.content ?? []).filter((person) => !chosen.has(person.employeeId) && !taken.includes(person.employeeId));

  const add = (person: InvitableStaff) => onChange(single ? [person] : [...selected, person]);
  const remove = (id: number) => onChange(selected.filter((person) => person.employeeId !== id));

  let list: React.ReactNode;
  if (staff.isLoading) {
    list = <p className="p-3 text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding staff…</p>;
  } else if (matches.length === 0) {
    list = <p className="p-3 text-xs text-gray-400">{staff.search ? 'Nobody matches.' : 'Nobody else to invite.'}</p>;
  } else {
    list = matches.map((person) => (
      <button key={person.employeeId} type="button" onClick={() => add(person)} aria-label={`Invite ${person.name}`}
        className="w-full text-left px-3 py-2 text-xs hover:bg-[#0071e3]/5 cursor-pointer">
        <span className="font-semibold text-gray-800 dark:text-gray-200">{person.name}</span>
        {person.designationLabel && <span className="text-gray-400"> · {person.designationLabel}</span>}
      </button>
    ));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
        {label} <span className="text-rose-500">*</span>
        <span className="font-normal text-gray-400"> · each is emailed an invite with a calendar file and may decline within 24 hours</span>
      </p>
      <div className="flex flex-wrap gap-1.5" aria-label="Invited people">
        {selected.length === 0 && <span className="text-xs text-gray-400">Nobody picked yet.</span>}
        {selected.map((person) => (
          <span key={person.employeeId} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 text-xs font-semibold">
            {person.name}
            {person.designationLabel && <span className="font-normal opacity-70">· {person.designationLabel}</span>}
            <button type="button" aria-label={`Remove ${person.name}`} onClick={() => remove(person.employeeId)}
              className="p-0.5 rounded-full text-rose-500 hover:bg-rose-500/10 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          aria-label="Find staff to invite"
          value={staff.search}
          maxLength={100}
          onChange={(e) => staff.setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              staff.searchNow();
            }
          }}
          placeholder="Find staff by name or designation (Enter to search now)"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/20 dark:border-white/20 bg-transparent text-sm focus:outline-none focus:border-[#0071e3]"
        />
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="max-h-48 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
        {list}
      </div>
      <Pager page={staff.page} totalPages={staff.data?.totalPages ?? 0} disabled={staff.isLoading} onPage={staff.setPage} />
    </div>
  );
};
