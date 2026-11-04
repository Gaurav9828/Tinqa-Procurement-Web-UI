import type { Permission } from '../../../config/access';
import { sameUser } from '../../company-profile/utils/companyProfile.utils';
import type { ApplicationDetail, ApplicationRow, Interview } from '../types/careers.types';
import { isFinal } from './careers';

/** What the signed-in user may do on an application now. UX only: the server enforces the same rules. */
export interface ApplicationAbilities {
  shortlist: boolean;
  scheduleInterview: boolean;
  /** Reschedule, cancel and record the outcome of a scheduled interview. */
  manageInterviews: boolean;
  select: boolean;
  /** Why Select is disabled (no passed interview yet), or null. */
  selectBlockedReason: string | null;
  reject: boolean;
  withdraw: boolean;
  /** Approve or return the waiting shortlist / selection. */
  decide: boolean;
  /** An approver who asked for this decision themself, so someone else confirms it. */
  ownRequest: boolean;
  rerunMatch: boolean;
}

type Can = (permission: Permission) => boolean;

export const hasPassedInterview = (interviews: Interview[]) => interviews.some((interview) => interview.outcome === 'PASSED');

/** Whether the signed-in user asked for the decision that is waiting (they can never confirm it). */
export const isOwnRequest = (application: Pick<ApplicationRow, 'pending'>, username: string | null) =>
  !!application.pending && sameUser(application.pending.requestedBy, username);

/** Approve / Return in the hub and on the detail page: an L2 holder, on someone else's request. */
export const canDecide = (application: Pick<ApplicationRow, 'status' | 'pending'>, can: Can, username: string | null) =>
  (application.status === 'SHORTLIST_PENDING' || application.status === 'SELECTION_PENDING') &&
  can('CAREER_DECISION_APPROVE') &&
  !isOwnRequest(application, username);

export const applicationAbilities = (application: ApplicationDetail, can: Can, username: string | null): ApplicationAbilities => {
  const { status } = application;
  const screens = can('CAREER_APPLICATION_SCREEN');
  const open = !isFinal(status);
  const interviewing = status === 'SHORTLISTED' || status === 'INTERVIEWING';
  const passed = hasPassedInterview(application.interviews);
  const waiting = status === 'SHORTLIST_PENDING' || status === 'SELECTION_PENDING';
  return {
    shortlist: screens && status === 'APPLIED',
    scheduleInterview: screens && interviewing,
    manageInterviews: screens && interviewing,
    select: screens && status === 'INTERVIEWING',
    selectBlockedReason: passed ? null : 'Record a passed interview first.',
    reject: screens && open,
    withdraw: screens && open,
    decide: canDecide(application, can, username),
    ownRequest: waiting && can('CAREER_DECISION_APPROVE') && isOwnRequest(application, username),
    rerunMatch: screens,
  };
};
