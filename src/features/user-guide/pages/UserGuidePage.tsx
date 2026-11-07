import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import {
  GENERAL_NOTES,
  GUIDE_CHANGELOG,
  GUIDE_FLOWS,
  GUIDE_ROLE_IDS,
  GUIDE_UPDATED,
  GUIDE_VERSION,
  ROLE_GUIDES,
  flowsFor,
  type GuideRoleId,
} from '../content/guideContent';
import { AccessMatrix } from '../components/AccessMatrix';
import { FlowLane } from '../components/FlowLane';
import { RoleCard } from '../components/RoleCard';
import { useGuideDownload } from '../hooks/useGuideDownload';

const ACCESS_STEPS = [
  { title: 'Designation', text: 'The job title, e.g. Store Manager or Delivery Rider.' },
  { title: 'Permission groups', text: 'Each title carries a fixed bundle of groups, set on the server.' },
  { title: 'Level 1 or Level 2', text: 'Level 1 prepares work. Level 2 can also approve it.' },
  { title: 'What you see', text: 'The menu, pages and buttons show only what the account may use.' },
];

const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * How TinQa works, role by role, from guideContent.ts. Pick a role to see only its part and download it as a PDF to
 * hand to that person; "All roles" shows and downloads everything.
 */
export const UserGuidePage: React.FC = () => {
  const [role, setRole] = useState<GuideRoleId | null>(null);
  const { download, isDownloading } = useGuideDownload();
  const flows = role ? flowsFor(role) : GUIDE_FLOWS;

  const chip = (id: GuideRoleId | null, label: string) => {
    const active = role === id;
    return (
      <button
        key={id ?? 'all'}
        type="button"
        aria-pressed={active}
        onClick={() => setRole(id)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
          active
            ? 'bg-[#0071e3] border-[#0071e3] text-white'
            : 'border-black/10 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">User Guide</h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
            What each role does and how work moves between them. Pick a role and download its guide to share with that person.
          </p>
          <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">
            Version {GUIDE_VERSION} · updated {formatDate(GUIDE_UPDATED)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => download(role)}
          disabled={isDownloading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-60 ${SOLID_TONE.primary}`}
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {role ? `Download ${ROLE_GUIDES[role].name} guide (PDF)` : 'Download full guide (PDF)'}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">Show the guide for</p>
        <div role="group" aria-label="Role" className="flex flex-wrap gap-2">
          {chip(null, 'All roles')}
          {GUIDE_ROLE_IDS.map((id) => chip(id, ROLE_GUIDES[id].name))}
        </div>
      </div>

      {role ? (
        <RoleCard guide={ROLE_GUIDES[role]} />
      ) : (
        <>
          <section className="apple-card p-5 space-y-4" aria-labelledby="how-access-works">
            <h2 id="how-access-works" className="text-lg font-semibold text-black dark:text-white">How access works</h2>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ACCESS_STEPS.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                  <span className="text-[11px] font-mono text-[#0071e3]">STEP {i + 1}</span>
                  <p className="font-semibold text-sm text-black dark:text-white">{step.title}</p>
                  <p className="text-sm text-gray-500 dark:text-neutral-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>
          <AccessMatrix />
        </>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-black dark:text-white">{role ? 'How their work flows' : 'Flows'}</h2>
        {flows.map((flow, i) => (
          <FlowLane key={flow.id} flow={flow} index={i + 1} role={role} />
        ))}
      </div>

      {role !== 'SUPPLIER' && (
        <section className="apple-card p-5 space-y-2" aria-labelledby="good-to-know">
          <h2 id="good-to-know" className="text-lg font-semibold text-black dark:text-white">Good to know</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-200">
            {GENERAL_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {!role && (
        <section className="apple-card p-5 space-y-3" aria-labelledby="whats-new">
          <h2 id="whats-new" className="text-lg font-semibold text-black dark:text-white">What's new</h2>
          {GUIDE_CHANGELOG.map((entry) => (
            <div key={entry.date}>
              <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400">{formatDate(entry.date)}</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
