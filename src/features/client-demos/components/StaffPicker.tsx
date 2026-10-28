import React, { useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { StaffMember } from '../types/clientDemo.types';
import { MAX_STAFF } from '../utils/clientDemo';

/**
 * Tags the attending staff. The list is loaded once and filtered here (by name, code or designation). Staff tagged
 * earlier who have since left stay shown so they can be removed.
 */
export const StaffPicker: React.FC<{
  options: StaffMember[];
  isLoading: boolean;
  /** Staff already on the demo, shown even when no longer in the options. */
  known: StaffMember[];
  selected: number[];
  error?: string;
  onChange: (ids: number[]) => void;
}> = ({ options, isLoading, known, selected, error, onChange }) => {
  const [query, setQuery] = useState('');
  const byId = useMemo(() => {
    const map = new Map<number, StaffMember>();
    [...known, ...options].forEach((member) => map.set(member.employeeId, member));
    return map;
  }, [known, options]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((member) => !selected.includes(member.employeeId)
      && (!q || [member.name, member.employeeCode, member.designation].some((value) => value?.toLowerCase().includes(q))));
  }, [options, query, selected]);

  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  let list: React.ReactNode;
  if (isLoading) {
    list = <p className="p-3 text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading staff…</p>;
  } else if (matches.length === 0) {
    list = <p className="p-3 text-xs text-gray-400">{query ? 'Nobody matches.' : 'Everyone is tagged.'}</p>;
  } else {
    list = matches.slice(0, 50).map((member) => (
      <button key={member.employeeId} type="button" disabled={selected.length >= MAX_STAFF} onClick={() => toggle(member.employeeId)}
        className="w-full text-left px-3 py-2 text-xs hover:bg-[#0071e3]/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        <span className="font-semibold text-gray-800 dark:text-gray-200">{member.name}</span>
        <span className="text-gray-400"> · {member.employeeCode}{member.designation ? ` · ${member.designation}` : ''}</span>
      </button>
    ));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
        Attending staff <span className="text-rose-500">*</span>
        <span className="font-normal text-gray-400"> · they see this demo under My Demos and record their own bills on it</span>
      </p>
      <div className="flex flex-wrap gap-1.5" aria-label="Tagged staff">
        {selected.length === 0 && <span className="text-xs text-gray-400">Nobody tagged yet.</span>}
        {selected.map((id) => {
          const member = byId.get(id);
          return (
            <span key={id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 text-xs font-semibold">
              {member?.name ?? `#${id}`}
              {member?.designation && <span className="font-normal opacity-70">· {member.designation}</span>}
              <button type="button" aria-label={`Remove ${member?.name ?? id}`} onClick={() => toggle(id)}
                className="p-0.5 rounded-full text-rose-500 hover:bg-rose-500/10 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          aria-label="Find staff"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find staff by name, code or designation"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/20 dark:border-white/20 bg-transparent text-sm focus:outline-none focus:border-[#0071e3]"
        />
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="max-h-48 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
        {list}
      </div>
    </div>
  );
};
