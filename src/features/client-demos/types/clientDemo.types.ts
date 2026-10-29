/** Client demos & meetings (Procurement /v1/admin/client-demos, attending staff /v1/client-demos/mine). */

export type DemoType = 'APPOINTMENT' | 'PROMOTION';

export type ClientCategory =
  | 'HOTEL'
  | 'HOME_STAY'
  | 'CORPORATE_OFFICE'
  | 'HOSPITAL'
  | 'CLINIC'
  | 'HOME_VISIT'
  | 'SHOPPING_MALL'
  | 'RESTAURANT'
  | 'PUBLIC_PLACE'
  | 'OTHER';

/**
 * DRAFT → QUOTATION_PENDING → APPROVED (bills recorded) → COMPLETION_PENDING → COMPLETED (booked). A Super Admin may
 * reopen a completed demo (REOPENED); its completion is approved again. Rejections go back one step.
 */
export type DemoStatus = 'DRAFT' | 'QUOTATION_PENDING' | 'APPROVED' | 'COMPLETION_PENDING' | 'COMPLETED' | 'REOPENED' | 'CANCELLED';

export type ExpenseKind = 'STAY' | 'FOOD' | 'TRAVEL' | 'OTHER';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
export type TravelMode = 'FLIGHT' | 'TRAIN' | 'BUS' | 'CAB' | 'AUTO' | 'METRO' | 'OWN_VEHICLE' | 'OTHER';

export type DemoEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'QUOTATION_SUBMITTED'
  | 'QUOTATION_APPROVED'
  | 'QUOTATION_REJECTED'
  | 'WITHDRAWN'
  | 'EXPENSE_ADDED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_REMOVED'
  | 'INVOICE_ATTACHED'
  | 'COMPLETION_SUBMITTED'
  | 'COMPLETION_APPROVED'
  | 'COMPLETION_REJECTED'
  | 'REOPENED'
  | 'CANCELLED'
  | 'UNITS_HANDED_OUT'
  | 'UNITS_HANDED_BACK'
  | 'UNIT_WRITTEN_OFF';

export interface StaffMember {
  employeeId: number;
  employeeCode: string | null;
  name: string | null;
  designation: string | null;
}

export interface DemoSummary {
  id: number;
  reference: string;
  demoType: DemoType;
  status: DemoStatus;
  statusLabel: string;
  clientCategory: ClientCategory;
  clientCategoryLabel: string;
  clientName: string;
  city: string;
  /** How many clients the trip visits; the one above is the first. */
  clientCount: number;
  startDate: string;
  startTime: string;
  numberOfDays: number;
  endDate: string;
  proposedBudget: number;
  total: number;
  bookedTotal: number;
  staffNames: string[];
  createdByName: string | null;
  submittedAt: string | null;
  /** Whether you may approve or reject what is waiting (never what you made, sent or attend). */
  decidableByYou: boolean;
}

export interface DemoExpense {
  id: number;
  kind: ExpenseKind;
  dayNumber: number | null;
  date: string | null;
  vendorName: string | null;
  vendorAddress: string | null;
  vendorMapLink: string | null;
  vendorPhone: string | null;
  vendorGstin: string | null;
  mealType: MealType | null;
  fromPlace: string | null;
  toPlace: string | null;
  travelMode: TravelMode | null;
  /** A stay's check-in and check-out, or a journey's departure and arrival ("2030-05-10", "21:00:00"); it may end the next day. */
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  referenceNumber: string | null;
  amount: number;
  gstAmount: number | null;
  description: string | null;
  reason: string | null;
  invoiceFileName: string | null;
  addedBy: number;
  addedByName: string | null;
  addedAt: string;
  updatedByName: string | null;
  updatedAt: string | null;
  editableByYou: boolean;
}

/**
 * One client visited on the trip, on a day between two times. The client's own phone and email (front desk, reception)
 * tell clients apart: the same client is never visited twice in a row on one day.
 */
export interface DemoVisit {
  id: number;
  clientCategory: ClientCategory;
  clientCategoryLabel: string;
  clientCategoryOther: string | null;
  clientName: string;
  /** A business client's registered name and GSTIN (hotels, home stays, offices, hospitals, clinics, restaurants). */
  legalName: string | null;
  gstin: string | null;
  clientPhone: string;
  clientEmail: string | null;
  contactPerson: string | null;
  contactPhone: string;
  contactEmail: string | null;
  addressLine: string;
  city: string;
  state: string | null;
  pincode: string | null;
  mapLink: string | null;
  dayNumber: number;
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * A storefront product shown on the demo (its e-commerce id and title when chosen), how many units and their barcodes
 * (one per unit; empty only for a product listed before units were picked by barcode).
 */
export interface DemoProductLine {
  productId: number;
  productName: string;
  quantity: number;
  barcodes: string[];
}

/**
 * Where a unit taken to the demo is: reserved for the demo's days (still in stock), out on the demo (out of stock here
 * and on the storefront), handed back, written off by a Super Admin, or never taken.
 */
export type DemoUnitStatus = 'RESERVED' | 'OUT' | 'RETURNED' | 'WRITTEN_OFF' | 'NOT_TAKEN';

export interface DemoUnit {
  barcode: string;
  productId: number;
  productName: string | null;
  status: DemoUnitStatus;
  statusLabel: string;
  handedOutAt: string | null;
  handedOutByName: string | null;
  returnedAt: string | null;
  returnedByName: string | null;
  writeOffReason: string | null;
}

/** A product unit that may be picked for a demo's days; `heldBy` is the demo that has it then. */
export interface DemoUnitOption {
  barcode: string;
  productId: number;
  productTitle: string | null;
  status: string;
  statusLabel: string;
  inStockSince: string | null;
  available: boolean;
  heldBy: string | null;
  /** Why it can't be picked, when it can't. */
  note: string | null;
}

export interface DemoEvent {
  type: DemoEventType;
  actorName: string | null;
  at: string;
  detail: string | null;
  reason: string | null;
}

export interface DemoDetail {
  id: number;
  reference: string;
  demoType: DemoType;
  status: DemoStatus;
  statusLabel: string;
  clientCategory: ClientCategory;
  clientCategoryLabel: string;
  clientCategoryOther: string | null;
  clientName: string;
  contactPerson: string | null;
  contactPhone: string;
  contactEmail: string | null;
  addressLine: string;
  city: string;
  state: string | null;
  pincode: string | null;
  mapLink: string | null;
  startDate: string;
  startTime: string;
  numberOfDays: number;
  endDate: string;
  /** The day-by-day plan's total plus the extra below, when it was set. */
  proposedBudget: number;
  /** What the budget held beyond the day-by-day plan, and why (with its breakup). */
  extraBudget: number;
  extraBudgetReason: string | null;
  purpose: string | null;
  outcome: string | null;
  /** Every client visited, by day and time; the client fields above are the first. */
  clients: DemoVisit[];
  products: DemoProductLine[];
  /** Every unit taken, by barcode. */
  units: DemoUnit[];
  /** Whether you may hand units out or back now, and write off a unit that is out (Super Admin). */
  handlesUnits: boolean;
  writesOffUnits: boolean;
  staff: StaffMember[];
  expenses: DemoExpense[];
  totalsByKind: Record<ExpenseKind, number>;
  total: number;
  /** Proposed budget less the total spent; negative when over budget. */
  budgetLeft: number;
  /** What the company account holds for this demo. */
  bookedTotal: number;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
  submittedByName: string | null;
  submittedAt: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  cancelReason: string | null;
  reopenReason: string | null;
  completedAt: string | null;
  events: DemoEvent[];
  decidableByYou: boolean;
  attendingYou: boolean;
}

export type VisitPayload = Omit<DemoVisit, 'id' | 'clientCategoryLabel' | 'date'>;

export interface DemoPayload {
  demoType: DemoType;
  /** Visits on the same day never overlap, and never visit the same client twice in a row. */
  clients: VisitPayload[];
  startDate: string;
  numberOfDays: number;
  /** The planned stays, meals and travel plus any extra, which needs extraBudgetReason. */
  proposedBudget: number;
  extraBudgetReason: string | null;
  purpose: string | null;
  staffEmployeeIds: number[];
  products: DemoProductLine[];
  /**
   * The full day-by-day plan of stays, meals and travel, when sent: bills with an id are changed, those without are added
   * (in this order, so their new ids ascend in it), and stays, meals and travel left out are removed. Other bills are kept.
   */
  plannedBills?: PlannedBillPayload[];
  /** Required once the quotation is approved. */
  changeReason?: string | null;
}

export interface ExpensePayload {
  kind: ExpenseKind;
  dayNumber: number | null;
  vendorName: string | null;
  vendorAddress: string | null;
  vendorMapLink: string | null;
  vendorPhone: string | null;
  vendorGstin: string | null;
  mealType: MealType | null;
  fromPlace: string | null;
  toPlace: string | null;
  travelMode: TravelMode | null;
  /** A stay's check-in and check-out, or a journey's departure and arrival: all four or none. */
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  referenceNumber: string | null;
  amount: number;
  gstAmount: number | null;
  description: string | null;
  reason: string | null;
  /** Required to change a bill once the quotation is approved. */
  changeReason?: string | null;
}

/** A stay, meal or journey of the day-by-day plan: the bill it changes, or null for a new one. */
export type PlannedBillPayload = Omit<ExpensePayload, 'changeReason'> & { id: number | null };

/** Demo managers use the admin endpoints; attending staff their own (My demos). */
export type DemoMode = 'manager' | 'attendee';
