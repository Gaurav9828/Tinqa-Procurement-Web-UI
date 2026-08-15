export interface ProfileApprovalRequest {
  requestId: number;
  employeeId: number;
  employeeCode: string;
  status: string;
  requestedBy: number;
  requestedByUsername: string;
  requestedAt: string;
  displayName: string | null;
  primaryPhone: string | null;
  alternatePhone: string | null;
  personalEmail: string | null;
  dateOfBirth: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  department: string | null;
  designation: string | null;
  gender: string | null;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

export interface DocumentApprovalItem {
  id: number;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  category: string;
  purpose: string;
  type: string;
  stage: string;
  status?: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
  timestamp: string;
  path: string;
}

export interface ProcessApprovalPayload {
  decision: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export type UnifiedApprovalItem = 
  | (DocumentApprovalItem & { approvalType: 'DOCUMENT' })
  | (ProfileApprovalRequest & { approvalType: 'PROFILE' });

export interface PreviewModalProps {
  request: UnifiedApprovalItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
  formatTime: (isoString: string) => string;
}