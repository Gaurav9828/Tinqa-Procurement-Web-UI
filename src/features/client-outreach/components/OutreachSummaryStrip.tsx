import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CommonInput } from '../../../components/ui/FormInputs';
import { useOutreachSummary } from '../hooks/useOutreachData';
import type { ContactChannel, Interest } from '../types/outreach.types';
import { CHANNEL_LABELS, INTEREST_LABELS, daysAgo, formatDate } from '../utils/outreach';

/**
 * Outreach at a glance for a date range (GET /v1/outreach/summary, one SQL statement): totals, contacts per day and per
 * executive, and the split by channel and interest. Changing the range loads it again.
 */
export const OutreachSummaryStrip: React.FC = () => {
  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(() => daysAgo(0));
  const summary = useOutreachSummary(from, to);
  const data = summary.data;
  const maxDay = Math.max(1, ...(data?.byDay ?? []).map((day) => day.contacts));

  const tiles: [string, number | undefined][] = [
    ['Contacts', data?.totalContacts],
    ['Businesses contacted', data?.businessesContacted],
    ['New businesses', data?.newBusinesses],
    ['Demo requests', data?.demoRequests],
    ['Follow-ups due', data?.followUpsDue],
  ];

  return (
    <section aria-label="Outreach summary" className="apple-card p-5 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <CommonInput label="From" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </div>
        <div className="w-44">
          <CommonInput label="To" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </div>
        <button type="button" onClick={summary.refresh} aria-label="Refresh summary"
          className="p-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${summary.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-3">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-xl font-bold mt-0.5 text-black dark:text-white">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <h3 className="font-semibold text-gray-600 dark:text-neutral-300">Contacts per day</h3>
            {data.byDay.length === 0 && <p className="text-gray-500">No contacts in this period.</p>}
            <table className="w-full" aria-label="Contacts per day">
              <tbody>
                {data.byDay.map((day) => (
                  <tr key={day.date}>
                    <td className="py-0.5 pr-2 whitespace-nowrap text-gray-500">{formatDate(day.date)}</td>
                    <td className="py-0.5 w-full">
                      <div className="h-2 rounded bg-[#0071e3]" style={{ width: `${(day.contacts / maxDay) * 100}%`, minWidth: day.contacts ? 4 : 0 }} />
                    </td>
                    <td className="py-0.5 pl-2 text-right whitespace-nowrap text-black dark:text-white">
                      {day.contacts} <span className="text-gray-400">/ {day.businesses} biz</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-semibold text-gray-600 dark:text-neutral-300">Per executive</h3>
            {data.byExecutive.length === 0 ? (
              <p className="text-gray-500">Nobody logged a contact in this period.</p>
            ) : (
              <table className="w-full" aria-label="Contacts per executive">
                <thead className="text-gray-500 text-left">
                  <tr>
                    <th className="font-medium py-0.5">Name</th>
                    <th className="font-medium py-0.5 text-right">Contacts</th>
                    <th className="font-medium py-0.5 text-right">Businesses</th>
                    <th className="font-medium py-0.5 text-right">Interested</th>
                  </tr>
                </thead>
                <tbody className="text-black dark:text-white">
                  {data.byExecutive.map((row) => (
                    <tr key={row.userId}>
                      <td className="py-0.5">{row.name}</td>
                      <td className="py-0.5 text-right">{row.contacts}</td>
                      <td className="py-0.5 text-right">{row.businesses}</td>
                      <td className="py-0.5 text-right">{row.interested}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-600 dark:text-neutral-300">By channel</h3>
              <ul className="flex flex-wrap gap-1.5">
                {(Object.keys(CHANNEL_LABELS) as ContactChannel[]).map((channel) => (
                  <li key={channel} className="px-2 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
                    {CHANNEL_LABELS[channel]} <span className="font-semibold">{data.byChannel?.[channel] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-600 dark:text-neutral-300">By interest</h3>
              <ul className="flex flex-wrap gap-1.5">
                {(Object.keys(INTEREST_LABELS) as Interest[]).map((interest) => (
                  <li key={interest} className="px-2 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
                    {INTEREST_LABELS[interest]} <span className="font-semibold">{data.byInterest?.[interest] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
