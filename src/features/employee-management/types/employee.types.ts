import type { Gender } from "../../../types/common.types";

export const EmployeeConstants = {
  FIRST_LOGIN: 'FIRST_LOGIN',
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  IN_ACTIVE: 'IN_ACTIVE',
  WAITING_FOR_DELETION: 'WAITING_FOR_DELETION',
  APPROVAL_PENDING: 'APPROVAL_PENDING',
  /** Deleted by an employee approver: the record is kept read-only and only listed under this filter. */
  DELETED: 'DELETED',
} as const;

export type EmployeeStatus = (typeof EmployeeConstants)[keyof typeof EmployeeConstants];

/**
 * Admin level. With the designation it decides access: the designation picks the business areas (permission
 * groups), and Level 1 holds them minus the approval-level groups while Level 2 holds them all.
 * DEALER and INSPECTOR also exist in the backend but are created elsewhere, never from this screen.
 */
export type EmployeeRole = 'ADMIN_L1' | 'ADMIN_L2';

export interface EmployeeResponse {
  id: number;
  userId: number;
  username: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  dateOfBirth: string;
  gender: Gender;
  /** Designation code (see config/access DESIGNATIONS); decides the employee's permission groups. */
  designation: string;
  /** Human-readable designation, from the server. */
  designationLabel?: string | null;
  /** Admin level (ADMIN_L1 / ADMIN_L2), or DEALER / INSPECTOR for mobile accounts. */
  role?: string | null;
  /** Follows the designation; set by the server. */
  department: string;
  employmentType: string;
  joiningDate: string;
  leavingDate?: string | null;
  salaryAmount: number;
  salaryCurrency: string;
  phone: string;
  alternatePhone?: string;
  personalEmail?: string;
  workEmail?: string
  /** Required for new employees; older records may not have them. */
  panNumber?: string | null;
  houseNumber?: string | null;
  street?: string | null;
  landmark?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  googleMapsUrl?: string | null;
  status: EmployeeStatus;
  // Who created the employee and, for employees that needed approval, the approver's decision
  createdBy?: number | null;
  createdByUsername?: string | null;
  approvalDecidedBy?: number | null;
  approvalDecidedByUsername?: string | null;
  approvalDecidedAt?: string | null;
  approvalRejectionReason?: string | null;
  /** Set once the employee is DELETED. */
  deletedBy?: number | null;
  deletedByUsername?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  username: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  dateOfBirth: string;
  gender: string;
  designation: string;
  /** Optional: the server derives it from the designation and rejects a different value. */
  department?: string;
  employmentType: string;
  joiningDate: string;
  salaryAmount?: number;
  salaryCurrency?: string;
  phone: string;
  alternatePhone?: string;
  personalEmail?: string;
  panNumber: string;
  houseNumber: string;
  street: string;
  landmark?: string;
  district: string;
  state: string;
  pincode: string;
  googleMapsUrl?: string;
  role: EmployeeRole;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  designation?: string;
  department?: string;
  employmentType?: string;
  joiningDate?: string;
  leavingDate?: string | null;
  salaryAmount?: number;
  salaryCurrency?: string;
  phone?: string;
  alternatePhone?: string;
  personalEmail?: string;
  /** PAN and the main address lines can be changed but not cleared; a blank landmark / map link removes it. */
  panNumber?: string;
  houseNumber?: string;
  street?: string;
  landmark?: string;
  district?: string;
  state?: string;
  pincode?: string;
  googleMapsUrl?: string;
  status?: EmployeeStatus;
  /** Changes the admin level; only an employee approver may, and never on their own record. Send only when changed. */
  role?: EmployeeRole;
}

/** Fields an admin may not change on their own employee record (designation and level decide their access). */
export const SELF_LOCKED_FIELDS = [
  'designation',
  'department',
  'employmentType',
  'joiningDate',
  'leavingDate',
  'salaryAmount',
  'salaryCurrency',
  'status',
  'role',
] as const satisfies readonly (keyof UpdateEmployeeRequest)[];

export interface EmployeeFilterParams {
  status?: EmployeeStatus | '';
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}