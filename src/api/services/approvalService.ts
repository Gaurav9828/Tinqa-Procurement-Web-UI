import { axiosClient } from '../axiosClient';

export interface ApprovalItem {
  id: string;
  type: 'PROFILE_UPDATE' | 'NEW_PROFILE' | 'ORDER' | 'AUCTION' | 'CLAIM' | 'REPAIR';
  requesterName: string;
  requesterRole: 'DEALER' | 'INSPECTOR' | 'EMPLOYEE';
  status: 'PENDING_L1' | 'PENDING_L2' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  details: Record<string, unknown>;
}

export interface ApprovalDecisionPayload {
  approvalId: string;
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
  adminLevel: 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_2';
}

export const approvalService = {

  // Submit approval/rejection decision
  submitDecision: async (payload: ApprovalDecisionPayload): Promise<void> => {
    await axiosClient.post('/admin/approvals/decision', payload);
  },

  // Fetch specific request details for preview modal
  getApprovalDetails: async (id: string): Promise<ApprovalItem> => {
    const response = await axiosClient.get<ApprovalItem>(`/admin/approvals/${id}`);
    return response.data;
  },
};