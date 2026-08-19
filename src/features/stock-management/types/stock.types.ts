import type { ApprovalStatus } from '../../../types/common.types';

export interface CreateStockFromOrderRequest {
  orderNumber: string;
  unitsPassedTest: number;
  defectedUnits: number;
  hasTested: boolean;
  dateOfArrival: string;
  additionalInfo?: Record<string, any>;
}

export interface QuantityAdjustmentRequest {
  quantity: number;
  reason?: string;
}

export interface StockResponse {
  id: number;
  stockIdentityNumber: string;
  batchNumber: string;
  orderNumber: string;
  dealerId: number;
  dealerName: string;
  itemId: number;
  itemName: string;
  totalOrderQuantity: number;
  unitType: string;
  unitsPassedTest: number;
  defectedUnits: number;
  availableUnits: number;
  unitPrice: number;
  totalPrice: number;
  hasTested: boolean;
  additionalInfo: Record<string, any> | null;
  approvalStatus: ApprovalStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  dateOfArrival: string;
  isActive: boolean;
  createdAt: string;
  createdBy: number;
}

export interface UpdateStockRequest {
  batchNumber: string;
  dealerId: number;
  itemId: number;
  unitsPassedTest: number;
  defectedUnits: number;
  hasTested: boolean;
  dateOfArrival: string;
  additionalInfo?: Record<string, any>;
  isActive: boolean;
}