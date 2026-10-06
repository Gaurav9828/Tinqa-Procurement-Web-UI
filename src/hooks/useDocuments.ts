import { useState, useCallback } from 'react';
import { documentService } from '../api/services/documentService';
import type { DocumentResponseData, DocumentUploadRequest } from '../types/document.types';
import { useNotify } from './useNotify';

export const useDocuments = () => {
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentResponseData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const notify = useNotify();

  // Fetch Documents
  const fetchUserDocuments = useCallback(async (userId: number) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await documentService.getDocumentsByUser(userId);
      if (response.success && response.data) {
        setUploadedDocuments(response.data);
      } else {
        notify.error(response.message || 'Failed to fetch documents.');
      }
    } catch (err: unknown) {
      notify.error(err, 'An error occurred while fetching documents.');
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  // Upload Document
  const uploadDocument = useCallback(
    async (file: File, meta: DocumentUploadRequest): Promise<boolean> => {
      setIsUploading(true);
      try {
        const response = await documentService.uploadDocument(file, meta);

        if (response.success) {
          notify.success(
            response.message ||
            `Document "${response.data?.originalFileName || file.name}" uploaded successfully.`
          );

          if (response.data) {
            setUploadedDocuments((prev) => [response.data, ...prev]);
          }
          return true;
        }
        notify.error(response.message || 'Failed to upload document.');
        return false;
      } catch (err: unknown) {
        notify.error(err, 'Server error occurred while uploading.');
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [notify]
  );

  // Delete Document
  const deleteDocument = async (documentId: number): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const response = await documentService.deleteDocument(documentId);
      if (response.success) {
        notify.success(response.message || 'Document deleted successfully!');
        setUploadedDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
        return true;
      }
      notify.error(response.message || 'Failed to delete document.');
      return false;
    } catch (err: unknown) {
      notify.error(err, 'Failed to delete document.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  // Download Document
  const downloadDocument = async (doc: DocumentResponseData) => {
    try {
      await documentService.downloadDocument(doc.id, doc.originalFileName);
    } catch (err: unknown) {
      notify.error(err, 'Failed to download document. Please try again.');
    }
  };

  return {
    uploadedDocuments,
    isLoading,
    isUploading,
    isDeleting,
    fetchUserDocuments,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  };
};
