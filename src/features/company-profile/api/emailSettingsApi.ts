import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { EmailSettings, EmailSettingsRequest } from '../types/emailSettings.types';

// Relative to VITE_ECOMMERCE_API_BASE_URL (already includes `/api`). Level 2 Super Admins only (SYSTEM_SETTINGS_MANAGE).
const BASE_URL = '/admin/settings/email';

export const emailSettingsApi = {
  get: async (): Promise<ApiResponse<EmailSettings>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<EmailSettings>>(BASE_URL);
    return response.data;
  },

  update: async (payload: EmailSettingsRequest): Promise<ApiResponse<EmailSettings>> => {
    const response = await ecommerceAxiosClient.put<ApiResponse<EmailSettings>>(BASE_URL, payload);
    return response.data;
  },

  /** Sends at once with the saved settings; 502 EMAIL_TEST_FAILED carries the mail server's answer. */
  sendTest: async (to: string): Promise<ApiResponse<void>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<void>>(`${BASE_URL}/test`, { to });
    return response.data;
  },
};
