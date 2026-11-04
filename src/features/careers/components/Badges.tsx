import React from 'react';
import type { ApplicationStatus, MatchSummary, OpeningStatus } from '../types/careers.types';
import { APPLICATION_STATUS_LABELS, MATCH_TONES, OPENING_STATUS_LABELS } from '../utils/careers';
import { LABEL_TEXT } from '../utils/resumeMatcher';

const BADGE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap';

const OPENING_TONES: Record<OpeningStatus, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  CLOSED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

export const OpeningStatusBadge: React.FC<{ status: OpeningStatus }> = ({ status }) => (
  <span className={`${BADGE} ${OPENING_TONES[status]}`}>{OPENING_STATUS_LABELS[status] ?? status}</span>
);

const APPLICATION_TONES: Record<ApplicationStatus, string> = {
  APPLIED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  SHORTLIST_PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  SHORTLISTED: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  INTERVIEWING: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  SELECTION_PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  SELECTED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  WITHDRAWN: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
};

export const ApplicationStatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => (
  <span data-status={status} className={`${BADGE} ${APPLICATION_TONES[status]}`}>
    {APPLICATION_STATUS_LABELS[status] ?? status}
  </span>
);

export const MatchBadge: React.FC<{ match: MatchSummary | null }> = ({ match }) =>
  match ? (
    <span data-match={match.label} className={`${BADGE} ${MATCH_TONES[match.label]}`} title={`${LABEL_TEXT[match.label]}, score ${match.score} of 100`}>
      {LABEL_TEXT[match.label]} · {match.score}
    </span>
  ) : (
    <span className={`${BADGE} bg-transparent text-gray-400 border-gray-400/30`} title="Not matched yet: it is matched when a screener first opens it">
      Not matched
    </span>
  );
