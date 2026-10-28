import type { DemoExpense, ExpenseKind, ExpensePayload, MealType, TravelMode } from '../types/clientDemo.types';
import { PATTERNS, blankToNull, isGoogleMapsLink } from './clientDemo';

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
  referenceNumber: string;
  amount: string;
  gstAmount: string;
  description: string;
  reason: string;
  changeReason: string;
}

export type BillErrors = Partial<Record<keyof BillForm | 'file', string>>;

const text = (value: string | null | undefined) => value ?? '';

export const billFormOf = (expense: DemoExpense | null, kind: ExpenseKind, day: number | null): BillForm => ({
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

// What each kind of bill must say
const KIND_RULES: Record<ExpenseKind, (errors: BillErrors, form: BillForm) => void> = {
  STAY: (errors, form) => {
    checkText(errors, form, 'vendorName', 'Hotel name', true);
    checkText(errors, form, 'vendorAddress', 'Address', false);
  },
  FOOD: (errors, form) => {
    checkText(errors, form, 'vendorName', 'Restaurant name', true);
    checkText(errors, form, 'vendorAddress', 'Address', false);
    if (!form.mealType) errors.mealType = 'Choose the meal.';
  },
  TRAVEL: (errors, form) => {
    checkText(errors, form, 'fromPlace', 'From', true);
    checkText(errors, form, 'toPlace', 'To', true);
    if (!form.travelMode) errors.travelMode = 'Choose how the staff travelled.';
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

/** The same rules the backend applies, so mistakes show next to their field before anything is sent. */
export const validateBill = (form: BillForm, askReason: boolean, file: File | null): BillErrors => {
  const errors: BillErrors = {};
  if (form.kind !== 'OTHER' && !form.dayNumber) errors.dayNumber = 'Choose the day of the visit.';
  KIND_RULES[form.kind](errors, form);
  checkText(errors, form, 'referenceNumber', form.kind === 'TRAVEL' ? 'Ticket / PNR number' : 'Invoice number', false);
  checkContact(errors, form);
  checkMoney(errors, form);
  if (askReason && !form.changeReason.trim()) errors.changeReason = 'Give a reason for changing a recorded bill.';
  if (file && file.size > MAX_INVOICE_BYTES) errors.file = 'The file is larger than 25 MB.';
  return errors;
};

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
