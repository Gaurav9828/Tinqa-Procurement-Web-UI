import type {
  ClientCategory,
  DemoDetail,
  DemoExpense,
  DemoPayload,
  DemoType,
  DemoVisit,
  ExpenseKind,
  MealType,
  PlannedBillPayload,
  TravelMode,
  VisitPayload,
} from '../types/clientDemo.types';
import {
  MAX_DAYS,
  MAX_PRODUCT_UNITS,
  PATTERNS,
  addDays,
  blankToNull,
  dayDate,
  formatDay,
  formatDayTime,
  formatTime,
  hasLegalDetails,
  hhmm,
  isGoogleMapsLink,
  offersStay,
  todayIso,
} from './clientDemo';
import { MAX_INVOICE_BYTES } from './billForm';
import { clashMessage, clashOf, planBlocks, takenFor, type TimeBlock } from './timeBlocks';

/** The scheduling wizard's steps, in order. */
export const PLAN_STEPS = [
  { key: 'clients', label: 'Clients', hint: 'Who, where and when' },
  { key: 'visit', label: 'Visit & staff', hint: 'Products and who goes' },
  { key: 'quotation', label: 'Quotation', hint: 'Budget, day by day' },
  { key: 'review', label: 'Review', hint: 'Check and send' },
] as const;

/**
 * One client visited, as typed: who, where, and the expected time there on a day of the trip. The client's own phone
 * and email (front desk, reception) tell clients apart; the contact person may be the same at several clients.
 */
export interface ClientForm {
  key: number;
  clientCategory: ClientCategory | '';
  clientCategoryOther: string;
  clientName: string;
  legalName: string;
  gstin: string;
  clientPhone: string;
  clientEmail: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  mapLink: string;
  dayNumber: string;
  startTime: string;
  endTime: string;
}

/**
 * A product taken to the demo and the barcodes of the units taken; the number of units is the number of barcodes. A
 * product listed before units were picked by barcode keeps its number (`quantity`) until barcodes are picked for it.
 */
export interface ProductPick {
  productId: number;
  productName: string;
  quantity: string;
  barcodes: string[];
}

/** How many units of the product are taken. */
export const unitsOf = (product: ProductPick): number => (product.barcodes.length > 0 ? product.barcodes.length : Number(product.quantity) || 0);

/** What a day of the quotation can hold: its journeys (as many as needed), the night's stay and each meal. */
export type PlanSlot = 'TRAVEL' | 'STAY' | MealType;
export const PLAN_SLOTS: PlanSlot[] = ['TRAVEL', 'STAY', 'BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
/** Slots a day can hold more than once. */
export const repeatable = (slot: PlanSlot): boolean => slot === 'TRAVEL';
export const PLAN_SLOT_LABELS: Record<PlanSlot, string> = {
  TRAVEL: 'Travel',
  STAY: 'Night stay',
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  SNACKS: 'Snacks',
  DINNER: 'Dinner',
};

/** A stay at a hotel the user types in, rather than one of the trip's hotel clients (`client:<key>`). */
export const OTHER_HOTEL = 'other';
export const clientSource = (clientKey: number) => `client:${clientKey}`;

/** One journey, stay or meal of the day-by-day quotation; it becomes (or changes) one of the demo's bills. */
export interface PlanBill {
  key: number;
  /** The bill it changes; null until saved. */
  id: number | null;
  slot: PlanSlot;
  dayNumber: number;
  /** A stay's hotel: one of the trip's hotel clients (`client:<key>`, filled in from it) or OTHER_HOTEL (typed). */
  source: string;
  vendorName: string;
  vendorAddress: string;
  vendorMapLink: string;
  vendorPhone: string;
  vendorGstin: string;
  /** A journey's from, to and how. */
  fromPlace: string;
  toPlace: string;
  travelMode: TravelMode | '';
  /** A stay's check-in and check-out, or a journey's departure and arrival; each a date and time, as it may end the next day. */
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  amount: string;
  /** Recorded on the bill but not shown here; sent back as they are. */
  kept: Pick<DemoExpense, 'referenceNumber' | 'gstAmount' | 'description'>;
  /** The invoice already attached, and one chosen now (uploaded once the plan is saved). */
  invoiceFileName: string | null;
  file: File | null;
}

/** The scheduling wizard's fields, as typed. */
export interface PlanForm {
  demoType: DemoType | '';
  startDate: string;
  numberOfDays: string;
  clients: ClientForm[];
  purpose: string;
  products: ProductPick[];
  staffEmployeeIds: number[];
  /** What the budget holds beyond the planned bills (the proposed budget is their total plus this), and why. */
  extraBudget: string;
  extraBudgetReason: string;
  bills: PlanBill[];
  changeReason: string;
}

export type PlanErrors = Record<string, string>;

export const newClient = (key: number, dayNumber = 1): ClientForm => ({
  key,
  clientCategory: '',
  clientCategoryOther: '',
  clientName: '',
  legalName: '',
  gstin: '',
  clientPhone: '',
  clientEmail: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  mapLink: '',
  dayNumber: String(dayNumber),
  startTime: '10:00',
  endTime: '13:00',
});

const VISIT_MINUTES = 3 * 60;
const LAST_MINUTE = 24 * 60 - 1;
const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const timeOfMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * The client added after the others: on the last client's day, starting when that day's latest visit ends and
 * lasting three hours (to 11:59 pm at most). A day with no time left moves it to 10 am the next day of the trip.
 */
export const nextClient = (key: number, form: Pick<PlanForm, 'clients' | 'numberOfDays'>): ClientForm => {
  const last = form.clients[form.clients.length - 1];
  if (!last) return newClient(key);
  const day = Number(last.dayNumber) || 1;
  const ends = form.clients.filter((client) => Number(client.dayNumber) === day && client.endTime).map((client) => minutesOf(client.endTime));
  if (!ends.length) return newClient(key, day);
  const start = Math.max(...ends);
  if (start >= LAST_MINUTE) return newClient(key, Math.min(day + 1, Math.max(Number(form.numberOfDays) || 1, day)));
  return { ...newClient(key, day), startTime: timeOfMinutes(start), endTime: timeOfMinutes(Math.min(start + VISIT_MINUTES, LAST_MINUTE)) };
};

export const EMPTY_PLAN: PlanForm = {
  demoType: '',
  startDate: '',
  numberOfDays: '1',
  clients: [newClient(1)],
  purpose: '',
  products: [],
  staffEmployeeIds: [],
  extraBudget: '',
  extraBudgetReason: '',
  bills: [],
  changeReason: '',
};

/** A key not used by any client or bill of the form. */
export const nextKey = (form: PlanForm): number => Math.max(0, ...form.clients.map((client) => client.key), ...form.bills.map((bill) => bill.key)) + 1;

const text = (value: string | null | undefined) => value ?? '';

const clientFormOf = (visit: DemoVisit, key: number): ClientForm => ({
  key,
  clientCategory: visit.clientCategory,
  clientCategoryOther: text(visit.clientCategoryOther),
  clientName: visit.clientName,
  legalName: text(visit.legalName),
  gstin: text(visit.gstin),
  clientPhone: visit.clientPhone,
  clientEmail: text(visit.clientEmail),
  contactPerson: text(visit.contactPerson),
  contactPhone: visit.contactPhone,
  contactEmail: text(visit.contactEmail),
  addressLine: visit.addressLine,
  city: visit.city,
  state: text(visit.state),
  pincode: text(visit.pincode),
  mapLink: text(visit.mapLink),
  dayNumber: String(visit.dayNumber),
  startTime: hhmm(visit.startTime),
  endTime: hhmm(visit.endTime),
});

// Where a new bill's dates and times start: a night from 9 pm to 8 am the next day, a journey on its day (times to fill)
const DEFAULT_TIMES: Record<PlanSlot, (date: string) => Pick<PlanBill, 'startDate' | 'startTime' | 'endDate' | 'endTime'>> = {
  TRAVEL: (date) => ({ startDate: date, startTime: '', endDate: date, endTime: '' }),
  STAY: (date) => ({ startDate: date, startTime: '21:00', endDate: date && addDays(date, 1), endTime: '08:00' }),
  BREAKFAST: () => ({ startDate: '', startTime: '', endDate: '', endTime: '' }),
  LUNCH: () => ({ startDate: '', startTime: '', endDate: '', endTime: '' }),
  SNACKS: () => ({ startDate: '', startTime: '', endDate: '', endTime: '' }),
  DINNER: () => ({ startDate: '', startTime: '', endDate: '', endTime: '' }),
};

/**
 * A new journey, stay or meal on a day (`date`, when the trip's start is known). A night runs from 9 pm to 8 am the
 * next day; a journey starts and ends on its day until its times are given.
 */
export const newBill = (key: number, slot: PlanSlot, dayNumber: number, date: string, source = OTHER_HOTEL): PlanBill => ({
  key,
  id: null,
  slot,
  dayNumber,
  source: slot === 'STAY' ? source : OTHER_HOTEL,
  vendorName: '',
  vendorAddress: '',
  vendorMapLink: '',
  vendorPhone: '',
  vendorGstin: '',
  fromPlace: '',
  toPlace: '',
  travelMode: '',
  ...DEFAULT_TIMES[slot](date),
  amount: '',
  kept: { referenceNumber: null, gstAmount: null, description: null },
  invoiceFileName: null,
  file: null,
});

const slotOrder = (bill: PlanBill) => bill.dayNumber * 10 + PLAN_SLOTS.indexOf(bill.slot);
const startOf = (bill: PlanBill) => (bill.startTime ? `${bill.startDate}T${bill.startTime}` : '');
/** When a stay or journey ends ("2030-05-10T18:00"), or '' until its arrival or check-out time is given. */
export const endOf = (bill: Pick<PlanBill, 'endDate' | 'endTime'> | undefined): string => (bill?.endDate && bill.endTime ? `${bill.endDate}T${bill.endTime}` : '');

// Saved bills by day, slot and start time
const orderedByTime = (bills: PlanBill[]): PlanBill[] =>
  [...bills].sort((a, b) => slotOrder(a) - slotOrder(b) || startOf(a).localeCompare(startOf(b)) || a.key - b.key);

/**
 * The journey just before a day's next one (or before `bill`, when given): the trip's journeys run one after another,
 * each departing after the one before arrives.
 */
export const previousJourney = (bills: PlanBill[], day: number, bill?: PlanBill): PlanBill | undefined => {
  const journeys = orderedBills(bills.filter((other) => other.slot === 'TRAVEL'));
  const before = bill ? journeys.slice(0, journeys.indexOf(bill)) : journeys.filter((other) => other.dayNumber <= day);
  return before[before.length - 1];
};

const slotOf = (expense: DemoExpense): PlanSlot => (expense.kind === 'FOOD' ? expense.mealType ?? 'LUNCH' : (expense.kind as 'STAY' | 'TRAVEL'));

const billOf = (expense: DemoExpense, key: number, clients: ClientForm[], startDate: string): PlanBill => {
  const slot = slotOf(expense);
  const day = expense.dayNumber ?? 1;
  // A stay at one of the trip's hotel clients stays linked to it
  const hotel = slot === 'STAY' ? clients.find((client) => offersStay(client.clientCategory) && client.clientName === expense.vendorName) : undefined;
  const fresh = newBill(key, slot, day, dayDate(startDate, day), hotel ? clientSource(hotel.key) : OTHER_HOTEL);
  return {
    ...fresh,
    id: expense.id,
    vendorName: text(expense.vendorName),
    vendorAddress: text(expense.vendorAddress),
    vendorMapLink: text(expense.vendorMapLink),
    vendorPhone: text(expense.vendorPhone),
    vendorGstin: text(expense.vendorGstin),
    fromPlace: text(expense.fromPlace),
    toPlace: text(expense.toPlace),
    travelMode: expense.travelMode ?? '',
    // A bill recorded without its times keeps the day's dates, to fill in
    startDate: expense.startDate ?? fresh.startDate,
    startTime: hhmm(expense.startTime),
    endDate: expense.endDate ?? fresh.endDate,
    endTime: hhmm(expense.endTime),
    amount: String(expense.amount),
    kept: { referenceNumber: expense.referenceNumber, gstAmount: expense.gstAmount, description: expense.description },
    invoiceFileName: expense.invoiceFileName,
  };
};

export const planFormOf = (demo: DemoDetail): PlanForm => {
  const clients = demo.clients.map((visit, index) => clientFormOf(visit, index + 1));
  const plannable = demo.expenses.filter((expense) => expense.kind !== 'OTHER');
  // Keyed in time order, as the journeys of a day are shown in the order they were added
  const bills = orderedByTime(plannable.map((expense, index) => billOf(expense, index, clients, demo.startDate)))
    .map((bill, index) => ({ ...bill, key: clients.length + index + 1 }));
  // The budget stays as it is unless the plan changes: what the bills don't cover is the extra
  const extra = Math.max(0, Math.round((demo.proposedBudget - billsTotal(bills)) * 100) / 100);
  return {
    demoType: demo.demoType,
    startDate: demo.startDate,
    numberOfDays: String(demo.numberOfDays),
    clients,
    purpose: text(demo.purpose),
    products: demo.products.map((product) => ({ ...product, quantity: String(product.quantity), barcodes: product.barcodes ?? [] })),
    staffEmployeeIds: demo.staff.map((member) => member.employeeId),
    extraBudget: extra > 0 ? String(extra) : '',
    extraBudgetReason: extra > 0 ? text(demo.extraBudgetReason) : '',
    bills,
    changeReason: '',
  };
};

/** The hotel clients of the trip a stay can be at. */
export const stayClients = (form: PlanForm): ClientForm[] => form.clients.filter((client) => offersStay(client.clientCategory) && client.clientName.trim());

/** The hotel details of a stay: its client's (kept up to date with the client step) or as typed. */
export const stayVendor = (bill: PlanBill, clients: ClientForm[]): Pick<PlanBill, 'vendorName' | 'vendorAddress' | 'vendorMapLink' | 'vendorPhone' | 'vendorGstin'> => {
  const client = bill.slot === 'STAY' ? clients.find((candidate) => clientSource(candidate.key) === bill.source && offersStay(candidate.clientCategory)) : undefined;
  if (!client) return bill;
  return {
    vendorName: client.clientName,
    vendorAddress: [client.addressLine, client.city].map((part) => part.trim()).filter(Boolean).join(', ').slice(0, 300),
    vendorMapLink: client.mapLink,
    vendorPhone: client.clientPhone,
    vendorGstin: client.gstin,
  };
};

// ------------------------------------------------------------------ checks

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const INDIAN_PHONE = /^(?:\+91|0)?[6-9]\d{9}$/;

// An Indian number however it is written (+91…, 0… or the 10 digits alone) is its 10 digits; others are as typed
const phoneKey = (phone: string) => {
  const trimmed = phone.trim();
  return INDIAN_PHONE.test(trimmed) ? trimmed.slice(-10) : trimmed;
};

/** Whether two visits are to the same client: the same client phone, or the same client email (mirrors DemoVisit.sameClientAs). */
export const sameClient = (a: ClientForm, b: ClientForm): boolean =>
  (a.clientPhone.trim() !== '' && phoneKey(a.clientPhone) === phoneKey(b.clientPhone))
  || (a.clientEmail.trim() !== '' && a.clientEmail.trim().toLowerCase() === b.clientEmail.trim().toLowerCase());

/**
 * The clients whose visits overlap another visit on the same day, or follow a visit to the same client with no other
 * client in between, with what is wrong.
 */
export const visitClashes = (clients: ClientForm[]): Record<number, string> => {
  const clashes: Record<number, string> = {};
  const timed = clients.filter((client) => client.dayNumber && client.startTime && client.endTime && minutes(client.endTime) > minutes(client.startTime));
  const byTime = [...timed].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber) || minutes(a.startTime) - minutes(b.startTime));
  byTime.forEach((client, index) => {
    const before = byTime[index - 1];
    if (before && before.dayNumber === client.dayNumber && sameClient(before, client)) {
      clashes[client.key] = `${client.clientName.trim() || 'This client'} is visited twice in a row on day ${client.dayNumber} (the same client phone or email). `
        + `Make it one visit from ${formatTime(before.startTime)} to ${formatTime(client.endTime)}, or visit another client in between.`;
    }
  });
  for (const client of timed) {
    const other = timed.find((candidate) => candidate.key !== client.key && candidate.dayNumber === client.dayNumber
      && minutes(candidate.startTime) < minutes(client.endTime) && minutes(client.startTime) < minutes(candidate.endTime));
    if (other) clashes[client.key] = `Clashes with ${other.clientName.trim() || 'another client'} on day ${client.dayNumber}. Give each visit its own time.`;
  }
  return clashes;
};

const checkText = (errors: PlanErrors, key: string, value: string, label: string, required: boolean, pattern = PATTERNS.text) => {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) errors[key] = `${label} is required.`;
  } else if (!pattern.test(trimmed)) {
    errors[key] = 'Use letters, numbers and simple punctuation only.';
  }
};

const validateOneClient = (errors: PlanErrors, client: ClientForm, days: number) => {
  checkClientDetails(errors, client);
  checkClientContact(errors, client);
  checkClientSlot(errors, client, days);
};

const checkClientDetails = (errors: PlanErrors, client: ClientForm) => {
  const at = (field: string) => `client-${client.key}-${field}`;
  if (!client.clientCategory) errors[at('clientCategory')] = 'Choose what kind of place the client is.';
  if (client.clientCategory === 'OTHER') checkText(errors, at('clientCategoryOther'), client.clientCategoryOther, 'Kind of place', true);
  checkText(errors, at('clientName'), client.clientName, 'Client name', true);
  if (hasLegalDetails(client.clientCategory)) {
    checkText(errors, at('legalName'), client.legalName, 'Legal name', false);
    if (client.gstin.trim() && !PATTERNS.gstin.test(client.gstin.trim().toUpperCase())) errors[at('gstin')] = 'GSTIN is 15 characters like 22AAAAA0000A1Z5.';
  }
};

const checkClientContact = (errors: PlanErrors, client: ClientForm) => {
  const at = (field: string) => `client-${client.key}-${field}`;
  if (!client.clientPhone.trim()) errors[at('clientPhone')] = 'The client’s own phone is required.';
  else if (!PATTERNS.phone.test(client.clientPhone.trim())) errors[at('clientPhone')] = 'Enter a valid phone number, e.g. +919876543210.';
  if (client.clientEmail.trim() && !PATTERNS.email.test(client.clientEmail.trim())) errors[at('clientEmail')] = 'Enter a valid email, e.g. frontdesk@hotel.com.';
  if (client.contactPerson.trim() && !PATTERNS.personName.test(client.contactPerson.trim())) errors[at('contactPerson')] = 'Use letters, spaces, dots and hyphens only.';
  if (!client.contactPhone.trim()) errors[at('contactPhone')] = 'Contact phone is required.';
  else if (!PATTERNS.phone.test(client.contactPhone.trim())) errors[at('contactPhone')] = 'Enter a valid phone number, e.g. +919876543210.';
  if (client.contactEmail.trim() && !PATTERNS.email.test(client.contactEmail.trim())) errors[at('contactEmail')] = 'Enter a valid email, e.g. name@company.com.';
  checkText(errors, at('addressLine'), client.addressLine, 'Address', true);
  checkText(errors, at('city'), client.city, 'City', true, PATTERNS.city);
  checkText(errors, at('state'), client.state, 'State', false, PATTERNS.city);
  if (!client.pincode.trim()) errors[at('pincode')] = 'PIN code is required.';
  else if (!PATTERNS.pincode.test(client.pincode.trim())) errors[at('pincode')] = 'Enter a 6-digit PIN code.';
  if (client.mapLink.trim() && !isGoogleMapsLink(client.mapLink.trim())) errors[at('mapLink')] = 'Paste an https Google Maps link (maps.app.goo.gl, google.com/maps …).';
};

const checkClientSlot = (errors: PlanErrors, client: ClientForm, days: number) => {
  const at = (field: string) => `client-${client.key}-${field}`;
  if (!client.dayNumber || Number(client.dayNumber) > days) errors[at('dayNumber')] = 'Choose a day of the trip.';
  if (!client.startTime) errors[at('startTime')] = 'Choose the time.';
  if (!client.endTime) errors[at('endTime')] = 'Choose the time.';
  else if (client.startTime && minutes(client.endTime) <= minutes(client.startTime)) errors[at('endTime')] = 'Must be after the start time.';
};

const validateClients = (form: PlanForm, editing: DemoDetail | null, isNew: boolean): PlanErrors => {
  const errors: PlanErrors = {};
  if (!form.startDate) errors.startDate = 'Choose the date.';
  const days = Number(form.numberOfDays);
  // Other bills are kept on the demo's page, so the trip can't be shortened past them here
  const lastOtherBillDay = Math.max(0, ...(editing?.expenses ?? [])
    .filter((expense) => expense.kind === 'OTHER').map((expense) => expense.dayNumber ?? 0));
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) errors.numberOfDays = `Between 1 and ${MAX_DAYS} days.`;
  else if (days < lastOtherBillDay) errors.numberOfDays = `There are other bills for day ${lastOtherBillDay}. Move or remove them on the demo first.`;
  if (isNew && form.startDate && form.startDate < todayIso()) errors.startDate = 'Choose today or a later date.';
  if (form.clients.length === 0) errors.clients = 'Add at least one client to visit.';
  const valid = Number.isInteger(days) && days >= 1 ? Math.min(days, MAX_DAYS) : MAX_DAYS;
  form.clients.forEach((client) => validateOneClient(errors, client, valid));
  Object.entries(visitClashes(form.clients)).forEach(([key, message]) => {
    errors[`client-${key}-slot`] = message;
  });
  // Nor can a visit run into a journey's time (when editing a plan that has them)
  const blocks = planBlocks(form);
  for (const client of form.clients) {
    const own = blocks.find((block) => block.key === `client-${client.key}`);
    const clash = own && clashOf(takenFor(blocks, own.key, 'busy').filter((block) => block.key.startsWith('bill-')), own.from, own.to);
    if (clash && !errors[`client-${client.key}-slot`]) errors[`client-${client.key}-slot`] = clashMessage(clash);
  }
  return errors;
};

const validateVisit = (form: PlanForm): PlanErrors => {
  const errors: PlanErrors = {};
  if (!form.demoType) errors.demoType = 'Choose Appointment or Promotion.';
  if (form.staffEmployeeIds.length === 0) errors.staffEmployeeIds = 'Tag at least one attending staff member.';
  for (const product of form.products) {
    if (product.barcodes.length > MAX_PRODUCT_UNITS) {
      errors[`product-${product.productId}`] = `At most ${MAX_PRODUCT_UNITS} units.`;
    } else if (product.barcodes.length === 0 && (Number(product.quantity) || 0) <= 0) {
      errors[`product-${product.productId}`] = 'Pick the barcode of each unit you take.';
    }
  }
  return errors;
};

// The first problem of where a stay or meal is, or null
const vendorProblem = (bill: PlanBill, clients: ClientForm[]): string | null => {
  if (bill.slot === 'TRAVEL') return null;
  const vendor = stayVendor(bill, clients);
  if (!vendor.vendorName.trim() || !PATTERNS.text.test(vendor.vendorName.trim())) return bill.slot === 'STAY' ? 'Choose or enter the hotel’s name.' : 'Enter where the meal is had.';
  if (vendor.vendorAddress.trim() && !PATTERNS.text.test(vendor.vendorAddress.trim())) return 'Use letters, numbers and simple punctuation in the address.';
  if (vendor.vendorMapLink.trim() && !isGoogleMapsLink(vendor.vendorMapLink.trim())) return 'The location must be an https Google Maps link.';
  if (vendor.vendorPhone.trim() && !PATTERNS.phone.test(vendor.vendorPhone.trim())) return 'Enter a valid phone number.';
  if (vendor.vendorGstin.trim() && !PATTERNS.gstin.test(vendor.vendorGstin.trim().toUpperCase())) return 'GSTIN is 15 characters like 22AAAAA0000A1Z5.';
  return null;
};

// The first problem of a journey's from, to and how, or null
const travelProblem = (bill: PlanBill): string | null => {
  if (bill.slot !== 'TRAVEL') return null;
  if (!bill.travelMode) return 'Choose how the staff travel.';
  if (!bill.fromPlace.trim() || !PATTERNS.text.test(bill.fromPlace.trim())) return 'Enter where the journey starts.';
  if (!bill.toPlace.trim() || !PATTERNS.text.test(bill.toPlace.trim())) return 'Enter where the journey ends.';
  return null;
};

/** What a stay's or journey's start and end are called. */
export const timeLabels = (slot: PlanSlot): [string, string] => (slot === 'STAY' ? ['Check-in', 'Check-out'] : ['Departure', 'Arrival']);

/**
 * The first problem of a stay's or journey's dates and times, or null. Each is a date and a time, as a night or an
 * overnight journey ends the next day. It starts on its day or the day after, ends after it starts, and ends by the
 * day after the trip (mirrors the backend's DemoBills.checkTimes). A bill recorded without times may stay without.
 */
const timesProblem = (bill: PlanBill, form: PlanForm, days: number): string | null => {
  if (bill.slot !== 'STAY' && bill.slot !== 'TRAVEL') return null;
  if (bill.id !== null && !bill.startTime && !bill.endTime) return null;
  const [start, end] = timeLabels(bill.slot).map((label) => label.toLowerCase());
  if (!bill.startDate || !bill.startTime || !bill.endDate || !bill.endTime) return `Choose the ${start} and ${end} dates and times.`;
  if (`${bill.endDate}T${bill.endTime}` <= `${bill.startDate}T${bill.startTime}`) return `The ${end} must be after the ${start}.`;
  const before = bill.slot === 'TRAVEL' ? previousJourney(form.bills, bill.dayNumber, bill) : undefined;
  if (before && endOf(before) && startOf(bill) < endOf(before)) {
    return `Journeys run one after another: depart when the journey before arrives or later (${formatDayTime(before.endDate, before.endTime)}).`;
  }
  if (!form.startDate) return null;
  const day = dayDate(form.startDate, bill.dayNumber);
  if (bill.startDate < day || bill.startDate > addDays(day, 1)) return `The ${start} is on day ${bill.dayNumber} (${formatDay(day)}) or the day after.`;
  const latest = addDays(dayDate(form.startDate, days), 1);
  if (bill.endDate > latest) return `The ${end} is by ${formatDay(latest)} at the latest, the day after the trip ends.`;
  return null;
};

// A journey can't run into a visit or another journey, nor a night into another night: time can be used only once
const clashProblem = (bill: PlanBill, blocks: TimeBlock[]): string | null => {
  const own = blocks.find((block) => block.key === `bill-${bill.key}`);
  const clash = own && clashOf(takenFor(blocks, own.key, own.kind), own.from, own.to);
  return clash ? clashMessage(clash) : null;
};

// The first problem of a planned journey, stay or meal, or null
const billProblem = (bill: PlanBill, form: PlanForm, days: number, blocks: TimeBlock[]): string | null => {
  if (bill.dayNumber > days) return `Day ${bill.dayNumber} is past the end of the trip. Remove it, or make the trip longer.`;
  const problem = travelProblem(bill) ?? vendorProblem(bill, form.clients) ?? timesProblem(bill, form, days) ?? clashProblem(bill, blocks);
  if (problem) return problem;
  if (!PATTERNS.amount.test(bill.amount.trim())) return 'Enter the expected amount (0 if not known yet).';
  if (bill.file && bill.file.size > MAX_INVOICE_BYTES) return 'The invoice file is larger than 25 MB.';
  return null;
};

const validateQuotation = (form: PlanForm): PlanErrors => {
  const errors: PlanErrors = {};
  const days = Number(form.numberOfDays);
  const blocks = planBlocks(form);
  for (const bill of form.bills) {
    const problem = billProblem(bill, form, days, blocks);
    if (problem) errors[`bill-${bill.key}`] = problem;
  }
  if (form.extraBudget.trim() && !PATTERNS.amount.test(form.extraBudget.trim())) errors.extraBudget = 'Enter the extra in rupees, with at most 2 decimals.';
  else if (extraAmount(form) > 0 && !form.extraBudgetReason.trim()) {
    errors.extraBudgetReason = 'Say why the extra is needed, with its breakup (e.g. Parking 500, local guide 1,500).';
  }
  return errors;
};

const validateReview = (form: PlanForm, editing: DemoDetail | null): PlanErrors =>
  editing && editing.status !== 'DRAFT' && !form.changeReason.trim() ? { changeReason: 'Give a reason for changing an approved demo.' } : {};

/** The problems of one wizard step (0 clients, 1 visit, 2 quotation, 3 review); empty when it is complete. */
export const validatePlanStep = (step: number, form: PlanForm, editing: DemoDetail | null): PlanErrors => {
  switch (step) {
    case 0:
      return validateClients(form, editing, editing === null);
    case 1:
      return validateVisit(form);
    case 2:
      return validateQuotation(form);
    default:
      return validateReview(form, editing);
  }
};

// ------------------------------------------------------------------ requests

const toVisit = (client: ClientForm): VisitPayload => {
  const business = hasLegalDetails(client.clientCategory);
  return {
    clientCategory: client.clientCategory as ClientCategory,
    clientCategoryOther: client.clientCategory === 'OTHER' ? blankToNull(client.clientCategoryOther) : null,
    clientName: client.clientName.trim(),
    legalName: business ? blankToNull(client.legalName) : null,
    gstin: business ? blankToNull(client.gstin.toUpperCase()) : null,
    clientPhone: client.clientPhone.trim(),
    clientEmail: blankToNull(client.clientEmail),
    contactPerson: blankToNull(client.contactPerson),
    contactPhone: client.contactPhone.trim(),
    contactEmail: blankToNull(client.contactEmail),
    addressLine: client.addressLine.trim(),
    city: client.city.trim(),
    state: blankToNull(client.state),
    pincode: blankToNull(client.pincode),
    mapLink: blankToNull(client.mapLink),
    dayNumber: Number(client.dayNumber),
    startTime: client.startTime,
    endTime: client.endTime,
  };
};

// A journey's from, to and how (nothing for a stay or meal)
const journeyOf = (bill: PlanBill): Pick<PlannedBillPayload, 'fromPlace' | 'toPlace' | 'travelMode'> =>
  bill.slot === 'TRAVEL' && bill.travelMode
    ? { fromPlace: bill.fromPlace.trim(), toPlace: bill.toPlace.trim(), travelMode: bill.travelMode }
    : { fromPlace: null, toPlace: null, travelMode: null };

// A stay's or journey's dates and times, once its times are given
const timesOf = (bill: PlanBill): Pick<PlannedBillPayload, 'startDate' | 'startTime' | 'endDate' | 'endTime'> =>
  (bill.slot === 'STAY' || bill.slot === 'TRAVEL') && bill.startTime && bill.endTime
    ? { startDate: bill.startDate, startTime: bill.startTime, endDate: bill.endDate, endTime: bill.endTime }
    : { startDate: null, startTime: null, endDate: null, endTime: null };

const kindOf = (slot: PlanSlot): ExpenseKind => (slot === 'STAY' || slot === 'TRAVEL' ? slot : 'FOOD');

export const toPlannedBill = (bill: PlanBill, clients: ClientForm[]): PlannedBillPayload => {
  const stay = bill.slot === 'STAY';
  const travel = bill.slot === 'TRAVEL';
  const vendor = stayVendor(bill, clients);
  return {
    id: bill.id,
    kind: kindOf(bill.slot),
    dayNumber: bill.dayNumber,
    // A journey's operator, if it was recorded on the demo
    vendorName: blankToNull(vendor.vendorName),
    vendorAddress: travel ? null : blankToNull(vendor.vendorAddress),
    vendorMapLink: stay ? blankToNull(vendor.vendorMapLink) : null,
    vendorPhone: stay ? blankToNull(vendor.vendorPhone) : null,
    vendorGstin: travel ? null : blankToNull(vendor.vendorGstin.toUpperCase()),
    mealType: kindOf(bill.slot) === 'FOOD' ? (bill.slot as MealType) : null,
    ...journeyOf(bill),
    ...timesOf(bill),
    referenceNumber: bill.kept.referenceNumber,
    amount: Number(bill.amount),
    gstAmount: bill.kept.gstAmount !== null && bill.kept.gstAmount <= Number(bill.amount) ? bill.kept.gstAmount : null,
    description: bill.kept.description ?? (bill.id === null ? 'Planned in the quotation' : null),
    reason: null,
  };
};

/**
 * The plan's bills in the order they are sent and shown: by day, then as placed on the day. A new bill takes its slot's
 * place (travel, stay, breakfast … dinner; a journey after the day's others), and each can be dragged to another place
 * on its day. The day's journeys run in that order: each departs after the one above arrives.
 */
export const orderedBills = (bills: PlanBill[]): PlanBill[] => [...bills].sort((a, b) => a.dayNumber - b.dayNumber);

/** The bills with a new one at its slot's place on its day: before the day's first bill of a later slot. */
export const withBill = (bills: PlanBill[], bill: PlanBill): PlanBill[] => {
  const later = bills.findIndex((other) => other.dayNumber === bill.dayNumber && slotOrder(other) > slotOrder(bill));
  return later < 0 ? [...bills, bill] : [...bills.slice(0, later), bill, ...bills.slice(later)];
};

/** The bills with a day's bill moved from one place on that day (0 the first) to another. */
export const moveBill = (bills: PlanBill[], day: number, from: number, to: number): PlanBill[] => {
  const ofDay = orderedBills(bills.filter((bill) => bill.dayNumber === day));
  if (from === to || !ofDay[from] || !ofDay[to]) return bills;
  const [moved] = ofDay.splice(from, 1);
  ofDay.splice(to, 0, moved);
  return [...bills.filter((bill) => bill.dayNumber !== day), ...ofDay];
};

export const toDemoPayload = (form: PlanForm, editing: DemoDetail | null): DemoPayload => ({
  demoType: form.demoType as DemoType,
  clients: form.clients.map(toVisit),
  startDate: form.startDate,
  numberOfDays: Number(form.numberOfDays),
  proposedBudget: proposedBudget(form),
  extraBudgetReason: extraAmount(form) > 0 ? form.extraBudgetReason.trim() : null,
  purpose: blankToNull(form.purpose),
  staffEmployeeIds: form.staffEmployeeIds,
  products: form.products.map((product) => ({
    productId: product.productId,
    productName: product.productName,
    quantity: unitsOf(product),
    barcodes: product.barcodes,
  })),
  plannedBills: orderedBills(form.bills).map((bill) => toPlannedBill(bill, form.clients)),
  changeReason: editing && editing.status !== 'DRAFT' ? form.changeReason.trim() : null,
});

const amountOf = (bill: PlanBill) => (PATTERNS.amount.test(bill.amount.trim()) ? Number(bill.amount) : 0);

/** What the planned stays and meals come to (of the given day, or all). */
export const billsTotal = (bills: PlanBill[], day?: number): number =>
  bills.filter((bill) => day === undefined || bill.dayNumber === day).reduce((sum, bill) => sum + amountOf(bill), 0);

/** The extra budget beyond the planned bills, in rupees (0 while blank or not a valid amount). */
export const extraAmount = (form: PlanForm): number => (PATTERNS.amount.test(form.extraBudget.trim()) ? Number(form.extraBudget) : 0);

/** The proposed budget: the day-by-day plan's total plus the extra. */
export const proposedBudget = (form: PlanForm): number => Math.round((billsTotal(form.bills) + extraAmount(form)) * 100) / 100;

/** The bills with their dates moved by some days, as when the trip's start date moves. */
export const shiftBillDates = (bills: PlanBill[], days: number): PlanBill[] =>
  days === 0 ? bills : bills.map((bill) => ({
    ...bill,
    startDate: bill.startDate && addDays(bill.startDate, days),
    endDate: bill.endDate && addDays(bill.endDate, days),
  }));
