import type { ApiResponseEnvelope, ProfileApprovalRequest } from '../types/approval.types';
import { axiosClient } from '../../../api/axiosClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export interface ProcessApprovalPayload {
  decision: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export const approvalService = {
  getProfileApprovals: async (): Promise<ProfileApprovalRequest[]> => {    
    const response = await axiosClient.get<ApiResponseEnvelope<ProfileApprovalRequest[]>>(`${API_BASE_URL}/admin/profile-approvals`);
    return response.data.data || [];
  },

  processProfileApproval: async (
    requestId: number,
    payload: ProcessApprovalPayload
  ): Promise<ProfileApprovalRequest> => {
    const response = await axiosClient.put<ApiResponseEnvelope<ProfileApprovalRequest>>(
      `${API_BASE_URL}/admin/profile-approvals/${requestId}`,
      payload
    );
    return response.data.data;
  },
};