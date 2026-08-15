import { useState, useCallback } from 'react';
import { documentService } from '../api/services/documentService';
import type { DocumentResponseData, DocumentUploadRequest } from '../types/document.types';

export const useDocuments = () => {
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentResponseData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearError = () => setError(null);
  const clearSuccess = () => setSuccessMessage(null);

  // Fetch Documents
  const fetchUserDocuments = useCallback(async (userId: number) => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await documentService.getDocumentsByUser(userId);
      if (response.success && response.data) {
        setUploadedDocuments(response.data);
      } else {
        setError(response.message || 'Failed to fetch documents.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'An error occurred while fetching documents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload Document
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

  // Delete Document
  const deleteDocument = async (documentId: number): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await documentService.deleteDocument(documentId);
      if (response.success) {
        setSuccessMessage('Document deleted successfully!');
        setUploadedDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
        return true;
      } else {
        setError(response.message || 'Failed to delete document.');
        return false;
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete document.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    uploadedDocuments,
    isLoading,
    isUploading,
    isDeleting,
    error,
    successMessage,
    fetchUserDocuments,
    uploadDocument,
    deleteDocument,
    clearError,
    clearSuccess,
  };
};