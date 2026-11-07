import type { PaymentMethod } from '../../order-management/utils/paymentPlan';
import type { ApprovalStatus, OrderStatus } from "../../../types/common.types";
import type { ProductApprovalResponse } from "../../products-management/types/productApproval.types";
import type { EmployeeResponse } from "../../employee-management/types/employee.types";
import type { OrderApprovalType } from "../utils/orderQueues";

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
  /** Always null: department follows the designation and is no longer requested here. */
  department: string | null;
  /** Always null: designation is no longer changed through profile change requests. */
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
  stockIdentityNumber?: string;
  batchNumber: string;
  orderNumber: string;
  supplierName: string;
  itemName: string;
  totalOrderQuantity: number;
  unitType: string;
  unitPrice: number;
  totalPrice: number;
  approvalStatus?: ApprovalStatus;
  createdBy: number;
  createdAt: string;
  unitsPassedTest?: number;
  defectedUnits?: number;
  /** Set on an approved entry whose counts changed since: the change (and its money) waits for Admin L2. */
  changeAwaitingApproval?: boolean;
  approvedUnitsPassed?: number | null;
  approvedDefectedUnits?: number | null;
  heldUnits?: number;
}

export interface OrdersApprovalRequest {
  id: number;
  orderNumber: string;
  supplierName: string;
  itemName: string;
  orderQuantity: number;
  unitType: string;
  totalPrice: number;
  shipmentPrice: number;
  orderDate: string;
  approvalStatus?: ApprovalStatus;
  createdBy: string;
  createdAt?: string;
  orderStatus?: OrderStatus;
  unitPrice?: number;
  expectedDelivery?: string | null;
  additionalInfo?: Record<string, unknown> | null;
  raisedBySupplier?: boolean;
  supplierChangePending?: boolean;
  /** As the supplier quoted them (the list returns the whole order) */
  taxBreakup?: Record<string, unknown> | null;
  advancePercent?: number | null;
  midtermPercent?: number | null;
  expectedPaymentMethod?: PaymentMethod | null;
}


export interface ProcessApprovalPayload {
  decision: ApprovalStatus | OrderStatus;
  rejectionReason?: string;
}

export type UnifiedApprovalItem = 
  | (DocumentApprovalItem & { approvalType: 'DOCUMENT' } )
  | (ProfileApprovalRequest & { approvalType: 'PROFILE' })
  | (StocksApprovalRequest & { approvalType: 'STOCKS'})
  | (OrdersApprovalRequest & { approvalType: OrderApprovalType })
  | (ProductApprovalResponse & { approvalType: 'PRODUCTS' })
  | (EmployeeResponse & { approvalType: 'EMPLOYEE' });

export interface PreviewModalProps {
  request: UnifiedApprovalItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
  formatTime: (isoString: string) => string;
}