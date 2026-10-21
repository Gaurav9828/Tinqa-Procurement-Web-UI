import { axiosClient } from '../axiosClient';
import type {
  LoginRequest,
  AuthResponse,
  AdminProfile,
  ChangePasswordRequest,
  ChangePasswordResponse,
  FirstLoginPasswordRequest,
  ForgotPasswordRequest,
  PasswordLinkInfo,
  PasswordLinkResetRequest,
} from '../../types/auth';
import type { ApiResponse } from '../../types/common.types';

export const authService = {
  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>(
      `/auth/admin/login`,
      payload,
      { skipAuthRedirect: true }
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await axiosClient.post(`/auth/logout`, undefined, { skipAuthRedirect: true });
  },

  getProfile: async (): Promise<AdminProfile> => {
    const response = await axiosClient.get<AdminProfile>(`/v1/admin/profile`);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    const response = await axiosClient.post<ChangePasswordResponse>(
      `/auth/change-password`,
      data,
      { skipAuthRedirect: true }
    );
    return response.data;
  },

  /** Allowed only while the account is in FIRST_LOGIN; the backend checks that from the token. */
  setFirstLoginPassword: async (data: FirstLoginPasswordRequest): Promise<ChangePasswordResponse> => {
    const response = await axiosClient.post<ChangePasswordResponse>(
      `/auth/first-login/password`,
      data,
      { skipAuthRedirect: true }
    );
    return response.data;
  },

  /** Public: emails a reset link if an account matches; the answer is the same either way. */
  forgotPassword: async (payload: ForgotPasswordRequest): Promise<ApiResponse<void>> => {
    const response = await axiosClient.post<ApiResponse<void>>(`/auth/password/forgot`, payload, { skipAuthRedirect: true });
    return response.data;
  },

  /** Public: whether an emailed password link still works (the token goes in the body, never the URL). */
  checkPasswordLink: async (token: string): Promise<ApiResponse<PasswordLinkInfo>> => {
    const response = await axiosClient.post<ApiResponse<PasswordLinkInfo>>(`/auth/password/link/check`, { token }, { skipAuthRedirect: true });
    return response.data;
  },

  /** Public: sets the password chosen through an emailed link; every session of the account is signed out. */
  setPasswordFromLink: async (payload: PasswordLinkResetRequest): Promise<ApiResponse<void>> => {
    const response = await axiosClient.post<ApiResponse<void>>(`/auth/password/link`, payload, { skipAuthRedirect: true });
    return response.data;
  },

  updateProfile: async (payload: Partial<Record<string, string>>) => {
    const response = await axiosClient.put('/v1/admin/profile', payload);
    return response.data;
  },
};