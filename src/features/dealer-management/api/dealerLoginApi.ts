import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { CreateDealerLoginRequest, DealerLogin, DealerLoginStatus } from '../types/dealerLogin.types';

const loginPath = (dealerId: number) => `/v1/admin/dealers/${dealerId}/login`;

export const dealerLoginApi = {
  /** data is null when the dealer has no login yet. */
  getLogin: async (dealerId: number): Promise<ApiResponse<DealerLogin | null>> =>
    (await axiosClient.get<ApiResponse<DealerLogin | null>>(loginPath(dealerId))).data,

  createLogin: async (dealerId: number, payload: CreateDealerLoginRequest): Promise<ApiResponse<DealerLogin>> =>
    (await axiosClient.post<ApiResponse<DealerLogin>>(loginPath(dealerId), payload)).data,

  decide: async (dealerId: number, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<ApiResponse<DealerLogin>> =>
    (await axiosClient.patch<ApiResponse<DealerLogin>>(`${loginPath(dealerId)}/approval`, { decision, rejectionReason })).data,

  setEnabled: async (dealerId: number, enabled: boolean): Promise<ApiResponse<DealerLogin>> =>
    (await axiosClient.patch<ApiResponse<DealerLogin>>(`${loginPath(dealerId)}/status`, { enabled })).data,

  resetPassword: async (dealerId: number): Promise<ApiResponse<DealerLogin>> =>
    (await axiosClient.post<ApiResponse<DealerLogin>>(`${loginPath(dealerId)}/reset-password`)).data,

  /** The approval queue (status APPROVAL_PENDING), for login approvers. */
  listLogins: async (status?: DealerLoginStatus): Promise<ApiResponse<DealerLogin[]>> =>
    (await axiosClient.get<ApiResponse<DealerLogin[]>>('/v1/admin/dealer-logins', { params: status ? { status } : undefined })).data,
};
