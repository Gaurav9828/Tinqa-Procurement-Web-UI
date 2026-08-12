export interface ProfileApprovalRequest {
  requestId: number;
  employeeId: number;
  employeeCode: string;
  status: string;
  requestedBy: number;
  requestedByUsername: string;
  requestedAt: string;
  displayName: string | null;
  primaryPhone: string | null;
  alternatePhone: string | null;
  personalEmail: string | null;
  dateOfBirth: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  department: string | null;
  designation: string | null;
  gender: string | null;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}