export type DealerLoginStatus = 'APPROVAL_PENDING' | 'ACTIVE' | 'REJECTED' | 'DISABLED';

/** A dealer's web login (GET /v1/admin/dealers/{id}/login). */
export interface DealerLogin {
  id: number;
  dealerId: number;
  dealerName: string | null;
  dealerActive: boolean;
  username: string | null;
  email: string | null;
  status: DealerLoginStatus;
  /** True until the dealer replaces the default password. */
  passwordChangePending: boolean;
  createdBy: number;
  createdByUsername: string | null;
  createdAt: string;
  decidedByUsername: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
}

export interface CreateDealerLoginRequest {
  username: string;
  email: string;
}

export const DEALER_LOGIN_STATUS_LABEL: Record<DealerLoginStatus, string> = {
  APPROVAL_PENDING: 'Waiting for approval',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  DISABLED: 'Disabled',
};
