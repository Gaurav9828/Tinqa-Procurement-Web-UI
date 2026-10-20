import type { OrderStatus } from '../../../types/common.types';

/**
 * How a dealer sees the order lifecycle. Internal steps (Level 2 approval) are shown in the dealer's terms, and
 * every order falls into one of three lists: open quotations, ongoing orders, and past orders.
 */
export type DealerStage = 'quotation' | 'ongoing' | 'past';

const STAGE: Record<OrderStatus, DealerStage> = {
  QUOTATION: 'quotation',
  PENDING: 'quotation',
  DEALER_LEVEL_PENDING: 'ongoing',
  CONFIRMED: 'ongoing',
  SHIPPED: 'ongoing',
  DELIVERED: 'past',
  CANCELLED: 'past',
  RETURN_REQUESTED: 'ongoing',
  RETURN_APPROVED: 'ongoing',
  RETURN_PICKED_UP: 'ongoing',
  RETURN_RECEIVED: 'ongoing',
  REFUND_INITIATED: 'ongoing',
  REFUND_FAILED: 'ongoing',
  RETURN_REJECTED: 'past',
  REFUND_COMPLETED: 'past',
};

const LABEL: Record<OrderStatus, string> = {
  QUOTATION: 'Quotation',
  PENDING: 'Under review',
  DEALER_LEVEL_PENDING: 'Awaiting your confirmation',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return requested',
  RETURN_APPROVED: 'Return approved',
  RETURN_PICKED_UP: 'Return picked up',
  RETURN_RECEIVED: 'Return received',
  REFUND_INITIATED: 'Refund in progress',
  REFUND_FAILED: 'Refund failed',
  RETURN_REJECTED: 'Return rejected',
  REFUND_COMPLETED: 'Refunded',
};

export const dealerStage = (status: OrderStatus): DealerStage => STAGE[status] ?? 'ongoing';

export const dealerStatusLabel = (status: OrderStatus): string => LABEL[status] ?? status.replace(/_/g, ' ').toLowerCase();
