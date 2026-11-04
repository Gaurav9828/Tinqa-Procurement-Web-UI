import React, { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { useOpening } from '../hooks/useCareersData';
import { useOpeningActions } from '../hooks/useCareerActions';
import type { AdminOpening } from '../types/careers.types';
import {
  CAREERS_PATH,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
  experienceText,
  formatDate,
  formatDateTime,
  salaryText,
} from '../utils/careers';
import { ApplicantsList } from '../components/ApplicantsList';
import { CareersTabs } from '../components/CareersUi';
import { OpeningStatusBadge } from '../components/Badges';
import { OpeningActions } from '../components/OpeningActions';

/** Careers › All applicants (/careers/applicants): every opening's applicants in one list. */
export const ApplicantsPage: React.FC = () => (
  <div className="space-y-5 p-6 max-w-7xl mx-auto">
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
        <Briefcase className="w-6 h-6 text-[#0071e3]" /> Careers
      </h1>
      <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">Everyone who applied, across every opening. Open one to screen it.</p>
    </div>
    <CareersTabs />
    <ApplicantsList />
  </div>
);

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-gray-400">{label}</dt>
    <dd className="font-medium text-gray-800 dark:text-gray-200">{children}</dd>
  </div>
);

const OpeningHeader: React.FC<{ opening: AdminOpening; onChanged: (opening: AdminOpening) => void; onStale: () => void }> = ({ opening, onChanged, onStale }) => {
  const actions = useOpeningActions(onChanged, onStale);
  const salary = salaryText(opening.salaryMin, opening.salaryMax, opening.salaryPeriod);
  let salaryFact = salary ?? 'Not stated';
  if (salary && !opening.salaryVisible) salaryFact = `${salary} (hidden on the website)`;
  return (
    <section className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex flex-wrap items-center gap-2">
            {opening.title} <span className="font-mono text-sm text-gray-400">{opening.jobCode}</span> <OpeningStatusBadge status={opening.status} />
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{opening.summary}</p>
        </div>
        <OpeningActions opening={opening} busy={actions.isSubmitting} onPublish={(reopen) => void actions.publish(opening.id, reopen)} onClose={() => actions.close(opening.id)} />
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Fact label="Team">{opening.category?.name ?? opening.categoryName}</Fact>
        <Fact label="Location">{opening.location} · {WORK_MODE_LABELS[opening.workMode]}</Fact>
        <Fact label="Type">{EMPLOYMENT_TYPE_LABELS[opening.employmentType]}</Fact>
        <Fact label="Experience">{experienceText(opening.experienceMinYears, opening.experienceMaxYears)}</Fact>
        <Fact label="Positions">{opening.positions}</Fact>
        <Fact label="Salary">{salaryFact}</Fact>
        <Fact label="Apply by">{opening.applicationDeadline ? formatDate(opening.applicationDeadline) : 'No deadline'}</Fact>
        <Fact label="Published">{opening.publishedAt ? formatDateTime(opening.publishedAt) : '—'}</Fact>
      </dl>
      <p className="text-gray-400">
        {opening.applications.total} applied · {opening.applications.fresh} new · {opening.applications.inProgress} in progress · {opening.applications.selected} selected
      </p>
    </section>
  );
};

/** /careers/openings/:id: the opening, its Publish / Close / Edit actions and its applicants. */
export const OpeningApplicantsPage: React.FC = () => {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const { can } = useAccess();
  const { data: opening, isLoading, refresh, replace } = useOpening(Number.isFinite(id) ? id : null);
  const onChanged = useCallback((saved: AdminOpening) => replace(saved), [replace]);

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <Link to={CAREERS_PATH} className="inline-flex items-center gap-1 text-xs text-[#0071e3] font-semibold hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to openings
      </Link>
      {opening ? (
        <OpeningHeader opening={opening} onChanged={onChanged} onStale={refresh} />
      ) : (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading the opening…</> : 'This opening could not be loaded.'}
        </p>
      )}
      {can('CAREER_APPLICATION_VIEW') && Number.isFinite(id) && <ApplicantsList openingId={id} />}
    </div>
  );
};
