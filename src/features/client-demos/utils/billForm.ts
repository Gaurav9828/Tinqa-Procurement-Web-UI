import type { DemoExpense, ExpenseKind, ExpensePayload, MealType, TravelMode } from '../types/clientDemo.types';
import { PATTERNS, addDays, blankToNull, dayDate, formatDay, hhmm, isGoogleMapsLink } from './clientDemo';
import { at, clashMessage, clashOf, type TimeBlock } from './timeBlocks';

export const MAX_INVOICE_BYTES = 25 * 1024 * 1024;

/** The bill dialog's fields, as typed. */
export interface BillForm {
  kind: ExpenseKind;
  dayNumber: string;
  vendorName: string;
  vendorAddress: string;
  vendorMapLink: string;
  vendorPhone: string;
  vendorGstin: string;
  mealType: MealType | '';
  fromPlace: string;
  toPlace: string;
  travelMode: TravelMode | '';
  /** A stay's check-in and check-out, or a journey's departure and arrival; each a date and a time. */
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  referenceNumber: string;
  amount: string;
  gstAmount: string;
  description: string;
  reason: string;
  changeReason: string;
}

export type BillErrors = Partial<Record<keyof BillForm | 'file', string>>;

const text = (value: string | null | undefined) => value ?? '';

/** The trip a bill belongs to: its first day and how many days it has. */
export interface BillTrip {
  startDate: string;
  numberOfDays: number;
}

/** Where a stay's or journey's dates start: on its day, a night ending the next day (blank without a day). */
export const defaultDates = (kind: ExpenseKind, trip: BillTrip, day: string): Pick<BillForm, 'startDate' | 'endDate'> => {
  if (!day) return { startDate: '', endDate: '' };
  const date = dayDate(trip.startDate, Number(day));
  return { startDate: date, endDate: kind === 'STAY' ? addDays(date, 1) : date };
};

export const billFormOf = (expense: DemoExpense | null, kind: ExpenseKind, day: number | null, trip: BillTrip): BillForm => ({
  kind: expense?.kind ?? kind,
  dayNumber: String(expense?.dayNumber ?? day ?? ''),
  vendorName: text(expense?.vendorName),
  vendorAddress: text(expense?.vendorAddress),
  vendorMapLink: text(expense?.vendorMapLink),
  vendorPhone: text(expense?.vendorPhone),
  vendorGstin: text(expense?.vendorGstin),
  mealType: expense?.mealType ?? '',
  fromPlace: text(expense?.fromPlace),
  toPlace: text(expense?.toPlace),
  travelMode: expense?.travelMode ?? '',
  ...defaultDates(expense?.kind ?? kind, trip, String(expense?.dayNumber ?? day ?? '')),
  ...(expense?.startDate ? { startDate: expense.startDate } : {}),
  ...(expense?.endDate ? { endDate: expense.endDate } : {}),
  startTime: hhmm(expense?.startTime),
  endTime: hhmm(expense?.endTime),
  referenceNumber: text(expense?.referenceNumber),
  amount: expense ? String(expense.amount) : '',
  gstAmount: expense?.gstAmount == null ? '' : String(expense.gstAmount),
  description: text(expense?.description),
  reason: text(expense?.reason),
  changeReason: '',
});

/** Checks a free-text field against the backend's single-line text rule; blank is fine unless required. */
const checkText = (errors: BillErrors, form: BillForm, key: keyof BillForm, label: string, required: boolean) => {
  const value = form[key].trim();
  if (!value) {
    if (required) errors[key] = `${label} is required.`;
  } else if (!PATTERNS.text.test(value)) {
    errors[key] = 'Use letters, numbers and simple punctuation only.';
  }
};

/**
 * A stay's check-in and check-out, or a journey's departure and arrival: both times or neither, each with its date. It
 * starts on its day or the day after, ends after it starts, and ends by the day after the trip (as DemoBills.checkTimes).
 * Nor can it run into time already taken (`taken`): a journey into a visit or another journey, a stay into another stay.
 */
const checkTimes = (errors: BillErrors, form: BillForm, trip: BillTrip, [start, end]: [string, string], taken: TimeBlock[]) => {
  if (!form.startTime && !form.endTime) return;
  if (!form.startTime || !form.endTime) {
    errors[form.startTime ? 'endTime' : 'startTime'] = `Give both the ${start} and the ${end} time, or neither.`;
    return;
  }
  if (!form.startDate) errors.startDate = `Choose the ${start} date.`;
  if (!form.endDate) errors.endDate = `Choose the ${end} date.`;
  if (!form.startDate || !form.endDate) return;
  if (`${form.endDate}T${form.endTime}` <= `${form.startDate}T${form.startTime}`) {
    errors.endTime = `The ${end} must be after the ${start}.`;
    return;
  }
  if (form.dayNumber) {
    const day = dayDate(trip.startDate, Number(form.dayNumber));
    if (form.startDate < day || form.startDate > addDays(day, 1)) errors.startDate = `On day ${form.dayNumber} (${formatDay(day)}) or the day after.`;
  }
  const latest = addDays(dayDate(trip.startDate, trip.numberOfDays), 1);
  if (form.endDate > latest) errors.endDate = `By ${formatDay(latest)} at the latest, the day after the trip ends.`;
  const clash = clashOf(taken, at(form.startDate, form.startTime), at(form.endDate, form.endTime));
  if (clash) errors.endTime = clashMessage(clash);
};

// What each kind of bill must say
const KIND_RULES: Record<ExpenseKind, (errors: BillErrors, form: BillForm, trip: BillTrip, taken: TimeBlock[]) => void> = {
  STAY: (errors, form, trip, taken) => {
    checkText(errors, form, 'vendorName', 'Hotel name', true);
    checkText(errors, form, 'vendorAddress', 'Address', false);
    checkTimes(errors, form, trip, ['check-in', 'check-out'], taken);
  },
  FOOD: (errors, form) => {
    checkText(errors, form, 'vendorName', 'Restaurant name', true);
    checkText(errors, form, 'vendorAddress', 'Address', false);
    if (!form.mealType) errors.mealType = 'Choose the meal.';
  },
  TRAVEL: (errors, form, trip, taken) => {
    checkText(errors, form, 'fromPlace', 'From', true);
    checkText(errors, form, 'toPlace', 'To', true);
    if (!form.travelMode) errors.travelMode = 'Choose how the staff travelled.';
    checkTimes(errors, form, trip, ['departure', 'arrival'], taken);
  },
  OTHER: (errors, form) => {
    if (!form.description.trim()) errors.description = 'Say what this cost was for.';
    if (!form.reason.trim()) errors.reason = 'Give the reason this cost was needed.';
  },
};

const checkContact = (errors: BillErrors, form: BillForm) => {
  if (form.vendorMapLink.trim() && !isGoogleMapsLink(form.vendorMapLink.trim())) errors.vendorMapLink = 'Paste an https Google Maps link.';
  if (form.vendorPhone.trim() && !PATTERNS.phone.test(form.vendorPhone.trim())) errors.vendorPhone = 'Enter a valid phone number, e.g. +919876543210.';
  if (form.vendorGstin.trim() && !PATTERNS.gstin.test(form.vendorGstin.trim().toUpperCase())) errors.vendorGstin = 'GSTIN is 15 characters like 22AAAAA0000A1Z5.';
};

const checkMoney = (errors: BillErrors, form: BillForm) => {
  if (!PATTERNS.amount.test(form.amount.trim())) errors.amount = 'Enter the amount in rupees, with at most 2 decimals.';
  if (!form.gstAmount.trim()) return;
  if (!PATTERNS.amount.test(form.gstAmount.trim())) errors.gstAmount = 'Enter the GST in rupees, with at most 2 decimals.';
  else if (Number(form.gstAmount) > Number(form.amount)) errors.gstAmount = 'The GST is part of the amount, so it can’t be more.';
};

/**
 * The same rules the backend applies, so mistakes show next to their field before anything is sent; and a stay or
 * journey can't take time already taken (`taken`).
 */
export const validateBill = (form: BillForm, trip: BillTrip, askReason: boolean, file: File | null, taken: TimeBlock[] = []): BillErrors => {
  const errors: BillErrors = {};
  if (form.kind !== 'OTHER' && !form.dayNumber) errors.dayNumber = 'Choose the day of the visit.';
  KIND_RULES[form.kind](errors, form, trip, taken);
  checkText(errors, form, 'referenceNumber', form.kind === 'TRAVEL' ? 'Ticket / PNR number' : 'Invoice number', false);
  checkContact(errors, form);
  checkMoney(errors, form);
  if (askReason && !form.changeReason.trim()) errors.changeReason = 'Give a reason for changing a recorded bill.';
  if (file && file.size > MAX_INVOICE_BYTES) errors.file = 'The file is larger than 25 MB.';
  return errors;
};

// A stay's check-in and check-out, or a journey's departure and arrival, when their times are given
const times = (form: BillForm): Pick<ExpensePayload, 'startDate' | 'startTime' | 'endDate' | 'endTime'> =>
  (form.kind === 'STAY' || form.kind === 'TRAVEL') && form.startTime && form.endTime
    ? { startDate: form.startDate, startTime: form.startTime, endDate: form.endDate, endTime: form.endTime }
    : { startDate: null, startTime: null, endDate: null, endTime: null };

/** The request for a valid form; fields that don't belong to the kind are left out. */
export const toExpensePayload = (form: BillForm, askReason: boolean): ExpensePayload => {
  const { kind } = form;
  const stay = kind === 'STAY';
  const travel = kind === 'TRAVEL';
  return {
    kind,
    dayNumber: form.dayNumber ? Number(form.dayNumber) : null,
    vendorName: blankToNull(form.vendorName),
    vendorAddress: stay || kind === 'FOOD' ? blankToNull(form.vendorAddress) : null,
    vendorMapLink: stay ? blankToNull(form.vendorMapLink) : null,
    vendorPhone: stay ? blankToNull(form.vendorPhone) : null,
    vendorGstin: travel ? null : blankToNull(form.vendorGstin.toUpperCase()),
    mealType: kind === 'FOOD' && form.mealType ? form.mealType : null,
    fromPlace: travel ? blankToNull(form.fromPlace) : null,
    toPlace: travel ? blankToNull(form.toPlace) : null,
    travelMode: travel && form.travelMode ? form.travelMode : null,
    ...times(form),
    referenceNumber: blankToNull(form.referenceNumber),
    amount: Number(form.amount),
    gstAmount: form.gstAmount.trim() ? Number(form.gstAmount) : null,
    description: blankToNull(form.description),
    reason: kind === 'OTHER' ? blankToNull(form.reason) : null,
    changeReason: askReason ? form.changeReason.trim() : null,
  };
};

/** The label of the file picker: the chosen file, the attached one to replace, or what to attach. */
export const invoicePickerLabel = (file: File | null, attached: string | null | undefined, kind: ExpenseKind): string => {
  if (file) return file.name;
  if (attached) return `Replace ${attached}`;
  return kind === 'TRAVEL' ? 'Attach the ticket (PDF or photo)' : 'Attach the invoice (PDF or photo)';
};
