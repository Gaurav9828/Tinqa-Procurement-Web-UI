import { axiosClient } from '../axiosClient';
import type { LoginRequest, AuthResponse, AdminProfile , ChangePasswordRequest, ChangePasswordResponse} from '../../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const authService = {
  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>(
      `${API_BASE_URL}/auth/admin/login`,
      payload
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await axiosClient.post(`${API_BASE_URL}/auth/logout`);
  },

  getProfile: async (): Promise<AdminProfile> => {
    const response = await axiosClient.get<AdminProfile>(`${API_BASE_URL}/v1/admin/profile`);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    const response = await axiosClient.post<ChangePasswordResponse>(
      `${API_BASE_URL}/auth/change-password`,
      data
    );
    return response.data;
  },

  updateProfile: async (payload: Partial<Record<string, string>>) => {
    const response = await axiosClient.put('/v1/admin/profile', payload);
    return response.data;
  },
};