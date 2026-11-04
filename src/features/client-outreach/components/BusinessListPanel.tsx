import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import { CommonSelect } from '../../../components/ui/FormInputs';
import { Pager } from '../../../components/ui/Pager';
import { useBusinessList } from '../hooks/useOutreachData';
import type { BusinessType, Interest } from '../types/outreach.types';
import {
  BUSINESS_TYPES,
  INTEREST_LABELS,
  INTEREST_TONE,
  businessPath,
  businessTypeLabel,
  formatDateTime,
  isOverdue,
  options,
} from '../utils/outreach';

/** Businesses we pitch to: search by name, phone or email; filter by type, interest and follow-ups due. */
export const BusinessListPanel: React.FC = () => {
  const list = useBusinessList(true);
  const { filters } = list;

  return (
    <section aria-label="Businesses" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px_auto_auto] gap-3 items-end">
        <label className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-gray-400" />
          <input
            type="search"
            aria-label="Search businesses"
            placeholder="Search name, phone or email (Enter to search now)"
            maxLength={100}
            value={filters.search}
            onChange={(e) => list.update({ search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && list.searchNow()}
            className="w-full pl-9 pr-3 py-3 rounded-xl border border-black/20 dark:border-white/20 bg-transparent text-sm focus:outline-none focus:border-[#0071e3]"
          />
        </label>
        <CommonSelect label="Type" placeholder="Every type" value={filters.businessType}
          options={[{ value: '', label: 'Every type' }, ...BUSINESS_TYPES.map((value) => ({ value, label: businessTypeLabel(value) }))]}
          onChange={(e) => list.update({ businessType: e.target.value as BusinessType | '' })} />
        <CommonSelect label="Latest interest" placeholder="Any interest" value={filters.interest}
          options={[{ value: '', label: 'Any interest' }, ...options(INTEREST_LABELS)]}
          onChange={(e) => list.update({ interest: e.target.value as Interest | '' })} />
        <label className="flex items-center gap-2 text-xs py-3 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={filters.followUpDue} onChange={(e) => list.update({ followUpDue: e.target.checked })} />
          Follow-up due
        </label>
        <button type="button" onClick={list.refresh} aria-label="Refresh businesses"
          className="justify-self-start p-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${list.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Business list">
          <thead className="text-left text-xs text-gray-500 border-b border-black/10 dark:border-white/10">
            <tr>
              <th className="py-2 pr-3 font-medium">Business</th>
              <th className="py-2 pr-3 font-medium">Phone / email</th>
              <th className="py-2 pr-3 font-medium">Contacts</th>
              <th className="py-2 pr-3 font-medium">Last contact</th>
              <th className="py-2 pr-3 font-medium">Interest</th>
              <th className="py-2 font-medium">Next follow-up</th>
            </tr>
          </thead>
          <tbody>
            {list.businesses.map((business) => (
              <tr key={business.id} className="border-b border-black/5 dark:border-white/5 align-top">
                <td className="py-2.5 pr-3">
                  <Link to={businessPath(business.id)} className="font-semibold text-[#0071e3] hover:underline">
                    {business.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {businessTypeLabel(business.businessType)}
                    {business.city && ` · ${business.city}`}
                  </p>
                </td>
                <td className="py-2.5 pr-3 text-xs text-gray-600 dark:text-neutral-300">
                  {business.phone && <p>{business.phone}</p>}
                  {business.email && <p>{business.email}</p>}
                </td>
                <td className="py-2.5 pr-3 text-xs">
                  {business.contactCount}
                  {business.demoRequestCount > 0 && <span className="text-gray-500"> · {business.demoRequestCount} demo</span>}
                </td>
                <td className="py-2.5 pr-3 text-xs">
                  {formatDateTime(business.lastContactAt)}
                  {business.lastContactByName && <p className="text-gray-500">{business.lastContactByName}</p>}
                </td>
                <td className="py-2.5 pr-3">
                  {business.latestInterest ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${INTEREST_TONE[business.latestInterest]}`}>
                      {INTEREST_LABELS[business.latestInterest]}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className={`py-2.5 text-xs ${isOverdue(business.nextFollowUpAt) ? 'text-amber-700 dark:text-amber-400 font-semibold' : ''}`}>
                  {formatDateTime(business.nextFollowUpAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.isLoading && list.businesses.length === 0 && (
          <p className="text-sm text-gray-500 py-6 text-center">
            {list.loadFailed ? 'The businesses could not be loaded.' : 'No businesses match. Add one to start logging contacts.'}
          </p>
        )}
        {list.isLoading && list.businesses.length === 0 && <p className="text-sm text-gray-500 py-6 text-center">Loading businesses…</p>}
      </div>
      <Pager page={list.page} totalPages={list.totalPages} disabled={list.isLoading} onPage={list.setPage} />
    </section>
  );
};
