import { axiosClient } from '../axiosClient';
import type {
  DocumentUploadRequest,
  DocumentResponseData,
  ApiResponse,
} from '../../types/document.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const documentService = {
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
};