import { axiosClient } from '../axiosClient';
import type {
  DocumentUploadRequest,
  DocumentResponseData,
  ApiResponse,
} from '../../types/document.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const documentService = {
  // Fetch documents uploaded for a specific user
  getDocumentsByUser: async (userId: number): Promise<ApiResponse<DocumentResponseData[]>> => {
    const response = await axiosClient.get<ApiResponse<DocumentResponseData[]>>(
      `${API_BASE_URL}/v1/documents/user/${userId}`
    );
    return response.data;
  },

  // Upload multipart document + JSON meta Blob
  uploadDocument: async (
    file: File,
    meta: DocumentUploadRequest
  ): Promise<ApiResponse<DocumentResponseData>> => {
    const formData = new FormData();

    // 1. Append Binary File
    formData.append('file', file);

    // 2. Append Meta JSON Blob for Spring Boot @RequestPart("meta")
    const metaBlob = new Blob([JSON.stringify(meta)], {
      type: 'application/json',
    });
    formData.append('meta', metaBlob);

    const response = await axiosClient.post<ApiResponse<DocumentResponseData>>(
      `${API_BASE_URL}/v1/documents/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  // Delete Document by ID
  deleteDocument: async (documentId: number): Promise<ApiResponse<string>> => {
    const response = await axiosClient.delete<ApiResponse<string>>(
      `${API_BASE_URL}/v1/documents/${documentId}`
    );
    return response.data;
  },
};