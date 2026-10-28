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
  | 'CANCELLED';

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
  proposedBudget: number;
  purpose: string | null;
  outcome: string | null;
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

export interface DemoPayload {
  demoType: DemoType;
  clientCategory: ClientCategory;
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
  proposedBudget: number;
  purpose: string | null;
  staffEmployeeIds: number[];
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
  referenceNumber: string | null;
  amount: number;
  gstAmount: number | null;
  description: string | null;
  reason: string | null;
  /** Required to change a bill once the quotation is approved. */
  changeReason?: string | null;
}

/** Demo managers use the admin endpoints; attending staff their own (My demos). */
export type DemoMode = 'manager' | 'attendee';
