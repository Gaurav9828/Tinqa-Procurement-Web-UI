import type { UnifiedApprovalItem } from "../features/approvals/types/approval.types";

  export type ApprovalStatus = 
    | 'APPROVED'
    | 'PENDING'
    | 'REJECTED'
    | 'ACTIVE';

  export const APPROVL_STATUS: ApprovalStatus[] = [
    'APPROVED',
    'PENDING',
    'REJECTED',
    'ACTIVE'
  ];

  /**
   * Procurement (dealer) order lifecycle. Moves are forward-only; see
   * features/order-management/utils/orderWorkflow.ts for the allowed transitions.
   */
  export type OrderStatus =
    | 'QUOTATION'
    | 'PENDING'
    | 'DEALER_LEVEL_PENDING'
    | 'CONFIRMED'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'RETURN_REQUESTED'
    | 'RETURN_APPROVED'
    | 'RETURN_REJECTED'
    | 'RETURN_PICKED_UP'
    | 'RETURN_RECEIVED'
    | 'REFUND_INITIATED'
    | 'REFUND_FAILED'
    | 'REFUND_COMPLETED';

  /** Every procurement status, in lifecycle order (filters, labels). */
  export const ORDER_STATUS: OrderStatus[] = [
    'QUOTATION',
    'PENDING',
    'DEALER_LEVEL_PENDING',
    'CONFIRMED',
    'SHIPPED',
    'DELIVERED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_PICKED_UP',
    'RETURN_RECEIVED',
    'REFUND_INITIATED',
    'REFUND_FAILED',
    'REFUND_COMPLETED',
    'RETURN_REJECTED',
    'CANCELLED',
  ];

  export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

  // This is now a mutable array that matches your specific type
  export const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];

  export interface ApiResponse<T> {
    success: boolean;
    message: string;
    errorCode: string | null;
    data: T;
    timestamp: string;
    path: string;
  }

  /** Explicit page envelope (Ecommerce BE `PageResponse<T>`), as opposed to raw Spring `Page` JSON. */
  export interface PageResponse<T> {
    content: T[];
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  }

  // Standard Spring Boot Page structure
  export interface PageableResponse<T> {
    content: T[];
    pageable: {
      pageNumber: number;
      pageSize: number;
      sort: {
        empty: boolean;
        sorted: boolean;
        unsorted: boolean;
      };
      offset: number;
      paged: boolean;
      unpaged: boolean;
    };
    totalElements: number;
    totalPages: number;
    last: boolean;
    size: number;
    number: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    numberOfElements: number;
    first: boolean;
    empty: boolean;
  }

  export type ApprovalItem = UnifiedApprovalItem | Record<string, any>;
