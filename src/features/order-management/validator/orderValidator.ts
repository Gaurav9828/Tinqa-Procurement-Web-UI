import type { CreateOrderRequest, UpdateOrderRequest } from '../types/order.types';

// Keep in sync with the backend OrderRequest constraints.
export const ORDER_LIMITS = {
  MAX_QUANTITY: 1_000_000,
  MAX_UNIT_PRICE: 10_000_000,
  MAX_SHIPMENT_PRICE: 10_000_000,
  MAX_UNIT_TYPE_LENGTH: 20,
} as const;

const isPositiveId = (value: unknown) => Number.isInteger(value) && (value as number) > 0;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const hasAtMostTwoDecimals = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

/** Returns an error message, or an empty string when the order payload is valid. */
export const validateOrderPayload = (payload: CreateOrderRequest | UpdateOrderRequest): string => {
  if (!isPositiveId(payload.itemId)) return 'Please select an item.';
  if (!isPositiveId(payload.dealerId)) return 'Please select a dealer.';

  const { orderQuantity, unitPrice, shipmentPrice } = payload;

  if (!isFiniteNumber(orderQuantity) || !Number.isInteger(orderQuantity) || orderQuantity < 1) {
    return 'Order quantity must be a whole number of at least 1.';
  }
  if (orderQuantity > ORDER_LIMITS.MAX_QUANTITY) {
    return `Order quantity cannot exceed ${ORDER_LIMITS.MAX_QUANTITY.toLocaleString()}.`;
  }

  if (!isFiniteNumber(unitPrice) || unitPrice <= 0) return 'Unit price must be greater than 0.';
  if (unitPrice > ORDER_LIMITS.MAX_UNIT_PRICE) return 'Unit price is unrealistically high.';
  if (!hasAtMostTwoDecimals(unitPrice)) return 'Unit price can have at most 2 decimal places.';

  if (!isFiniteNumber(shipmentPrice) || shipmentPrice < 0) return 'Shipment price cannot be negative.';
  if (shipmentPrice > ORDER_LIMITS.MAX_SHIPMENT_PRICE) return 'Shipment price is unrealistically high.';
  if (!hasAtMostTwoDecimals(shipmentPrice)) return 'Shipment price can have at most 2 decimal places.';

  const unitType = payload.unitType?.trim();
  if (!unitType) return 'Unit of measure is required.';
  if (unitType.length > ORDER_LIMITS.MAX_UNIT_TYPE_LENGTH) return 'Unit of measure is too long.';

  if (payload.expectedDelivery && payload.orderDate && payload.expectedDelivery <= payload.orderDate) {
    return 'Expected delivery must be after the order date.';
  }

  return '';
};

/** Today's date as YYYY-MM-DD in the user's local timezone (toISOString() would use UTC). */
export const todayLocalIsoDate = (): string => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
};
