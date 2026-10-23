import type { MonthState, SalaryPaymentStatus } from '../types/payroll.types';

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'] as const;

/** "October 2026" */
export const periodLabel = (year: number, month: number): string => `${MONTH_NAMES[month - 1]} ${year}`;

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹45,000.00 (amounts arrive in rupees) */
export const inrAmount = (rupees: number | null | undefined): string =>
  rupees === null || rupees === undefined || !Number.isFinite(rupees) ? '—' : inr.format(rupees);

export const STATUS_LABELS: Record<SalaryPaymentStatus, string> = {
  PENDING_APPROVAL: 'Awaiting confirmation',
  APPROVED: 'Paid · confirmed',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export const MONTH_STATE_LABELS: Record<MonthState, string> = {
  UPCOMING: 'Upcoming',
  NO_EMPLOYEES: 'Nobody to pay',
  NOT_STARTED: 'Not paid yet',
  IN_PROGRESS: 'In progress',
  AWAITING_APPROVAL: 'Awaiting confirmation',
  PAID: 'All paid',
};

/** Today in the browser's time zone as yyyy-mm-dd (for date inputs). */
export const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** The first day of a pay month as yyyy-mm-dd. */
export const monthStartIso = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}-01`;

/** The default transfer date of a month: its last day, or today if that hasn't come yet. */
export const defaultTransferDate = (year: number, month: number): string => {
  const last = new Date(year, month, 0);
  const lastIso = `${year}-${String(month).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  const today = todayIso();
  return lastIso > today ? today : lastIso;
};
