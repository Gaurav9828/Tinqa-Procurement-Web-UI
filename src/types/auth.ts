import type { MyAccess } from '../config/access';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  username: string;
  email: string;
  role: string;
  authClient: string;
  isFirstLogin?: boolean;
  // What the account may do (Procurement backend); null on older backends
  designation?: string | null;
  designationLabel?: string | null;
  permissionGroups?: string[];
  permissions?: string[];
}

export interface UserProfile {
  userId: number;
  username: string;
  email: string;
  /** Admin level (ADMIN_L1 / ADMIN_L2). Display only: gate features with permissions. */
  role: string;
  authClient: string;
  isFirstLogin: boolean;
  designation?: string | null;
  designationLabel?: string | null;
  permissionGroups?: string[];
  /** Undefined for sessions saved before permissions existed: refresh from the server, don't treat as "nothing". */
  permissions?: string[];
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
  updatePasswordRequirement: (isFirstLogin: boolean) => void;
  /** Replaces the signed-in user's access with what the server reports now. */
  setAccess: (access: MyAccess) => void;
}

export interface AdminProfile {
  employeeId: number;
  employeeCode: string;
  displayName: string;
  primaryPhone: string;
  alternatePhone: string | null;
  personalEmail: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  department: string;
  designation: string;
  designationLabel?: string | null;
  workEmail: string;
  username: string;
  gender: string;
  employmentType: string;
  joiningDate: string;
  dateOfBirth: string;
  status: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** First login: the user just signed in with their temporary password, so only the new one is sent. */
export interface FirstLoginPasswordRequest {
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  code?: string;
  requiresLogin?: boolean;
}