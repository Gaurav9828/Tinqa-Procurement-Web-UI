// Company profile with maker-checker approval (Ecommerce BE, /api/admin/company/**).
// Timestamps are ISO local date-times without an offset, in server time (IST). Any profile field may be null.

export const VERSION_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'WITHDRAWN', 'DELETED'] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

/** A part of the profile that is drafted, reviewed and approved on its own (see utils/companyProfileSections). */
export const PROFILE_SECTION_KEYS = ['BRAND', 'LEGAL_ADDRESS', 'CONTACT', 'HOME_VIDEO', 'SIGN_IN', 'SHIPPING', 'INVOICE_TERMS'] as const;
export type ProfileSection = (typeof PROFILE_SECTION_KEYS)[number];

export const TRADEMARK_MARKS = ['', 'TM', 'R', 'SM'] as const;
export type TrademarkMark = (typeof TRADEMARK_MARKS)[number];

export interface CompanyAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  stateCode: string | null;
  postalCode: string | null;
  country: string | null;
}

/**
 * One shipping charge rule: an order whose subtotal is from minOrderValue (inclusive) up to maxOrderValue
 * (exclusive; null = no upper limit) pays `fee`. Rules start at 0 and follow each other without gaps.
 */
export interface ShippingRule {
  minOrderValue: number;
  maxOrderValue: number | null;
  fee: number;
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
  /** Storefront shipping fee by order value; empty = every order ships free. */
  shippingRules: ShippingRule[] | null;
  /** Master switch for the storefront's background video; off = no video, whatever the URL. */
  homeVideoEnabled: boolean | null;
  /** YouTube link of the home page background video. */
  homeVideoUrl: string | null;
  /** Background of the image half of both sign-in pages (admin and storefront); null = the built-in gradient. */
  loginImageUrl: string | null;
  /** Admin web UI sign-in page text. Null / empty parts are left out. */
  adminLoginHeadline: string | null;
  adminLoginTagline: string | null;
  adminLoginHighlights: string[] | null;
  /** Storefront sign-in page text. */
  storeLoginHeadline: string | null;
  storeLoginTagline: string | null;
  storeLoginHighlights: string[] | null;
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
  /** The one section this version changes; null = the whole profile (the first version, or older ones). */
  section: ProfileSection | null;
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
  /** Waiting for approval, oldest submission first: at most one per section, or one whole-profile change. */
  pendingChanges: CompanyProfileVersion[];
  /** The caller's DRAFT + REJECTED versions, newest first. */
  myDrafts: CompanyProfileVersion[];
}

export type AssetPurpose = 'LOGO' | 'LOGO_DARK' | 'FAVICON' | 'LOGIN_IMAGE';

export interface AssetUploadResponse {
  url: string;
  purpose: AssetPurpose;
  contentType: string;
  size: number;
}

/** POST /drafts: every field (a whole-profile draft), a copy of live, or a section draft (always copied from live). */
export type CreateDraftRequest = CompanyProfileFields | { copyFromLive: true; section?: ProfileSection };

export type SaveDraftRequest = CompanyProfileFields & { lockVersion?: number };
