import type { ClientCategory, DemoDetail, DemoPayload, DemoType, ExpensePayload } from '../types/clientDemo.types';
import { MAX_DAYS, PATTERNS, blankToNull, isGoogleMapsLink } from './clientDemo';

/** The scheduling wizard's steps, in order. */
export const PLAN_STEPS = [
  { key: 'client', label: 'Client', hint: 'Who and where' },
  { key: 'visit', label: 'Visit & staff', hint: 'When, how long, who goes' },
  { key: 'quotation', label: 'Quotation', hint: 'Budget and stay plan' },
  { key: 'review', label: 'Review', hint: 'Check and send' },
] as const;

/** The scheduling wizard's fields, as typed. */
export interface PlanForm {
  clientCategory: ClientCategory | '';
  clientCategoryOther: string;
  clientName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  mapLink: string;
  demoType: DemoType | '';
  startDate: string;
  startTime: string;
  numberOfDays: string;
  purpose: string;
  staffEmployeeIds: number[];
  proposedBudget: string;
  changeReason: string;
}

/** One planned night's stay: becomes one of a new demo's first STAY bills (each editable later). */
export interface StayForm {
  key: number;
  dayNumber: string;
  hotelName: string;
  hotelAddress: string;
  hotelMapLink: string;
  hotelPhone: string;
  hotelGstin: string;
  amount: string;
}

export type PlanErrors = Record<string, string>;

export const EMPTY_PLAN: PlanForm = {
  clientCategory: '',
  clientCategoryOther: '',
  clientName: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  mapLink: '',
  demoType: '',
  startDate: '',
  startTime: '10:00',
  numberOfDays: '1',
  purpose: '',
  staffEmployeeIds: [],
  proposedBudget: '',
  changeReason: '',
};

const text = (value: string | null) => value ?? '';

export const planFormOf = (demo: DemoDetail): PlanForm => ({
  clientCategory: demo.clientCategory,
  clientCategoryOther: text(demo.clientCategoryOther),
  clientName: demo.clientName,
  contactPerson: text(demo.contactPerson),
  contactPhone: demo.contactPhone,
  contactEmail: text(demo.contactEmail),
  addressLine: demo.addressLine,
  city: demo.city,
  state: text(demo.state),
  pincode: text(demo.pincode),
  mapLink: text(demo.mapLink),
  demoType: demo.demoType,
  startDate: demo.startDate,
  startTime: demo.startTime.slice(0, 5),
  numberOfDays: String(demo.numberOfDays),
  purpose: text(demo.purpose),
  staffEmployeeIds: demo.staff.map((member) => member.employeeId),
  proposedBudget: String(demo.proposedBudget),
  changeReason: '',
});

export const newStay = (key: number, dayNumber: number): StayForm => ({
  key,
  dayNumber: String(dayNumber),
  hotelName: '',
  hotelAddress: '',
  hotelMapLink: '',
  hotelPhone: '',
  hotelGstin: '',
  amount: '',
});

const checkText = (errors: PlanErrors, form: PlanForm, key: keyof PlanForm, label: string, required: boolean, pattern = PATTERNS.text) => {
  const value = String(form[key]).trim();
  if (!value) {
    if (required) errors[key] = `${label} is required.`;
  } else if (!pattern.test(value)) {
    errors[key] = 'Use letters, numbers and simple punctuation only.';
  }
};

const validateClient = (form: PlanForm): PlanErrors => {
  const errors: PlanErrors = {};
  if (!form.clientCategory) errors.clientCategory = 'Choose what kind of place the client is.';
  if (form.clientCategory === 'OTHER') checkText(errors, form, 'clientCategoryOther', 'Kind of place', true);
  checkText(errors, form, 'clientName', 'Client name', true);
  if (form.contactPerson.trim() && !PATTERNS.personName.test(form.contactPerson.trim())) errors.contactPerson = 'Use letters, spaces, dots and hyphens only.';
  if (!form.contactPhone.trim()) errors.contactPhone = 'Contact phone is required.';
  else if (!PATTERNS.phone.test(form.contactPhone.trim())) errors.contactPhone = 'Enter a valid phone number, e.g. +919876543210.';
  if (form.contactEmail.trim() && !PATTERNS.email.test(form.contactEmail.trim())) errors.contactEmail = 'Enter a valid email, e.g. name@company.com.';
  checkText(errors, form, 'addressLine', 'Address', true);
  checkText(errors, form, 'city', 'City', true, PATTERNS.city);
  checkText(errors, form, 'state', 'State', false, PATTERNS.city);
  if (form.pincode.trim() && !PATTERNS.pincode.test(form.pincode.trim())) errors.pincode = 'Enter a 6-digit PIN code.';
  if (form.mapLink.trim() && !isGoogleMapsLink(form.mapLink.trim())) errors.mapLink = 'Paste an https Google Maps link (maps.app.goo.gl, google.com/maps …).';
  return errors;
};

const validateVisit = (form: PlanForm, editing: DemoDetail | null): PlanErrors => {
  const errors: PlanErrors = {};
  if (!form.demoType) errors.demoType = 'Choose Appointment or Promotion.';
  if (!form.startDate) errors.startDate = 'Choose the date.';
  if (!form.startTime) errors.startTime = 'Choose the time.';
  const days = Number(form.numberOfDays);
  const lastBillDay = Math.max(0, ...(editing?.expenses.map((expense) => expense.dayNumber ?? 0) ?? []));
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) errors.numberOfDays = `Between 1 and ${MAX_DAYS} days.`;
  else if (days < lastBillDay) errors.numberOfDays = `There are bills for day ${lastBillDay}. Move or remove them first.`;
  if (form.staffEmployeeIds.length === 0) errors.staffEmployeeIds = 'Tag at least one attending staff member.';
  return errors;
};

// The first problem of a planned stay, or null
const stayProblem = (stay: StayForm, days: number): string | null => {
  const day = Number(stay.dayNumber);
  if (!stay.dayNumber || day > days) return 'Choose a day of the visit.';
  if (!stay.hotelName.trim() || !PATTERNS.text.test(stay.hotelName.trim())) return 'Enter the hotel’s name.';
  if (stay.hotelMapLink.trim() && !isGoogleMapsLink(stay.hotelMapLink.trim())) return 'The hotel location must be an https Google Maps link.';
  if (stay.hotelPhone.trim() && !PATTERNS.phone.test(stay.hotelPhone.trim())) return 'Enter a valid hotel phone number.';
  if (stay.hotelGstin.trim() && !PATTERNS.gstin.test(stay.hotelGstin.trim().toUpperCase())) return 'GSTIN is 15 characters like 22AAAAA0000A1Z5.';
  if (!PATTERNS.amount.test(stay.amount.trim())) return 'Enter the expected amount (0 if not known yet).';
  return null;
};

const validateQuotation = (form: PlanForm, stays: StayForm[]): PlanErrors => {
  const errors: PlanErrors = {};
  if (!PATTERNS.amount.test(form.proposedBudget.trim())) errors.proposedBudget = 'Enter the budget in rupees, with at most 2 decimals.';
  const days = Number(form.numberOfDays);
  for (const stay of stays) {
    const problem = stayProblem(stay, days);
    if (problem) errors[`stay-${stay.key}`] = problem;
  }
  return errors;
};

const validateReview = (form: PlanForm, editing: DemoDetail | null): PlanErrors =>
  editing && editing.status !== 'DRAFT' && !form.changeReason.trim() ? { changeReason: 'Give a reason for changing an approved demo.' } : {};

/** The problems of one wizard step (0 client, 1 visit, 2 quotation, 3 review); empty when it is complete. */
export const validatePlanStep = (step: number, form: PlanForm, stays: StayForm[], editing: DemoDetail | null): PlanErrors => {
  switch (step) {
    case 0:
      return validateClient(form);
    case 1:
      return validateVisit(form, editing);
    case 2:
      return validateQuotation(form, stays);
    default:
      return validateReview(form, editing);
  }
};

export const toDemoPayload = (form: PlanForm, editing: DemoDetail | null): DemoPayload => ({
  demoType: form.demoType as DemoType,
  clientCategory: form.clientCategory as ClientCategory,
  clientCategoryOther: form.clientCategory === 'OTHER' ? blankToNull(form.clientCategoryOther) : null,
  clientName: form.clientName.trim(),
  contactPerson: blankToNull(form.contactPerson),
  contactPhone: form.contactPhone.trim(),
  contactEmail: blankToNull(form.contactEmail),
  addressLine: form.addressLine.trim(),
  city: form.city.trim(),
  state: blankToNull(form.state),
  pincode: blankToNull(form.pincode),
  mapLink: blankToNull(form.mapLink),
  startDate: form.startDate,
  startTime: form.startTime,
  numberOfDays: Number(form.numberOfDays),
  proposedBudget: Number(form.proposedBudget),
  purpose: blankToNull(form.purpose),
  staffEmployeeIds: form.staffEmployeeIds,
  changeReason: editing && editing.status !== 'DRAFT' ? form.changeReason.trim() : null,
});

export const toStayBill = (stay: StayForm): ExpensePayload => ({
  kind: 'STAY',
  dayNumber: Number(stay.dayNumber),
  vendorName: stay.hotelName.trim(),
  vendorAddress: blankToNull(stay.hotelAddress),
  vendorMapLink: blankToNull(stay.hotelMapLink),
  vendorPhone: blankToNull(stay.hotelPhone),
  vendorGstin: blankToNull(stay.hotelGstin.toUpperCase()),
  mealType: null,
  fromPlace: null,
  toPlace: null,
  travelMode: null,
  referenceNumber: null,
  amount: Number(stay.amount),
  gstAmount: null,
  description: 'Planned stay',
  reason: null,
});

export const staysTotal = (stays: StayForm[]): number =>
  stays.reduce((sum, stay) => sum + (PATTERNS.amount.test(stay.amount.trim()) ? Number(stay.amount) : 0), 0);
