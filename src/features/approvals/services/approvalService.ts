import { axiosClient } from '../../../api/axiosClient';
import type { DocumentApprovalItem, ProfileApprovalRequest, ProcessApprovalPayload, StocksApprovalRequest, OrdersApprovalRequest } from '../types/approval.types';
import type { ApiResponse } from '../../../types/common.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const approvalService = {
  // Fetch Document Approvals
  getPendingDocuments: async (): Promise<DocumentApprovalItem[]> => {
    const response = await axiosClient.get<ApiResponse<DocumentApprovalItem[]>>(
      `${API_BASE_URL}/v1/documents?status=WAITING_FOR_APPROVAL`
    );
    return response.data.data || [];
  },

  getProfileApprovals: async (): Promise<ProfileApprovalRequest[]> => {
    const response = await axiosClient.get<ApiResponse<ProfileApprovalRequest[]>>(`${API_BASE_URL}/admin/profile-approvals`);
    return response.data.data || [];
  },

  getStocksApprovals: async (): Promise<StocksApprovalRequest[]> => {
    const response = await axiosClient.get<ApiResponse<StocksApprovalRequest[]>>(`${API_BASE_URL}/v1/stocks?status=PENDING`);
    return response.data.data || [];
  },

  getOrdersApprovals: async (): Promise<OrdersApprovalRequest[]> => {
    const response = await axiosClient.get<ApiResponse<OrdersApprovalRequest[]>>(`${API_BASE_URL}/v1/orders/status/PENDING`);
    return response.data.data || [];
  },

  // Process Document
  processDocumentApproval: async (id: number, payload: ProcessApprovalPayload) => {
    const response = await axiosClient.patch<ApiResponse<any>>(
      `${API_BASE_URL}/v1/documents/${id}/approval`,
      payload
    );
    return response.data;
  },

  // Process Profile
  processProfileApproval: async (id: number, payload: ProcessApprovalPayload) => {
    const response = await axiosClient.put<ApiResponse<any>>(
      `${API_BASE_URL}/admin/profile-approvals/${id}`,
      payload
    );
    return response.data;
  },

  // inside approvalService.ts

  downloadDocument: async (documentId: number, fileName: string): Promise<void> => {
    const response = await axiosClient.get(
      `${API_BASE_URL}/v1/documents/${documentId}/download`,
      {
        responseType: 'blob',
      }
    );

    // Safely extract content-type header as string with fallback
    const contentType = (response.headers['content-type'] as string) || 'application/octet-stream';

    const blob = new Blob([response.data], { type: contentType });
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName || `document-${documentId}`);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};