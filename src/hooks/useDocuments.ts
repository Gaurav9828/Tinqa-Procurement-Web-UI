import { useState, useCallback } from 'react';
import { documentService } from '../api/services/documentService';
import type { DocumentUploadRequest, DocumentResponseData } from '../types/document.types';

export const useDocuments = () => {
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentResponseData[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const uploadDocument = useCallback(
    async (file: File, meta: DocumentUploadRequest): Promise<boolean> => {
      setIsUploading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await documentService.uploadDocument(file, meta);

        if (response.success) {
          setSuccessMessage(
            response.message ||
              `Document "${response.data?.originalFileName || file.name}" uploaded successfully.`
          );

          if (response.data) {
            setUploadedDocuments((prev) => [response.data, ...prev]);
          }
          return true;
        } else {
          setError(response.message || 'Failed to upload document.');
          return false;
        }
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const apiError = err as { response?: { data?: { message?: string } } };
          setError(
            apiError.response?.data?.message || 'Server error occurred while uploading.'
          );
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred while uploading.');
        }
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return {
    uploadedDocuments,
    isUploading,
    error,
    successMessage,
    clearError: () => setError(null),
    clearSuccess: () => setSuccessMessage(null),
    uploadDocument,
  };
};