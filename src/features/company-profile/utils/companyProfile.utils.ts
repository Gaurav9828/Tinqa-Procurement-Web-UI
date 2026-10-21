import type { CompanyProfileVersion, TrademarkMark, VersionStatus } from '../types/companyProfile.types';

export const COMPANY_PROFILE_PATH = '/settings/company-profile';
export const companyHistoryPath = `${COMPANY_PROFILE_PATH}/history`;
export const companyDraftPath = (id: number | 'new') => `${COMPANY_PROFILE_PATH}/drafts/${id}`;
/** The profile page opened on a section's tab (slug from SECTIONS). */
export const companySectionPath = (slug: string) => `${COMPANY_PROFILE_PATH}?section=${slug}`;
export const companyVersionPath = (id: number) => `${COMPANY_PROFILE_PATH}/versions/${id}`;

export const TRADEMARK_SYMBOLS: Record<TrademarkMark, string> = { '': '', TM: '™', R: '®', SM: '℠' };

export const TRADEMARK_OPTIONS: { value: TrademarkMark; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'TM', label: '™ TM' },
  { value: 'R', label: '® R' },
  { value: 'SM', label: '℠ SM' },
];

export const STATUS_LABELS: Record<VersionStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUPERSEDED: 'Superseded',
  WITHDRAWN: 'Withdrawn',
  DELETED: 'Deleted',
};

/** Labels for change rows and missing-field lists; keys are the backend's field paths. */
export const FIELD_LABELS: Record<string, string> = {
  brandName: 'Brand name',
  trademarkMark: 'Trademark mark',
  logoUrl: 'Logo',
  logoDarkUrl: 'Dark-mode logo',
  faviconUrl: 'Favicon',
  legalName: 'Legal name',
  gstin: 'GSTIN',
  pan: 'PAN',
  cin: 'CIN',
  headquartersName: 'Headquarters name',
  'address.line1': 'Address line 1',
  'address.line2': 'Address line 2',
  'address.city': 'City',
  'address.district': 'District',
  'address.state': 'State',
  'address.stateCode': 'State code',
  'address.postalCode': 'Postal code',
  'address.country': 'Country',
  supportEmail: 'Support email',
  supportPhone: 'Support phone',
  careersEmail: 'Careers email',
  website: 'Website',
  invoiceTerms: 'Invoice terms',
  shippingRules: 'Shipping charges',
  homeVideoEnabled: 'Home page video',
  homeVideoUrl: 'Home page video link',
  loginImageUrl: 'Sign-in image',
  adminLoginHeadline: 'Admin sign-in headline',
  adminLoginTagline: 'Admin sign-in tagline',
  adminLoginHighlights: 'Admin sign-in points',
  storeLoginHeadline: 'Storefront sign-in headline',
  storeLoginTagline: 'Storefront sign-in tagline',
  storeLoginHighlights: 'Storefront sign-in points',
};

export const IMAGE_FIELDS = new Set(['logoUrl', 'logoDarkUrl', 'faviconUrl', 'loginImageUrl']);
export const LOGIN_HIGHLIGHT_FIELDS = new Set(['adminLoginHighlights', 'storeLoginHighlights']);

export const fieldLabel = (field: string) => {
  const term = /^invoiceTerms\[(\d+)\]$/.exec(field);
  if (term) return `Invoice term ${Number(term[1]) + 1}`;
  const point = /^(adminLogin|storeLogin)Highlights\[(\d+)\]$/.exec(field);
  if (point) return `${point[1] === 'adminLogin' ? 'Admin' : 'Storefront'} sign-in point ${Number(point[2]) + 1}`;
  const rule = /^shippingRules\[(\d+)\]\.(minOrderValue|maxOrderValue|fee)$/.exec(field);
  if (rule) return `Shipping rule ${Number(rule[1]) + 1} ${rule[2] === 'fee' ? 'fee' : 'order value'}`;
  return FIELD_LABELS[field] ?? field;
};

/**
 * Whether approving this version changes the video on the live home page: the switch flips, or the
 * link changes while it's on. Compares with `live` when given, otherwise uses the version's `changes`.
 */
export const changesLiveHomeVideo = (version: CompanyProfileVersion, live?: CompanyProfileVersion | null): boolean => {
  const on = version.homeVideoEnabled === true;
  if (live !== undefined) {
    const wasOn = live?.homeVideoEnabled === true;
    return on !== wasOn || (on && (version.homeVideoUrl ?? null) !== (live?.homeVideoUrl ?? null));
  }
  return !!version.changes?.some((c) => c.field === 'homeVideoEnabled' || (c.field === 'homeVideoUrl' && on));
};

export const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** "Below ₹10,000", "₹10,000 to below ₹15,000", "₹15,000 and above" (or "Every order" for a single rule). */
export const shippingRuleRange = (min: number, max: number | null) => {
  if (max == null) return min === 0 ? 'Every order' : `${rupees(min)} and above`;
  return min === 0 ? `Below ${rupees(max)}` : `${rupees(min)} to below ${rupees(max)}`;
};

/** Booleans in read-only views and change rows; null (never set) reads as off. */
export const onOff = (value: unknown) => (value === true ? 'On' : 'Off');

export const HOME_VIDEO_APPROVAL_NOTE = 'Approving changes the video on the live home page.';

/**
 * Server timestamps are IST local date-times without an offset ("2026-10-13T10:00:00").
 * Read them as IST so admins in any time zone see the right moment, in their own locale.
 */
export const parseServerTime = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatServerTime = (value: string | null | undefined): string => {
  const date = parseServerTime(value);
  if (!date) return value || '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** "admin_l1" vs "Admin_L1": usernames compare case-insensitively. */
export const sameUser = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export const PENDING_SUBMIT_BLOCKED = 'A change is waiting for approval. Submit is available once it is approved, rejected or withdrawn.';

/** Submit blocked by a pending change to the same section (or to the whole profile). */
export const pendingSubmitBlocked = (sectionLabel: string) =>
  `A change to ${sectionLabel} is waiting for approval. Submit is available once it is approved, rejected or withdrawn.`;

/** Fallback texts for the backend's error codes (its own `message` wins when present). */
export const ERROR_MESSAGES: Record<string, string> = {
  APPROVAL_SELF_NOT_ALLOWED: 'You created or submitted this change; another approver must approve it.',
  NOT_VERSION_OWNER: 'Only the admin who created this draft can edit, submit or delete it (a Super Admin can delete any draft), and only the submitter can withdraw it.',
  FORBIDDEN: 'Your admin level is not allowed to do this.',
  VERSION_NOT_FOUND: 'This version no longer exists.',
  COMPANY_PROFILE_NOT_FOUND: 'No company profile has been set up yet.',
  PENDING_CHANGE_EXISTS: 'A change to this section is already waiting for approval.',
  INVALID_STATE_TRANSITION: 'This version has changed and no longer allows this action. The page has been refreshed.',
  CONCURRENT_UPDATE: 'Someone else changed this draft. Reload it to continue.',
};
