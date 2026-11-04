import type {
  ApplicationSort,
  ApplicationStatus,
  EmploymentType,
  InterviewMode,
  InterviewOutcome,
  MatchLabel,
  OpeningStatus,
  PendingKind,
  SalaryPeriod,
  WorkMode,
} from '../types/careers.types';

export const CAREERS_PATH = '/careers';
export const APPLICANTS_PATH = '/careers/applicants';
export const NEW_OPENING_PATH = '/careers/openings/new';
export const openingPath = (id: number) => `/careers/openings/${id}`;
export const editOpeningPath = (id: number) => `/careers/openings/${id}/edit`;
export const applicationPath = (id: number) => `/careers/applications/${id}`;

export const PAGE_SIZE = 20;

export const OPENING_STATUS_LABELS: Record<OpeningStatus, string> = { DRAFT: 'Draft', PUBLISHED: 'Published', CLOSED: 'Closed' };

export const WORK_MODE_LABELS: Record<WorkMode, string> = { ON_SITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' };

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  APPRENTICESHIP: 'Apprenticeship',
};

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = { ANNUAL: 'per year', MONTHLY: 'per month' };

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: 'Applied',
  SHORTLIST_PENDING: 'Shortlist awaiting L2',
  SHORTLISTED: 'Shortlisted',
  INTERVIEWING: 'Interviewing',
  SELECTION_PENDING: 'Selection awaiting L2',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export const FINAL_STATUSES: readonly ApplicationStatus[] = ['SELECTED', 'REJECTED', 'WITHDRAWN'];
export const PENDING_STATUSES: ApplicationStatus[] = ['SHORTLIST_PENDING', 'SELECTION_PENDING'];

export const isFinal = (status: ApplicationStatus) => FINAL_STATUSES.includes(status);

/** The applicants list's status chips; one chip may stand for several statuses. */
export const STATUS_CHIPS: { id: string; label: string; statuses: ApplicationStatus[] }[] = [
  { id: 'all', label: 'All', statuses: [] },
  { id: 'new', label: 'New', statuses: ['APPLIED'] },
  { id: 'pending', label: 'Awaiting L2', statuses: PENDING_STATUSES },
  { id: 'shortlisted', label: 'Shortlisted', statuses: ['SHORTLISTED'] },
  { id: 'interviewing', label: 'Interviewing', statuses: ['INTERVIEWING'] },
  { id: 'selected', label: 'Selected', statuses: ['SELECTED'] },
  { id: 'rejected', label: 'Rejected', statuses: ['REJECTED'] },
  { id: 'withdrawn', label: 'Withdrawn', statuses: ['WITHDRAWN'] },
];

export const SORT_OPTIONS: { value: ApplicationSort; label: string }[] = [
  { value: 'NEWEST', label: 'Newest' },
  { value: 'OLDEST', label: 'Oldest' },
  { value: 'MATCH', label: 'Best match' },
  { value: 'EXPERIENCE', label: 'Experience' },
];

export const MATCH_FILTERS: { value: MatchLabel; label: string }[] = [
  { value: 'STRONG', label: 'Strong' },
  { value: 'WEAK', label: 'Weak' },
  { value: 'NONE', label: 'No match' },
];

export const PENDING_KIND_LABELS: Record<PendingKind, string> = { SHORTLIST: 'Shortlist', SELECTION: 'Selection' };

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  TEAMS: 'Microsoft Teams',
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  PHONE: 'Phone',
  IN_PERSON: 'In person',
};

/** Strong green, weak amber, no match grey-red, as the list, the hub and the detail page all show it. */
export const MATCH_TONES: Record<MatchLabel, string> = {
  STRONG: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  WEAK: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  NONE: 'bg-rose-500/5 text-rose-600/80 dark:text-rose-300 border-gray-400/30',
};

/** "1 yr", "4.5 yrs"; "—" when unknown. */
export const yearsLabel = (years: number | null | undefined): string => {
  if (years === null || years === undefined) return '—';
  return years === 1 ? '1 yr' : `${years} yrs`;
};

export const OUTCOME_LABELS: Record<InterviewOutcome, string> = { PASSED: 'Passed', FAILED: 'Failed', NO_SHOW: 'No-show' };

const pad = (n: number) => String(n).padStart(2, '0');

/** Today in the browser, YYYY-MM-DD. */
export const todayIso = (now: Date = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/** "15 Dec 2026"; "—" when empty. */
export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** "30 Oct 2026, 10:15 am" from a local ISO time; "—" when empty. */
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/** Whole rupees, Indian grouping: ₹4,50,000. */
export const formatRupees = (amount: number | null | undefined): string =>
  amount === null || amount === undefined ? '—' : `₹${Math.round(amount).toLocaleString('en-IN')}`;

/** "₹3,00,000 – ₹4,50,000 per year", "Up to …", "From …"; null when neither end is set. */
export const salaryText = (min: number | null, max: number | null, period: SalaryPeriod): string | null => {
  const suffix = SALARY_PERIOD_LABELS[period];
  if (min !== null && max !== null) return `${formatRupees(min)} – ${formatRupees(max)} ${suffix}`;
  if (max !== null) return `Up to ${formatRupees(max)} ${suffix}`;
  if (min !== null) return `From ${formatRupees(min)} ${suffix}`;
  return null;
};

export const experienceText = (min: number | null, max: number | null): string => {
  const from = min ?? 0;
  if (max === null) return from === 0 ? 'Any experience' : `${from}+ yrs`;
  return `${from}–${max} yrs`;
};

/** A deadline before today: the opening can't be published and the storefront hides it. */
export const deadlinePassed = (deadline: string | null, today = todayIso()) => !!deadline && deadline < today;

export const formatBytes = (bytes: number): string => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
