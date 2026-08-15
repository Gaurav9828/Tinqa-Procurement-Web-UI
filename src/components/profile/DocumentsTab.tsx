import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, Clock, Download, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuthStore } from '../../store/useAuthStore';
import { Alert } from '../ui/Alert';
import { UploadDocumentModal } from './../ui/UploadDocumentModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import type { DocumentUploadRequest, DocumentResponseData } from '../../types/document.types';

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'xls', 'xlsx'];
const ALLOWED_ACCEPT =
  '.png,.jpg,.jpeg,.pdf,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Helper function to handle unique suffix generation (_1, _2, etc.)
const getUniqueFileName = (originalFileName: string, existingFileNames: string[]): string => {
  if (!existingFileNames.includes(originalFileName)) {
    return originalFileName;
  }

  const lastDotIndex = originalFileName.lastIndexOf('.');
  let nameWithoutExt = originalFileName;
  let ext = '';

  if (lastDotIndex !== -1) {
    nameWithoutExt = originalFileName.substring(0, lastDotIndex);
    ext = originalFileName.substring(lastDotIndex);
  }

  let counter = 1;
  let newFileName = `${nameWithoutExt}_${counter}${ext}`;

  while (existingFileNames.includes(newFileName)) {
    counter++;
    newFileName = `${nameWithoutExt}_${counter}${ext}`;
  }

  return newFileName;
};

export const DocumentsTab: React.FC = () => {
  const { user } = useAuthStore();
  const username = user?.username || 'user';
  const userId = user?.userId || 1;
  const userRole = user?.role || 'ADMIN_L1';

  const isL2User = userRole === 'ADMIN_L2';

  const {
    uploadedDocuments,
    isLoading,
    isUploading,
    isDeleting,
    error,
    successMessage,
    fetchUserDocuments,
    clearError,
    clearSuccess,
    uploadDocument,
    deleteDocument,
  } = useDocuments();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentResponseData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId) {
      fetchUserDocuments(userId);
    }
  }, [userId, fetchUserDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    clearError();
    clearSuccess();

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        setValidationError(
          'Invalid file format! Allowed files: PNG, JPG, JPEG, PDF, and Excel (.xls, .xlsx).'
        );
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setSelectedFile(file);
      setIsModalOpen(true);
    }
  };

  // Execution callback after popup confirmation
  const handleConfirmUpload = async (renamedFile: File, meta: DocumentUploadRequest) => {
    // Extract existing filenames from current list
    const existingNames = uploadedDocuments.map((doc) => doc.originalFileName);

    // Generate unique name if collision occurs
    const finalFileName = getUniqueFileName(renamedFile.name, existingNames);

    // Construct a new File object if the name changed
    const fileToUpload =
      finalFileName !== renamedFile.name
        ? new File([renamedFile], finalFileName, { type: renamedFile.type })
        : renamedFile;

    const success = await uploadDocument(fileToUpload, meta);
    if (success) {
      setIsModalOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePromptDelete = (doc: DocumentResponseData) => {
    setDocumentToDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (documentToDelete) {
      const success = await deleteDocument(documentToDelete.id);
      if (success) {
        setIsDeleteModalOpen(false);
        setDocumentToDelete(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messaging */}
      <Alert
        type="error"
        message={validationError || error}
        onClose={() => {
          setValidationError(null);
          clearError();
        }}
      />
      <Alert type="success" message={successMessage} onClose={clearSuccess} />

      {/* Action Header */}
      <div className="apple-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-sm text-black dark:text-white">
            Upload Profile & Compliance Documents
          </h3>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            Supported formats:{' '}
            <strong className="text-black dark:text-white">
              PNG, JPG, JPEG, PDF, Excel (.xls, .xlsx)
            </strong>
          </p>
        </div>

        <label className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold cursor-pointer transition-colors flex items-center gap-2 shrink-0">
          <Upload className="w-4 h-4" /> Upload Document
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept={ALLOWED_ACCEPT}
          />
        </label>
      </div>

      {/* Uploaded Items List */}
      <div className="apple-card divide-y divide-black/10 dark:divide-white/10 overflow-hidden min-h-[150px] relative">
        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
            <p className="text-xs">Loading user documents...</p>
          </div>
        ) : uploadedDocuments.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="inline-flex p-3 bg-black/5 dark:bg-white/5 rounded-full text-gray-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs text-gray-400">
              No documents uploaded yet. Click <strong>Upload Document</strong> to submit profile attachments.
            </p>
          </div>
        ) : (
          uploadedDocuments.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-[#0071e3] shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate text-black dark:text-white">
                    {doc.originalFileName}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Uploaded on{' '}
                    {new Date(doc.createdAt).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}{' '}
                    • {(doc.fileSize / 1024).toFixed(1)} KB • Purpose: {doc.purpose}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {doc.status === 'ACTIVE' || doc.status === 'APPROVED' || doc.status === 'VERIFIED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified / Approved
                  </span>
                ) : doc.status === 'WAITING_FOR_APPROVAL' || doc.status === 'APPROVAL' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5" /> Waiting for Approval
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Clock className="w-3.5 h-3.5" /> {doc.status?.replace(/_/g, ' ')}
                  </span>
                )}

                {doc.downloadUrl && (
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                    title="Download / Preview"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}

                {isL2User && (
                  <button
                    type="button"
                    onClick={() => handlePromptDelete(doc)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Document (L2 Permission)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Upload Popup Modal */}
      <UploadDocumentModal
        isOpen={isModalOpen}
        file={selectedFile}
        username={username}
        userId={userId}
        userRole={userRole}
        isUploading={isUploading}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        onConfirmUpload={handleConfirmUpload}
      />

      {/* Confirmation Delete Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        actionType="DELETE"
        title="Delete Document"
        description={`Are you sure you want to permanently delete the document "${documentToDelete?.originalFileName}"?`}
        isSubmitting={isDeleting}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDocumentToDelete(null);
        }}
        onConfirm={executeDelete}
      />
    </div>
  );
};