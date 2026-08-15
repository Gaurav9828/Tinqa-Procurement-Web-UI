// Erasable Syntax Compatible Enums (Object Maps + Union Types)

export const DocumentUploaderType = {
  DEALER: 'DEALER',
  INSPECTOR: 'INSPECTOR',
  ADMIN_L1: 'ADMIN_L1',
  ADMIN_L2: 'ADMIN_L2',
  WORKSHOP: 'WORKSHOP',
} as const;
export type DocumentUploaderType = typeof DocumentUploaderType[keyof typeof DocumentUploaderType];

export const DocumentOwnerType = {
  ADMIN: 'ADMIN',
  DEALER: 'DEALER',
  INSPECTOR: 'INSPECTOR',
  WORKSHOP: 'WORKSHOP',
  EMPLOYEE: 'EMPLOYEE',
  SYSTEM: 'SYSTEM',
} as const;
export type DocumentOwnerType = typeof DocumentOwnerType[keyof typeof DocumentOwnerType];

export const DocumentReferenceType = {
  PRODUCT: 'PRODUCT',
  DEALER: 'DEALER',
  WORKSHOP: 'WORKSHOP',
  INSPECTOR: 'INSPECTOR',
  EMPLOYEE: 'EMPLOYEE',
  AUCTION: 'AUCTION',
  ORDER: 'ORDER',
  DELIVERY: 'DELIVERY',
  CLAIM: 'CLAIM',
} as const;
export type DocumentReferenceType = typeof DocumentReferenceType[keyof typeof DocumentReferenceType];

export const DocumentCategory = {
  PRODUCT_PHOTO: 'PRODUCT_PHOTO',
  PRODUCT_DOCUMENT: 'PRODUCT_DOCUMENT',
  DEALER_DOCUMENT: 'DEALER_DOCUMENT',
  WORKSHOP_DOCUMENT: 'WORKSHOP_DOCUMENT',
  INSPECTOR_DOCUMENT: 'INSPECTOR_DOCUMENT',
  ADMIN_DOCUMENT: 'ADMIN_DOCUMENT',
  INVOICE: 'INVOICE',
  CERTIFICATE: 'CERTIFICATE',
  ID_PROOF: 'ID_PROOF',
  OTHER: 'OTHER',
} as const;
export type DocumentCategory = typeof DocumentCategory[keyof typeof DocumentCategory];

export const DocumentPurpose = {
  PROFILE_DOCUMENT: 'PROFILE_DOCUMENT',
  KYC_VERIFICATION: 'KYC_VERIFICATION',
  BUSINESS_DOCUMENT: 'BUSINESS_DOCUMENT',
  WORKSHOP_DOCUMENT: 'WORKSHOP_DOCUMENT',
  PRODUCT_PRE_MANUFACTURING: 'PRODUCT_PRE_MANUFACTURING',
  PRODUCT_DURING_MANUFACTURING: 'PRODUCT_DURING_MANUFACTURING',
  PRODUCT_POST_MANUFACTURING: 'PRODUCT_POST_MANUFACTURING',
  INSPECTION_DOCUMENT: 'INSPECTION_DOCUMENT',
  INSPECTION_PHOTO: 'INSPECTION_PHOTO',
  AUCTION_DOCUMENT: 'AUCTION_DOCUMENT',
  ORDER_DOCUMENT: 'ORDER_DOCUMENT',
  INVOICE: 'INVOICE',
  CERTIFICATE: 'CERTIFICATE',
  CONTRACT: 'CONTRACT',
  CLAIM_EVIDENCE: 'CLAIM_EVIDENCE',
  OTHER: 'OTHER',
} as const;
export type DocumentPurpose = typeof DocumentPurpose[keyof typeof DocumentPurpose];

export const DocumentType = {
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  WORD: 'WORD',
  EXCEL: 'EXCEL',
  OTHER: 'OTHER',
} as const;
export type DocumentType = typeof DocumentType[keyof typeof DocumentType];

export const DocumentStage = {
  PRE_MANUFACTURING: 'PRE_MANUFACTURING',
  MANUFACTURING: 'MANUFACTURING',
  POST_MANUFACTURING: 'POST_MANUFACTURING',
  INSPECTION: 'INSPECTION',
  APPROVAL: 'APPROVAL',
  AUCTION: 'AUCTION',
  DELIVERY: 'DELIVERY',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED',
  GENERAL: 'GENERAL',
} as const;
export type DocumentStage = typeof DocumentStage[keyof typeof DocumentStage];

// Request DTO Payload matching DocumentUploadRequest.java
export interface DocumentUploadRequest {
  uploaderType: DocumentUploaderType;
  ownerType: DocumentOwnerType;
  ownerId: number;
  referenceType: DocumentReferenceType;
  referenceId: number;
  category: DocumentCategory;
  purpose: DocumentPurpose;
  type: DocumentType;
  stage: DocumentStage;
}

export interface DocumentResponseData {
  id: number;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  uploaderType: DocumentUploaderType;
  uploadedByUserId: number;
  ownerType: DocumentOwnerType;
  ownerId: number;
  referenceType: DocumentReferenceType;
  referenceId: number;
  category: DocumentCategory;
  purpose: DocumentPurpose;
  type: DocumentType;
  stage: DocumentStage;
  status: string;
  downloadUrl: string;
  createdAt: string;
}