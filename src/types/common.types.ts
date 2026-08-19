import type { UnifiedApprovalItem } from "../features/approvals/types/approval.types";

  // In your abc.type.ts file
  export type Department = 
    | 'Procurement'
    | 'Procurement Logistics'
    | 'Inventory Management'
    | 'Vendor Operations'
    | 'Finance & Accounts'
    | 'Legal & Compliance'
    | 'IT & Infrastructure';

  // This is now a mutable array of your specific type
  export const DEPARTMENTS: Department[] = [
    'Procurement',
    'Procurement Logistics',
    'Inventory Management',
    'Vendor Operations',
    'Finance & Accounts',
    'Legal & Compliance',
    'IT & Infrastructure',
  ];

  export type Designation =
    | 'Administrator Level 1'
    | 'Administrator Level 2'
    | 'Junior Procurement Specialist'
    | 'Senior Procurement Manager'
    | 'Logistics Coordinator'
    | 'Operations Lead'
    | 'Regional Director';

  // This is now a mutable array that matches your specific type
  export const DESIGNATIONS: Designation[] = [
    'Administrator Level 1',
    'Administrator Level 2',
    'Junior Procurement Specialist',
    'Senior Procurement Manager',
    'Logistics Coordinator',
    'Operations Lead',
    'Regional Director',
  ];

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

  export type OrderStatus =
    | 'PENDING'
    | 'DEALER_LEVEL_PENDING'
    | 'CONFIRMED'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED';

  export const ORDER_STATUS: OrderStatus[] = [
    'PENDING',
    'DEALER_LEVEL_PENDING',
    'CONFIRMED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
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
