import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { CreateSupplierLoginRequest, SupplierLogin, SupplierLoginStatus } from '../types/supplierLogin.types';

const loginPath = (supplierId: number) => `/v1/admin/suppliers/${supplierId}/login`;

export const supplierLoginApi = {
  /** data is null when the supplier has no login yet. */
  getLogin: async (supplierId: number): Promise<ApiResponse<SupplierLogin | null>> =>
    (await axiosClient.get<ApiResponse<SupplierLogin | null>>(loginPath(supplierId))).data,

  createLogin: async (supplierId: number, payload: CreateSupplierLoginRequest): Promise<ApiResponse<SupplierLogin>> =>
    (await axiosClient.post<ApiResponse<SupplierLogin>>(loginPath(supplierId), payload)).data,

  decide: async (supplierId: number, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<ApiResponse<SupplierLogin>> =>
    (await axiosClient.patch<ApiResponse<SupplierLogin>>(`${loginPath(supplierId)}/approval`, { decision, rejectionReason })).data,

  setEnabled: async (supplierId: number, enabled: boolean): Promise<ApiResponse<SupplierLogin>> =>
    (await axiosClient.patch<ApiResponse<SupplierLogin>>(`${loginPath(supplierId)}/status`, { enabled })).data,

  resetPassword: async (supplierId: number): Promise<ApiResponse<SupplierLogin>> =>
    (await axiosClient.post<ApiResponse<SupplierLogin>>(`${loginPath(supplierId)}/reset-password`)).data,

  /** The approval queue (status APPROVAL_PENDING), for login approvers. */
  listLogins: async (status?: SupplierLoginStatus): Promise<ApiResponse<SupplierLogin[]>> =>
    (await axiosClient.get<ApiResponse<SupplierLogin[]>>('/v1/admin/supplier-logins', { params: status ? { status } : undefined })).data,
};
