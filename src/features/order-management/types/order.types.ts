export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export const ORDER_STATUS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

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
  status: OrderStatus;
  actualDelivery?: string;
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
  expectedDelivery?: string;
  orderDate?: string;
  additionalInfo?: Record<string, any>;
}