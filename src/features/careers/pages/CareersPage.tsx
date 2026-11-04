import React, { useCallback } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Briefcase, Loader2, Plus } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { Pager } from '../../../components/ui/Pager';
import { CommonSelect } from '../../../components/ui/FormInputs';
import { useCareerCategories, useOpenings } from '../hooks/useCareersData';
import { useOpeningActions } from '../hooks/useCareerActions';
import type { AdminOpeningRow, OpeningStatus } from '../types/careers.types';
import {
  APPLICANTS_PATH,
  EMPLOYMENT_TYPE_LABELS,
  NEW_OPENING_PATH,
  OPENING_STATUS_LABELS,
  WORK_MODE_LABELS,
  deadlinePassed,
  formatDate,
  openingPath,
} from '../utils/careers';
import { OpeningStatusBadge } from '../components/Badges';
import { CareersTabs, Chips, EmptyRow, RefreshButton, SearchBox } from '../components/CareersUi';
import { OpeningActions } from '../components/OpeningActions';
import { CareersSiteSwitch } from '../components/CareersSiteSwitch';

const STATUS_OPTIONS: { value: OpeningStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  ...(Object.keys(OPENING_STATUS_LABELS) as OpeningStatus[]).map((value) => ({ value, label: OPENING_STATUS_LABELS[value] })),
];

const Counts: React.FC<{ row: AdminOpeningRow }> = ({ row }) => (
  <div className="flex gap-1.5 whitespace-nowrap" aria-label={`${row.applications.fresh} new, ${row.applications.inProgress} in progress, ${row.applications.selected} selected`}>
    <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400" title="New (applied)">{row.applications.fresh} new</span>
    <span className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400" title="Shortlist to selection">{row.applications.inProgress} in progress</span>
    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" title="Selected">{row.applications.selected} selected</span>
  </div>
);

/**
 * Careers › Openings (/careers): every job opening by status, team and search, with its applicant counts. A row opens
 * its applicants; openings are created, edited, published and closed by CAREER_OPENING_MANAGE. Three calls: the
 * openings page, the (shared, cached) categories and whether the website shows the Careers tab.
 */
export const CareersPage: React.FC = () => {
  const { can } = useAccess();
  const navigate = useNavigate();
  const list = useOpenings();
  const { categories } = useCareerCategories();
  const refreshList = list.refresh;
  const actions = useOpeningActions(useCallback(() => refreshList(), [refreshList]));

  // Applicants only: their list is the Careers page
  if (!can('CAREER_OPENING_VIEW')) return <Navigate to={APPLICANTS_PATH} replace />;

  const rows = list.rows;
  const filtered = list.status !== null || list.categoryId !== null || !!list.search;
  let emptyText = filtered ? 'No openings match.' : 'No openings yet.';
  if (list.loadFailed) emptyText = 'The openings could not be loaded.';

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#0071e3]" /> Careers
          </h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1 max-w-3xl">
            Job openings on the website&apos;s Careers tab and the people who applied. Level 1 screens and shortlists; a Level 2 approver
            confirms every shortlist and selection. Candidates are emailed at each step.
          </p>
        </div>
        {can('CAREER_OPENING_MANAGE') && (
          <Link to={NEW_OPENING_PATH} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /> New opening
          </Link>
        )}
      </div>

      <CareersTabs />

      <CareersSiteSwitch />

      <section aria-label="Openings" className="apple-card p-5 space-y-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Chips label="Opening status" options={STATUS_OPTIONS} value={list.status ?? 'ALL'} onChange={(value) => list.setStatus(value === 'ALL' ? null : value)} />
          <div className="w-56">
            <CommonSelect
              label="Team"
              value={list.categoryId === null ? '' : String(list.categoryId)}
              placeholder="Every team"
              options={[{ value: '', label: 'Every team' }, ...categories.map((category) => ({ value: String(category.id), label: `${category.name} (${category.openings})` }))]}
              onChange={(e) => list.setCategoryId(e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <SearchBox label="Search openings" placeholder="Search by job ID, title or location" value={list.search} onChange={list.setSearch} onSearchNow={list.searchNow} />
          <RefreshButton label="Refresh openings" busy={list.isLoading} onClick={list.refresh} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Openings">
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="pb-2 pr-3 font-semibold">Job</th>
                <th className="pb-2 pr-3 font-semibold">Team</th>
                <th className="pb-2 pr-3 font-semibold">Location & type</th>
                <th className="pb-2 pr-3 font-semibold text-right">Positions</th>
                <th className="pb-2 pr-3 font-semibold">Deadline</th>
                <th className="pb-2 pr-3 font-semibold">Status</th>
                <th className="pb-2 pr-3 font-semibold">Applicants</th>
                <th className="pb-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
              {rows.length === 0 && (
                <EmptyRow colSpan={8}>{list.isLoading ? <Loader2 className="w-5 h-5 animate-spin inline" aria-label="Loading openings" /> : emptyText}</EmptyRow>
              )}
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(openingPath(row.id))}
                  className="cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <td className="py-3 pr-3">
                    <Link to={openingPath(row.id)} className="font-semibold text-[#0071e3] hover:underline" onClick={(e) => e.stopPropagation()}>
                      {row.title}
                    </Link>
                    <div className="font-mono text-gray-400">{row.jobCode}</div>
                  </td>
                  <td className="py-3 pr-3">{row.category?.name ?? '—'}</td>
                  <td className="py-3 pr-3">
                    <div>{row.location}</div>
                    <div className="text-gray-400">
                      {WORK_MODE_LABELS[row.workMode]} · {EMPLOYMENT_TYPE_LABELS[row.employmentType]}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right">{row.positions}</td>
                  <td className={`py-3 pr-3 whitespace-nowrap ${deadlinePassed(row.applicationDeadline) ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                    {row.applicationDeadline ? formatDate(row.applicationDeadline) : 'None'}
                  </td>
                  <td className="py-3 pr-3"><OpeningStatusBadge status={row.status} /></td>
                  <td className="py-3 pr-3"><Counts row={row} /></td>
                  <td className="py-3">
                    <OpeningActions opening={row} small busy={actions.isSubmitting}
                      onPublish={(reopen) => void actions.publish(row.id, reopen)} onClose={() => actions.close(row.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={list.page} totalPages={list.totalPages} disabled={list.isLoading} onPage={list.setPage} />
      </section>
    </div>
  );
};
