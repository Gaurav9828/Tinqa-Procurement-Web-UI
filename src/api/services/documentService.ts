import { axiosClient } from '../axiosClient';
import type {
  DocumentUploadRequest,
  DocumentResponseData,
} from '../../types/document.types';
import type { ApiResponse } from '../../types/common.types';

// Keep in sync with the backend upload limits.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES: Record<string, string[]> = {
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  pdf: ['application/pdf'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

/** Returns an error message, or null when the file is acceptable for upload. */
export const validateUploadFile = (file: File): string | null => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedMimes = ALLOWED_UPLOAD_TYPES[extension];
  if (!allowedMimes) {
    return 'Invalid file format! Allowed files: PNG, JPG, JPEG, PDF, and Excel (.xls, .xlsx).';
  }
  // Some OSes report an empty type for Excel files; the backend re-checks the content.
  if (file.type && !allowedMimes.includes(file.type)) {
    return 'The file content type does not match its extension.';
  }
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large. Maximum allowed size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
};

const toSafeFileName = (name: string, fallback: string) =>
  Array.from(name || fallback)
    .map((ch) => (ch.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(ch) ? '_' : ch))
    .join('')
    .slice(0, 200);

export const documentService = {
  // Fetch documents uploaded for a specific user
  getDocumentsByUser: async (userId: number): Promise<ApiResponse<DocumentResponseData[]>> => {
    const response = await axiosClient.get<ApiResponse<DocumentResponseData[]>>(
      `/v1/documents/user/${userId}`
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

    // Content-Type (with boundary) is set by the browser for FormData.
    const response = await axiosClient.post<ApiResponse<DocumentResponseData>>(
      `/v1/documents/upload`,
      formData
    );

    return response.data;
  },

  // Delete Document by ID
  deleteDocument: async (documentId: number): Promise<ApiResponse<string>> => {
    const response = await axiosClient.delete<ApiResponse<string>>(
      `/v1/documents/${documentId}`
    );
    return response.data;
  },

  /**
   * Download through the authenticated API client using a relative path.
   * Never fetch a server-supplied absolute URL with the bearer token attached.
   */
  downloadDocument: async (documentId: number, fileName: string): Promise<void> => {
    const response = await axiosClient.get<Blob>(`/v1/documents/${documentId}/download`, {
      responseType: 'blob',
    });

    const contentType = (response.headers['content-type'] as string) || 'application/octet-stream';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = toSafeFileName(fileName, `document-${documentId}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },
};
