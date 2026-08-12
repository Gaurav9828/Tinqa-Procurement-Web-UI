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
}

export interface UserProfile {
  userId: number;
  username: string;
  email: string;
  role: string;
  authClient: string;
  isFirstLogin: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
  updatePasswordRequirement: (isFirstLogin: boolean) => void;
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

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  code?: string;
  requiresLogin?: boolean;
}