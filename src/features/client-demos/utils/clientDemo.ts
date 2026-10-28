import type { ClientCategory, DemoEventType, DemoStatus, DemoType, ExpenseKind, MealType, TravelMode } from '../types/clientDemo.types';

export const CLIENT_DEMOS_PATH = '/client-demos';
export const MY_DEMOS_PATH = '/my-demos';
export const demoPath = (id: number) => `${CLIENT_DEMOS_PATH}/${id}`;
export const myDemoPath = (id: number) => `${MY_DEMOS_PATH}/${id}`;

/** Mirrors the backend's ClientDemoDTOs limits. */
export const MAX_DAYS = 60;
export const MAX_STAFF = 30;

export const DEMO_TYPE_LABELS: Record<DemoType, string> = { APPOINTMENT: 'Appointment', PROMOTION: 'Promotion' };

export const CLIENT_CATEGORY_LABELS: Record<ClientCategory, string> = {
  HOTEL: 'Hotel',
  HOME_STAY: 'Home Stay',
  CORPORATE_OFFICE: 'Corporate Office',
  HOSPITAL: 'Hospital',
  CLINIC: 'Clinic',
  HOME_VISIT: 'Home Visit',
  SHOPPING_MALL: 'Shopping Mall',
  RESTAURANT: 'Restaurant',
  PUBLIC_PLACE: 'Public Place',
  OTHER: 'Other',
};

export const STATUS_LABELS: Record<DemoStatus, string> = {
  DRAFT: 'Draft',
  QUOTATION_PENDING: 'Quotation awaiting approval',
  APPROVED: 'Approved · running',
  COMPLETION_PENDING: 'Completion awaiting approval',
  COMPLETED: 'Completed · booked',
  REOPENED: 'Reopened for correction',
  CANCELLED: 'Cancelled',
};

export const STATUS_BADGE: Record<DemoStatus, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-600 dark:text-gray-300',
  QUOTATION_PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  APPROVED: 'bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400',
  COMPLETION_PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  REOPENED: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  CANCELLED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

export const EXPENSE_KIND_LABELS: Record<ExpenseKind, string> = { STAY: 'Stay', FOOD: 'Food', TRAVEL: 'Travel', OTHER: 'Other' };
export const EXPENSE_KINDS: ExpenseKind[] = ['STAY', 'FOOD', 'TRAVEL', 'OTHER'];

export const MEAL_LABELS: Record<MealType, string> = { BREAKFAST: 'Breakfast', LUNCH: 'Lunch', SNACKS: 'Snacks', DINNER: 'Dinner' };

export const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  FLIGHT: 'Flight',
  TRAIN: 'Train',
  BUS: 'Bus',
  CAB: 'Cab / taxi',
  AUTO: 'Auto rickshaw',
  METRO: 'Metro',
  OWN_VEHICLE: 'Own vehicle',
  OTHER: 'Other',
};

export const EVENT_LABELS: Record<DemoEventType, string> = {
  CREATED: 'Planned',
  UPDATED: 'Plan changed',
  QUOTATION_SUBMITTED: 'Quotation sent for approval',
  QUOTATION_APPROVED: 'Quotation approved',
  QUOTATION_REJECTED: 'Quotation rejected',
  WITHDRAWN: 'Withdrawn from approval',
  EXPENSE_ADDED: 'Bill added',
  EXPENSE_UPDATED: 'Bill changed',
  EXPENSE_REMOVED: 'Bill removed',
  INVOICE_ATTACHED: 'Invoice attached',
  COMPLETION_SUBMITTED: 'Completion sent for approval',
  COMPLETION_APPROVED: 'Completion approved',
  COMPLETION_REJECTED: 'Completion rejected',
  REOPENED: 'Reopened for correction',
  CANCELLED: 'Cancelled',
};

/** The workflow track on a demo's page; REOPENED sits on "Bills" again, CANCELLED greys the track. */
export const WORKFLOW_STEPS = [
  { key: 'plan', label: 'Plan' },
  { key: 'quotation', label: 'Quotation approval' },
  { key: 'bills', label: 'Visit & bills' },
  { key: 'completion', label: 'Completion approval' },
  { key: 'booked', label: 'Completed & booked' },
];

export const workflowIndex = (status: DemoStatus): number => {
  switch (status) {
    case 'DRAFT':
    case 'CANCELLED':
      return 0;
    case 'QUOTATION_PENDING':
      return 1;
    case 'APPROVED':
    case 'REOPENED':
      return 2;
    case 'COMPLETION_PENDING':
      return 3;
    case 'COMPLETED':
      return 4;
  }
};

/** Whether bills can be added or changed in this status (by someone allowed to). */
export const billsOpen = (status: DemoStatus) => status === 'DRAFT' || status === 'APPROVED' || status === 'REOPENED';

/** Once the quotation is approved, every change to the plan or a recorded bill needs a reason. */
export const changeNeedsReason = (status: DemoStatus) => status !== 'DRAFT';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹4,550.50 */
export const inrAmount = (rupees: number | null | undefined): string =>
  rupees === null || rupees === undefined || !Number.isFinite(rupees) ? '—' : inr.format(rupees);

const DAY = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const DAY_TIME = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** "28 Oct 2026" from an ISO date (read as a calendar day, not shifted by time zone). */
export const formatDay = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return DAY.format(new Date(y, m - 1, d));
};

export const formatDateTime = (iso: string | null | undefined): string => (iso ? DAY_TIME.format(new Date(iso)) : '—');

/** "10:30" → "10:30 am" */
export const formatTime = (time: string | null | undefined): string => {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

/** The calendar date of a visit day (1 = the start date), as an ISO date. */
export const dayDate = (startDate: string, day: number): string => {
  const [y, m, d] = startDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + day - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Mirrors the backend's ValidationPatterns, so mistakes show next to the field before anything is sent
export const PATTERNS = {
  text: /^[\p{L}\p{N}#(][\p{L}\p{M}\p{N} .,'&()/#:+_@%-]*$/u,
  personName: /^\p{L}[\p{L}\p{M} .'-]*$/u,
  city: /^\p{L}[\p{L}\p{M} .'()-]*$/u,
  phone: /^(?:(?:\+91|0)?[6-9]\d{9}|\+(?!91)[1-9]\d{7,14})$/,
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  pincode: /^[1-9]\d{5}$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  amount: /^\d{1,8}(\.\d{1,2})?$/,
};

const MAPS_HOSTS = ['maps.google.com', 'maps.google.co.in', 'maps.app.goo.gl'];

/** https Google Maps links only (as the backend's GoogleMapsUrl). */
export const isGoogleMapsLink = (value: string): boolean => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (MAPS_HOSTS.includes(host)) return true;
    if (host === 'goo.gl') return url.pathname.startsWith('/maps');
    return /^(www\.)?google\.[a-z.]+$/.test(host) && url.pathname.startsWith('/maps');
  } catch {
    return false;
  }
};

/** Trimmed text, or null when blank (the backend stores blanks as nothing). */
export const blankToNull = (value: string): string | null => (value.trim() ? value.trim() : null);
