export type SupplierLoginStatus = 'APPROVAL_PENDING' | 'ACTIVE' | 'REJECTED' | 'DISABLED';

/** A supplier's web login (GET /v1/admin/suppliers/{id}/login). */
export interface SupplierLogin {
  id: number;
  supplierId: number;
  supplierName: string | null;
  supplierActive: boolean;
  username: string | null;
  email: string | null;
  status: SupplierLoginStatus;
  /** True until the supplier replaces the default password. */
  passwordChangePending: boolean;
  createdBy: number;
  createdByUsername: string | null;
  createdAt: string;
  decidedByUsername: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
}

export interface CreateSupplierLoginRequest {
  username: string;
  email: string;
}

export const SUPPLIER_LOGIN_STATUS_LABEL: Record<SupplierLoginStatus, string> = {
  APPROVAL_PENDING: 'Waiting for approval',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  DISABLED: 'Disabled',
};
