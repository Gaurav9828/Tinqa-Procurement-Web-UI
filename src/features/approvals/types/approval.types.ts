import type { ApprovalStatus, OrderStatus } from "../../../types/common.types";

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

export interface StocksApprovalRequest {
  id: number;
  batchNumber: string;
  orderNumber: string;
  dealerName: string;
  itemName: string;
  totalOrderQuantity: number;
  unitType: string;
  unitPrice: number;
  totalPrice: number;
  approvalStatus?: ApprovalStatus;
  createdBy: number;
  createdAt: string;
}

export interface OrdersApprovalRequest {
  id: number;
  orderNumber: string;
  dealerName: string;
  itemName: string;
  orderQuantity: number;
  unitType: string;
  totalPrice: number;
  shipmentPrice: number;
  orderDate: string;
  approvalStatus?: ApprovalStatus;
  createdBy: string;
}


export interface ProcessApprovalPayload {
  decision: ApprovalStatus | OrderStatus;
  rejectionReason?: string;
}

export type UnifiedApprovalItem = 
  | (DocumentApprovalItem & { approvalType: 'DOCUMENT' } )
  | (ProfileApprovalRequest & { approvalType: 'PROFILE' })
  | (StocksApprovalRequest & { approvalType: 'STOCKS'})
  | (OrdersApprovalRequest & { approvalType: 'ORDERS'});

export interface PreviewModalProps {
  request: UnifiedApprovalItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
  formatTime: (isoString: string) => string;
}