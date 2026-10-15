import type { OrderStatus } from "../../../types/common.types";

export interface CreateOrderRequest {
  dealerId: number;
  itemId: number;
  orderQuantity: number;
  unitType: string;
  unitPrice: number;
  shipmentPrice: number;
  taxBreakup?: Record<string, any>;
  expectedDelivery?: string;
  orderDate: string;
  additionalInfo?: Record<string, any>;
}

export interface UpdateOrderStatusRequest {
  /** Must be an allowed next status of the order's current one (see utils/orderWorkflow). */
  status: OrderStatus;
  /** Required when moving to DELIVERED. */
  actualDelivery?: string;
  /** Required for cancel, return request/rejection and failed refunds; optional otherwise. */
  reason?: string;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  dealerId: number;
  dealerName: string;
  itemId: number;
  itemName: string;
  orderQuantity: number;
  unitType: string;
  unitPrice: number;
  totalPrice: number;
  shipmentPrice: number;
  taxBreakup: Record<string, any> | null;
  orderStatus: OrderStatus;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  orderDate: string;
  additionalInfo: Record<string, any> | null;
  createdAt: string;
  createdBy: number;
}

export interface UpdateOrderRequest {
  dealerId?: number;
  itemId?: number;
  orderQuantity?: number;
  unitType?: string;
  unitPrice?: number;
  shipmentPrice?: number;
  taxBreakup?: Record<string, any>;
  // null clears a previously set date.
  expectedDelivery?: string | null;
  orderDate?: string;
  additionalInfo?: Record<string, any>;
}