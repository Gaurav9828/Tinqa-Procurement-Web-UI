import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, PhoneCall } from 'lucide-react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useAccess } from '../../../hooks/useAccess';
import { BusinessFormModal } from '../components/BusinessFormModal';
import { BusinessListPanel } from '../components/BusinessListPanel';
import { FollowUpsPanel } from '../components/FollowUpsPanel';
import { OutreachSummaryStrip } from '../components/OutreachSummaryStrip';
import { businessPath } from '../utils/outreach';

const TABS = [
  { id: 'businesses', label: 'Businesses' },
  { id: 'follow-ups', label: 'My follow-ups' },
] as const;
type Tab = (typeof TABS)[number]['id'];

/**
 * Client Outreach: every call, email, WhatsApp message and visit with the businesses we pitch to. The summary strip
 * shows the chosen period; only the open tab loads its list.
 */
export const ClientOutreachPage: React.FC = () => {
  const { can } = useAccess();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'follow-ups' ? 'follow-ups' : 'businesses';
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
            <PhoneCall className="w-7 h-7 text-[#0071e3]" /> Client Outreach
          </h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1 max-w-3xl">
            Hotels, offices, hospitals and other businesses we pitch to, with every call, email, WhatsApp message and visit: what was
            said, how it went, and when to follow up.
          </p>
        </div>
        {can('OUTREACH_LOG') && (
          <button type="button" onClick={() => setAdding(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${SOLID_TONE.primary}`}>
            <Building2 className="w-4 h-4" /> Add business
          </button>
        )}
      </div>

      <OutreachSummaryStrip />

      <section className="apple-card p-5 space-y-4">
        <div role="tablist" aria-label="Outreach views" className="flex gap-1 border-b border-black/10 dark:border-white/10">
          {TABS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id}
              onClick={() => setParams(item.id === 'businesses' ? {} : { tab: item.id }, { replace: true })}
              className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 cursor-pointer ${
                tab === item.id ? 'border-[#0071e3] text-[#0071e3]' : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'
              }`}>
              {item.label}
            </button>
          ))}
        </div>
        {tab === 'businesses' ? <BusinessListPanel /> : <FollowUpsPanel />}
      </section>

      {adding && (
        <BusinessFormModal
          business={null}
          onClose={() => setAdding(false)}
          onSaved={(business) => navigate(businessPath(business.id))}
          onOpenExisting={(id) => navigate(businessPath(id))}
        />
      )}
    </div>
  );
};
