import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CHOICE_TONE } from '../../../components/ui/actionTones';
import { Pager } from '../../../components/ui/Pager';
import { useFollowUps } from '../hooks/useOutreachData';
import { ContactCard } from './ContactCard';

/**
 * Contacts whose follow-up is due by the end of today and not yet followed by a later contact, oldest first. Yours by
 * default; everyone's on request.
 */
export const FollowUpsPanel: React.FC = () => {
  const [mine, setMine] = useState(true);
  const [page, setPage] = useState(0);
  const followUps = useFollowUps(mine, page, true);
  const contacts = followUps.data?.content ?? [];

  const scope = (value: boolean, label: string) => (
    <button type="button" aria-pressed={mine === value}
      onClick={() => {
        setMine(value);
        setPage(0);
      }}
      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${mine === value ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
      {label}
    </button>
  );

  return (
    <section aria-label="Follow-ups" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {scope(true, 'My follow-ups')}
        {scope(false, 'Everyone’s')}
        <button type="button" onClick={followUps.refresh} aria-label="Refresh follow-ups"
          className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${followUps.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {contacts.map((contact) => (
        <ContactCard key={contact.id} contact={contact} showBusiness />
      ))}
      {!followUps.isLoading && contacts.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center">
          {followUps.loadFailed ? 'The follow-ups could not be loaded.' : 'No follow-ups are due. Nice work.'}
        </p>
      )}
      <Pager page={page} totalPages={followUps.data?.totalPages ?? 0} disabled={followUps.isLoading} onPage={setPage} />
    </section>
  );
};
