import React, { useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle, Info } from 'lucide-react';
import { CommonSelect, CommonInput } from '../ui/FormInputs';
import {
  DocumentUploaderType,
  DocumentOwnerType,
  DocumentReferenceType,
  DocumentCategory,
  DocumentPurpose,
  DocumentType,
  DocumentStage,
} from '../../types/document.types';

import type {
  DocumentUploadRequest
} from '../../types/document.types';

interface UploadDocumentModalProps {
  isOpen: boolean;
  file: File | null;
  username: string;
  userId: number;
  userRole?: string;
  isUploading: boolean;
  onClose: () => void;
  onConfirmUpload: (renamedFile: File, meta: DocumentUploadRequest) => void;
}

// Utility to derive DocumentType enum from file extension
const deriveDocumentType = (fileExtension: string): DocumentType => {
  const ext = fileExtension.toLowerCase().replace('.', '');
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return DocumentType.IMAGE;
  if (ext === 'pdf') return DocumentType.PDF;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return DocumentType.EXCEL;
  if (['doc', 'docx'].includes(ext)) return DocumentType.WORD;
  return DocumentType.OTHER;
};

// Purpose selectable options for Profile Documents
const PROFILE_PURPOSE_OPTIONS = [
  { label: 'Profile Document', value: DocumentPurpose.PROFILE_DOCUMENT },
  { label: 'KYC Verification', value: DocumentPurpose.KYC_VERIFICATION },
  { label: 'Certificate Record', value: DocumentPurpose.CERTIFICATE },
  { label: 'Invoice Record', value: DocumentPurpose.INVOICE },
  { label: 'Contract Document', value: DocumentPurpose.CONTRACT },
  { label: 'Other Document', value: DocumentPurpose.OTHER },
];

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  file,
  username,
  userId,
  userRole = 'ADMIN_L1',
  isUploading,
  onClose,
  onConfirmUpload,
}) => {
  const [selectedPurpose, setSelectedPurpose] = useState<DocumentPurpose>(
    DocumentPurpose.PROFILE_DOCUMENT
  );

  // Auto-calculated reference ID for user session
  const [generatedRefId] = useState<number>(() => Math.floor(100000 + Math.random() * 900000));

  if (!isOpen || !file) return null;

  const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
  const derivedDocType = deriveDocumentType(fileExtension);

  // Determine Uploader Type based on Role
  const mappedUploaderType =
    userRole === 'ADMIN_L2'
      ? DocumentUploaderType.ADMIN_L2
      : DocumentUploaderType.ADMIN_L1;

  // Auto-rename format: PURPOSE_username.ext
  const targetFileName = `${selectedPurpose}_${username.toLowerCase()}${fileExtension}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Re-instantiate file with standardized name
    const renamedFile = new File([file], targetFileName, { type: file.type });

    // Prepare complete backend meta request body
    const metaRequest: DocumentUploadRequest = {
      uploaderType: mappedUploaderType,
      ownerType: DocumentOwnerType.EMPLOYEE,
      ownerId: userId,
      referenceType: DocumentReferenceType.EMPLOYEE,
      referenceId: generatedRefId,
      category: DocumentCategory.ADMIN_DOCUMENT,
      purpose: selectedPurpose,
      type: derivedDocType,
      stage: DocumentStage.GENERAL,
    };

    onConfirmUpload(renamedFile, metaRequest);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-black/5 dark:border-white/5">
          <div className="p-2.5 bg-blue-500/10 text-[#0071e3] rounded-xl">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-black dark:text-white">
              Configure Document Metadata & Upload
            </h3>
            <p className="text-xs text-gray-400">
              Review automatically assigned attributes and select document purpose.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Renaming Card */}
          <div className="p-3.5 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>Original Selected File:</span>
              <span className="font-mono truncate max-w-[200px]">{file.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white pt-1 border-t border-black/5 dark:border-white/5">
              <span className="text-[#0071e3]">Target System Filename:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {targetFileName}
              </span>
            </div>
          </div>

          {/* User Input Field */}
          <div className="space-y-1">
            <CommonSelect
              label="Document Purpose (Selectable)"
              required
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value as DocumentPurpose)}
              options={PROFILE_PURPOSE_OPTIONS.map((p) => p.value)}
            />
            <p className="text-[11px] text-gray-400">
              Chooses purpose classification and auto-renames your uploaded file.
            </p>
          </div>

          {/* System Metadata Inspector Grid (Disabled Inputs) */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#0071e3]" /> Auto-assigned Document Metadata
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CommonInput
                label="Uploader Type"
                value={mappedUploaderType}
                disabled
              />
              <CommonInput
                label="Owner Type"
                value={DocumentOwnerType.ADMIN}
                disabled
              />
              <CommonInput
                label="Owner ID (User ID)"
                value={userId.toString()}
                disabled
              />
              <CommonInput
                label="Reference Type"
                value={DocumentReferenceType.EMPLOYEE}
                disabled
              />
              <CommonInput
                label="Reference ID (Auto Generated)"
                value={generatedRefId.toString()}
                disabled
              />
              <CommonInput
                label="Category"
                value={DocumentCategory.ADMIN_DOCUMENT}
                disabled
              />
              <CommonInput
                label="Detected File Type"
                value={derivedDocType}
                disabled
              />
              <CommonInput
                label="Document Stage"
                value={DocumentStage.GENERAL}
                disabled
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This metadata payload will be validated by the backend server.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                </>
              ) : (
                'Confirm & Submit Upload'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};