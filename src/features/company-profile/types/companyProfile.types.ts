// Company profile with maker-checker approval (Ecommerce BE, /api/admin/company/**).
// Timestamps are ISO local date-times without an offset, in server time (IST). Any profile field may be null.

export const VERSION_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'WITHDRAWN'] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

export const TRADEMARK_MARKS = ['', 'TM', 'R', 'SM'] as const;
export type TrademarkMark = (typeof TRADEMARK_MARKS)[number];

export interface CompanyAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  stateCode: string | null;
  postalCode: string | null;
  country: string | null;
}

/** Every editable field: the create / edit body (PUT is a full replacement). */
export interface CompanyProfileFields {
  brandName: string | null;
  trademarkMark: TrademarkMark | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  legalName: string | null;
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  headquartersName: string | null;
  address: CompanyAddress | null;
  supportEmail: string | null;
  supportPhone: string | null;
  careersEmail: string | null;
  website: string | null;
  invoiceTerms: string[] | null;
}

/** One field that differs from the live profile, e.g. "address.city" or "invoiceTerms". */
export interface FieldChange {
  field: string;
  liveValue: unknown;
  value: unknown;
}

export interface AuditEntry {
  action: string;
  actor: string | null;
  fromStatus: VersionStatus | null;
  toStatus: VersionStatus | null;
  comment: string | null;
  createdAt: string;
}

export interface CompanyProfileVersion extends CompanyProfileFields {
  id: number;
  versionNo: number;
  status: VersionStatus;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  lockVersion: number;
  /** Only on GET /versions/{id}. */
  changes?: FieldChange[];
  auditTrail?: AuditEntry[];
}

export interface CompanyProfileOverview {
  live: CompanyProfileVersion | null;
  pending: CompanyProfileVersion | null;
  /** The caller's DRAFT + REJECTED versions, newest first. */
  myDrafts: CompanyProfileVersion[];
}

export type AssetPurpose = 'LOGO' | 'LOGO_DARK' | 'FAVICON';

export interface AssetUploadResponse {
  url: string;
  purpose: AssetPurpose;
  contentType: string;
  size: number;
}

export type SaveDraftRequest = CompanyProfileFields & { lockVersion?: number };
