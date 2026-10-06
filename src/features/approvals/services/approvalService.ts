import { axiosClient } from '../../../api/axiosClient';
import { documentService } from '../../../api/services/documentService';
import type { DocumentApprovalItem, ProfileApprovalRequest, ProcessApprovalPayload, StocksApprovalRequest, OrdersApprovalRequest } from '../types/approval.types';
import type { ApiResponse } from '../../../types/common.types'


export const approvalService = {
  // Fetch Document Approvals
  getPendingDocuments: async (): Promise<DocumentApprovalItem[]> => {
    const response = await axiosClient.get<ApiResponse<DocumentApprovalItem[]>>(
      `/v1/documents?status=WAITING_FOR_APPROVAL`
    );
    return response.data.data || [];
  },

  getProfileApprovals: async (): Promise<ProfileApprovalRequest[]> => {
    const response = await axiosClient.get<ApiResponse<ProfileApprovalRequest[]>>(`/admin/profile-approvals`);
    return response.data.data || [];
  },

  getStocksApprovals: async (): Promise<StocksApprovalRequest[]> => {
    const response = await axiosClient.get<ApiResponse<StocksApprovalRequest[]>>(`/v1/stocks?status=PENDING`);
    return response.data.data || [];
  },

  getOrdersApprovals: async (): Promise<OrdersApprovalRequest[]> => {
    const response = await axiosClient.get<ApiResponse<OrdersApprovalRequest[]>>(`/v1/orders/status/PENDING`);
    return response.data.data || [];
  },

  // Process Document
  processDocumentApproval: async (id: number, payload: ProcessApprovalPayload) => {
    const response = await axiosClient.patch<ApiResponse<any>>(
      `/v1/documents/${id}/approval`,
      payload
    );
    return response.data;
  },

  // Process Profile
  processProfileApproval: async (id: number, payload: ProcessApprovalPayload) => {
    const response = await axiosClient.put<ApiResponse<any>>(
      `/admin/profile-approvals/${id}`,
      payload
    );
    return response.data;
  },

  downloadDocument: (documentId: number, fileName: string): Promise<void> =>
    documentService.downloadDocument(documentId, fileName),
};
