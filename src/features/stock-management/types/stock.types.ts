import type { ApprovalStatus } from '../../../types/common.types';

export interface CreateStockFromOrderRequest {
  orderNumber: string;
  unitsPassedTest: number;
  defectedUnits: number;
  hasTested: boolean;
  dateOfArrival: string;
  additionalInfo?: Record<string, any>;
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
  /** The counts Admin L2 last approved (null until first approved): what finance has booked. */
  approvedUnitsPassed?: number | null;
  approvedDefectedUnits?: number | null;
  /** The counts were changed after approval: the change, and its money, wait for Admin L2. */
  changeAwaitingApproval?: boolean;
  /** Passed units added since approval, not usable until Admin L2 approves them. */
  heldUnits?: number;
  /** Value of the approved passed units booked as bought from the dealer (before GST). */
  bookedPurchaseValue?: number;
}

/** StockDTOs.ItemAvailabilityResponse — GET /v1/stocks/items/{itemId}/availability. */
export interface ItemAvailabilityResponse {
  itemId: number;
  itemName: string;
  itemSku: string;
  unitOfMeasure: string;
  /** Consumable units: active, approved stock from delivered orders. */
  totalAvailableUnits: number;
  stocks: {
    stockId: number;
    stockIdentityNumber: string;
    batchNumber: string;
    orderNumber: string;
    availableUnits: number;
    dateOfArrival: string;
  }[];
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

export type { ProcessApprovalPayload as ApprovalDecisionRequest } from '../../approvals/types/approval.types';
