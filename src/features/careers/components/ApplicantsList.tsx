import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Pager } from '../../../components/ui/Pager';
import type { ApplicationSort, MatchLabel } from '../types/careers.types';
import { MATCH_FILTERS, SORT_OPTIONS, STATUS_CHIPS, applicationPath, formatDate, formatDateTime, yearsLabel } from '../utils/careers';
import { useApplications } from '../hooks/useCareersData';
import { ApplicationStatusBadge, MatchBadge } from './Badges';
import { Chips, EmptyRow, RefreshButton, SearchBox } from './CareersUi';

const chipOf = (statuses: string[]) => STATUS_CHIPS.find((chip) => chip.statuses.join(',') === statuses.join(','))?.id ?? 'all';


/**
 * Applicants (GET /applications, CAREER_APPLICATION_VIEW): one opening's (`openingId`) or every opening's, by status,
 * match and search, sorted newest, oldest, best match or experience. A row opens the application.
 */
export const ApplicantsList: React.FC<{ openingId?: number | null }> = ({ openingId = null }) => {
  const list = useApplications({ openingId });
  const navigate = useNavigate();
  const showOpening = openingId === null;
  const columns = showOpening ? 7 : 6;
  const filtered = list.filters.statuses.length > 0 || list.filters.match !== null || !!list.search;
  let emptyText = 'Nobody has applied yet.';
  if (list.loadFailed) emptyText = 'The applicants could not be loaded.';
  else if (filtered) emptyText = 'No applicants match.';

  return (
    <section aria-label="Applicants" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        <Chips
          label="Applicant status"
          options={STATUS_CHIPS.map((chip) => ({ value: chip.id, label: chip.label }))}
          value={chipOf(list.filters.statuses)}
          onChange={(id) => list.setFilters({ statuses: STATUS_CHIPS.find((chip) => chip.id === id)?.statuses ?? [] })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Chips<MatchLabel | 'ANY'>
          label="Résumé match"
          options={[{ value: 'ANY', label: 'Any match' }, ...MATCH_FILTERS]}
          value={list.filters.match ?? 'ANY'}
          onChange={(value) => list.setFilters({ match: value === 'ANY' ? null : value })}
        />
        <SearchBox label="Search applicants" placeholder="Search by name, email, phone or reference" value={list.search} onChange={list.setSearch} onSearchNow={list.searchNow} />
        <label className="flex items-center gap-1.5 text-gray-500">
          Sort
          <select
            aria-label="Sort applicants"
            value={list.filters.sort}
            onChange={(e) => list.setFilters({ sort: e.target.value as ApplicationSort })}
            className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-black dark:text-white cursor-pointer"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-white dark:bg-[#1c1c1e]">
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <RefreshButton label="Refresh applicants" busy={list.isLoading} onClick={list.refresh} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left" aria-label="Applicants">
          <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="pb-2 pr-3 font-semibold">Candidate</th>
              {showOpening && <th className="pb-2 pr-3 font-semibold">Opening</th>}
              <th className="pb-2 pr-3 font-semibold">Experience</th>
              <th className="pb-2 pr-3 font-semibold">Match</th>
              <th className="pb-2 pr-3 font-semibold">Status</th>
              <th className="pb-2 pr-3 font-semibold">Next interview</th>
              <th className="pb-2 font-semibold">Applied</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
            {list.rows.length === 0 && (
              <EmptyRow colSpan={columns}>{list.isLoading ? <Loader2 className="w-5 h-5 animate-spin inline" aria-label="Loading applicants" /> : emptyText}</EmptyRow>
            )}
            {list.rows.map((row) => (
              <tr key={row.id} onClick={() => navigate(applicationPath(row.id))} className="cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <td className="py-3 pr-3">
                  <Link to={applicationPath(row.id)} onClick={(e) => e.stopPropagation()} className="font-semibold text-[#0071e3] hover:underline">
                    {row.fullName}
                  </Link>
                  <div className="text-gray-400">
                    <span className="font-mono">{row.referenceNumber}</span> · {row.currentLocation}
                  </div>
                  {(row.currentTitle || row.currentCompany) && (
                    <div className="text-gray-500">{[row.currentTitle, row.currentCompany].filter(Boolean).join(' at ')}</div>
                  )}
                </td>
                {showOpening && (
                  <td className="py-3 pr-3">
                    <div>{row.opening.title}</div>
                    <div className="font-mono text-gray-400">{row.opening.jobCode}</div>
                  </td>
                )}
                <td className="py-3 pr-3 whitespace-nowrap">
                  {yearsLabel(row.totalExperienceYears)}
                  {row.noticePeriodDays !== null && <div className="text-gray-400">{row.noticePeriodDays} days notice</div>}
                </td>
                <td className="py-3 pr-3"><MatchBadge match={row.match} /></td>
                <td className="py-3 pr-3"><ApplicationStatusBadge status={row.status} /></td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  {row.nextInterviewAt ? (
                    <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                      <CalendarClock className="w-3.5 h-3.5" /> {formatDateTime(row.nextInterviewAt)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3 whitespace-nowrap">{formatDate(row.appliedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-gray-400">{list.data && (list.totalElements === 1 ? '1 applicant' : `${list.totalElements} applicants`)}</span>
        <Pager page={list.page} totalPages={list.totalPages} disabled={list.isLoading} onPage={list.setPage} />
      </div>
    </section>
  );
};
