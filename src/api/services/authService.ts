import { axiosClient } from '../axiosClient';
import type { LoginRequest, AuthResponse, AdminProfile , ChangePasswordRequest, ChangePasswordResponse} from '../../types/auth';

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

  updateProfile: async (payload: Partial<Record<string, string>>) => {
    const response = await axiosClient.put('/v1/admin/profile', payload);
    return response.data;
  },
};