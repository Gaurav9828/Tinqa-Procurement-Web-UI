/**
 * Ecommerce WarrantyDTOs. SUBMITTED by the customer → IN_REVIEW once customer care wrote the diagnosis → APPROVED
 * (repair or replace) or REJECTED by someone else with WARRANTY_CLAIM_DECIDE → RESOLVED when the unit is repaired or
 * replaced.
 */
export type WarrantyClaimStatus = 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
export type WarrantyResolution = 'REPAIR' | 'REPLACE';
export type CoverageStatus = 'NOT_STARTED' | 'ACTIVE' | 'EXPIRED' | 'NO_WARRANTY';

export interface WarrantyClaimRow {
  referenceNumber: string;
  status: WarrantyClaimStatus;
  resolution: WarrantyResolution | null;
  serial: string;
  productTitle: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
}

export interface WarrantyClaim extends WarrantyClaimRow {
  description: string;
  warrantyTitle: string | null;
  coverageStartsOn: string | null;
  coverageEndsOn: string | null;
  coverageStatus: CoverageStatus;
  diagnosis: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
}

export interface WarrantyDecision {
  approve: boolean;
  resolution?: WarrantyResolution | null;
  note?: string | null;
}

export const CLAIM_STATUS_LABEL: Record<WarrantyClaimStatus, string> = {
  SUBMITTED: 'New',
  IN_REVIEW: 'Waiting for decision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RESOLVED: 'Resolved',
};

export const RESOLUTION_LABEL: Record<WarrantyResolution, string> = { REPAIR: 'Repair', REPLACE: 'Replace' };
