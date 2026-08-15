import type { Department, Designation, Gender } from "../../../types/common.types";

export const EmployeeConstants = {
  FIRST_LOGIN: 'FIRST_LOGIN',
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  IN_ACTIVE: 'IN_ACTIVE',
  WAITING_FOR_DELETION: 'WAITING_FOR_DELETION',
  APPROVAL_PENDING: 'APPROVAL_PENDING'
} as const;

export type EmployeeStatus = (typeof EmployeeConstants)[keyof typeof EmployeeConstants];

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
  timestamp: string;
  path: string;
}

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
  designation: Designation;
  department: Department;
  employmentType: string;
  joiningDate: string;
  leavingDate?: string | null;
  salaryAmount: number;
  salaryCurrency: string;
  phone: string;
  alternatePhone?: string;
  personalEmail?: string;
  workEmail?: string
  status: EmployeeStatus;
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
  department: string;
  employmentType: string;
  joiningDate: string;
  salaryAmount?: number;
  salaryCurrency?: string;
  phone: string;
  alternatePhone?: string;
  personalEmail?: string;
  role?: string;
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
  status?: EmployeeStatus;
}

export interface PageableResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  empty: boolean;
}

export interface EmployeeFilterParams {
  status?: EmployeeStatus | '';
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}