/** Careers admin types, as in docs/careers.md (Ecommerce BE `/api/admin/careers/**`). */

export type OpeningStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type WorkMode = 'ON_SITE' | 'HYBRID' | 'REMOTE';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'APPRENTICESHIP';
export type SalaryPeriod = 'ANNUAL' | 'MONTHLY';
export type MatchLabel = 'STRONG' | 'WEAK' | 'NONE';

export type ApplicationStatus =
  | 'APPLIED'
  | 'SHORTLIST_PENDING'
  | 'SHORTLISTED'
  | 'INTERVIEWING'
  | 'SELECTION_PENDING'
  | 'SELECTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type ApplicationSort = 'NEWEST' | 'OLDEST' | 'MATCH' | 'EXPERIENCE';
export type InterviewMode = 'TEAMS' | 'GOOGLE_MEET' | 'ZOOM' | 'PHONE' | 'IN_PERSON';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type InterviewOutcome = 'PASSED' | 'FAILED' | 'NO_SHOW';
export type PendingKind = 'SHORTLIST' | 'SELECTION';

export interface CareerCategory {
  id: number;
  name: string;
  slug: string;
  openings: number;
}

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

/** `fresh` counts APPLIED; `inProgress` the shortlist-to-selection statuses. */
export interface ApplicationCounts {
  total: number;
  fresh: number;
  inProgress: number;
  selected: number;
}

export interface AdminOpeningRow {
  id: number;
  jobCode: string;
  title: string;
  category: CategoryRef;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  status: OpeningStatus;
  positions: number;
  applicationDeadline: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  applications: ApplicationCounts;
}

export interface OpeningRequest {
  title: string;
  categoryName: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceMinYears: number;
  experienceMaxYears: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod;
  salaryVisible: boolean;
  positions: number;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  skills: string[];
  education: string | null;
  applicationDeadline: string | null;
  version?: number;
}

export interface AdminOpening extends Omit<OpeningRequest, 'version'> {
  id: number;
  jobCode: string;
  status: OpeningStatus;
  category: CategoryRef;
  version: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  applications: ApplicationCounts;
}

export interface MatchSummary {
  label: MatchLabel;
  score: number;
}

export interface PendingDecision {
  kind: PendingKind;
  requestedBy: string;
  requestedAt: string;
  note: string | null;
}

export interface ApplicationRow {
  id: number;
  referenceNumber: string;
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  totalExperienceYears: number | null;
  currentTitle: string | null;
  currentCompany: string | null;
  noticePeriodDays: number | null;
  expectedCtc: number | null;
  status: ApplicationStatus;
  match: MatchSummary | null;
  opening: { id: number; jobCode: string; title: string };
  appliedAt: string;
  updatedAt: string | null;
  pending: PendingDecision | null;
  nextInterviewAt: string | null;
}

/** What the matcher needs from the opening; it comes with the application, so no second call. */
export interface MatchOpening {
  skills: string[];
  requirements: string[];
  niceToHave: string[];
  experienceMinYears: number | null;
  experienceMaxYears: number | null;
  education: string | null;
  description?: string | null;
}

export interface StoredMatch extends MatchSummary {
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  matcherVersion: number | string;
  computedBy: string | null;
  computedAt: string | null;
}

export interface Interview {
  id: number;
  roundName: string;
  mode: InterviewMode;
  meetingLink: string | null;
  location: string | null;
  startsAt: string;
  durationMinutes: number;
  timeZone: string;
  interviewers: string | null;
  candidateNotes: string | null;
  status: InterviewStatus;
  outcome: InterviewOutcome | null;
  rating: number | null;
  feedback: string | null;
  revision: number;
  scheduledBy: string | null;
  scheduledAt: string | null;
  cancelReason: string | null;
}

export interface HistoryEntry {
  action: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  note: string | null;
  actor: string | null;
  at: string;
}

export interface EmailRecord {
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt: string | null;
  createdAt: string;
}

export interface ApplicationDetail extends Omit<ApplicationRow, 'opening' | 'match'> {
  currentCtc: number | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  coverLetter: string | null;
  source: string | null;
  talentPool: boolean;
  consentAt: string | null;
  /** The applicant proved this address with an emailed code before applying (no account is involved). */
  emailVerifiedAt: string | null;
  resume: { fileName: string; sizeBytes: number; pages: number | null; available: boolean } | null;
  resumeText: string | null;
  opening: { id: number; jobCode: string; title: string } & MatchOpening;
  match: StoredMatch | null;
  interviews: Interview[];
  history: HistoryEntry[];
  emails: EmailRecord[];
}

export interface MatchRequest {
  label: MatchLabel;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  matcherVersion: number;
}

export interface InterviewRequest {
  roundName: string;
  mode: InterviewMode;
  meetingLink: string | null;
  location: string | null;
  startsAt: string;
  durationMinutes: number;
  timeZone: string;
  interviewers: string | null;
  candidateNotes: string | null;
}

export interface OutcomeRequest {
  outcome: InterviewOutcome;
  rating: number | null;
  feedback: string | null;
}

export interface OpeningListParams {
  status?: OpeningStatus;
  categoryId?: number;
  q?: string;
  page: number;
  size: number;
}

export interface ApplicationListParams {
  openingId?: number;
  status?: ApplicationStatus[];
  match?: MatchLabel;
  q?: string;
  sort: ApplicationSort;
  page: number;
  size: number;
}

/** Whether the website shows the Careers tab (GET/PUT /admin/careers/settings). */
export interface CareersSettings {
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}
