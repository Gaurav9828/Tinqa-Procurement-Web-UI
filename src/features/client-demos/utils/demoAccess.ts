import type { Permission } from '../../../config/access';
import type { DemoDetail, DemoMode } from '../types/clientDemo.types';
import { billsOpen, inrAmount, todayIso } from './clientDemo';

/** What the signed-in user may do on a demo right now. The server enforces the same; this only shapes the page. */
export interface DemoAbilities {
  /** Change the plan and every bill (managers while planned or running; a Super Admin once reopened). */
  manages: boolean;
  addBills: boolean;
  submitQuotation: boolean;
  /** Send for completion (or a corrected completion); `notStartedYet` explains why it is disabled. */
  complete: boolean;
  notStartedYet: boolean;
  decide: boolean;
  withdraw: boolean;
  reopen: boolean;
  cancel: boolean;
  deleteDraft: boolean;
  /** An approver who can't decide because they planned, sent or attend it. */
  blockedApprover: boolean;
}

/** Whether the waiting completion is a correction of a completed (booked) demo. */
export const isCorrection = (demo: DemoDetail) =>
  demo.status === 'REOPENED' || (demo.status === 'COMPLETION_PENDING' && demo.completedAt !== null);

export const demoAbilities = (demo: DemoDetail, mode: DemoMode, can: (permission: Permission) => boolean): DemoAbilities => {
  const manager = mode === 'manager';
  const { status } = demo;
  const managePermission: Permission = status === 'REOPENED' ? 'DEMO_COMPLETED_EDIT' : 'DEMO_MANAGE';
  const manages = manager && billsOpen(status) && can(managePermission);
  const waiting = status === 'QUOTATION_PENDING' || status === 'COMPLETION_PENDING';
  const manageDemos = manager && can('DEMO_MANAGE');
  return {
    manages,
    addBills: manages || (!manager && status === 'APPROVED' && can('DEMO_EXPENSE_RECORD_OWN')),
    submitQuotation: manageDemos && status === 'DRAFT',
    complete: manages && (status === 'APPROVED' || status === 'REOPENED'),
    notStartedYet: todayIso() < demo.startDate,
    decide: manager && waiting && demo.decidableByYou,
    withdraw: manager && waiting && can(isCorrection(demo) ? 'DEMO_COMPLETED_EDIT' : 'DEMO_MANAGE'),
    reopen: manager && status === 'COMPLETED' && can('DEMO_COMPLETED_EDIT'),
    cancel: manageDemos && (status === 'DRAFT' || status === 'QUOTATION_PENDING' || status === 'APPROVED'),
    deleteDraft: manageDemos && status === 'DRAFT' && demo.submittedAt === null,
    blockedApprover: manager && waiting && can('DEMO_APPROVE') && !demo.decidableByYou,
  };
};

/** What is waiting for a decision, in words: quotation, completion or correction. */
export const waitingFor = (demo: DemoDetail): string => {
  if (demo.status === 'QUOTATION_PENDING') return 'quotation';
  return isCorrection(demo) ? 'correction' : 'completion';
};

/** The line under the progress track: where the demo is and what happens next. */
export const nextStepHint = (demo: DemoDetail, mode: DemoMode): string => {
  switch (demo.status) {
    case 'DRAFT':
      return 'Check the plan, then send the quotation. Someone else approves it before the visit.';
    case 'QUOTATION_PENDING':
      return 'Waiting for an approver to approve the budget.';
    case 'APPROVED':
      return mode === 'manager'
        ? 'Record each day’s stay, food and travel bills (attending staff add theirs too). After the visit, send it for completion with the outcome.'
        : 'Record your hotel, food and travel bills for each day, with the invoice or ticket.';
    case 'COMPLETION_PENDING':
      return `Waiting for an approver to approve the ${waitingFor(demo)}; the costs are then booked as travel & conveyance.`;
    case 'COMPLETED':
      return `${inrAmount(demo.bookedTotal)} is booked to the company account. Only a Super Admin can reopen it for a correction.`;
    case 'REOPENED':
      return `Reopened for a correction. ${inrAmount(demo.bookedTotal)} stays booked until the corrected completion is approved; then only the difference is booked.`;
    case 'CANCELLED':
      return demo.cancelReason ? `Cancelled: ${demo.cancelReason}` : 'Cancelled.';
  }
};

/** What approving books, for the approve dialog. */
export const approvalSummary = (demo: DemoDetail): string => {
  if (demo.status === 'QUOTATION_PENDING') {
    return `Budget ${inrAmount(demo.proposedBudget)} for ${demo.numberOfDays} ${demo.numberOfDays === 1 ? 'day' : 'days'}. The attending staff are told.`;
  }
  if (isCorrection(demo)) {
    return `${inrAmount(demo.total)} after correction; ${inrAmount(demo.total - demo.bookedTotal)} is booked as the difference.`;
  }
  return `${inrAmount(demo.total)} spent of a ${inrAmount(demo.proposedBudget)} budget is booked as travel & conveyance.`;
};
