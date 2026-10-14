import type { TrademarkMark, VersionStatus } from '../types/companyProfile.types';

export const COMPANY_PROFILE_PATH = '/settings/company-profile';
export const companyHistoryPath = `${COMPANY_PROFILE_PATH}/history`;
export const companyDraftPath = (id: number | 'new') => `${COMPANY_PROFILE_PATH}/drafts/${id}`;
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
  'address.state': 'State',
  'address.stateCode': 'State code',
  'address.postalCode': 'Postal code',
  'address.country': 'Country',
  supportEmail: 'Support email',
  supportPhone: 'Support phone',
  careersEmail: 'Careers email',
  website: 'Website',
  invoiceTerms: 'Invoice terms',
};

export const IMAGE_FIELDS = new Set(['logoUrl', 'logoDarkUrl', 'faviconUrl']);

export const fieldLabel = (field: string) => {
  const term = /^invoiceTerms\[(\d+)\]$/.exec(field);
  if (term) return `Invoice term ${Number(term[1]) + 1}`;
  return FIELD_LABELS[field] ?? field;
};

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

/** Fallback texts for the backend's error codes (its own `message` wins when present). */
export const ERROR_MESSAGES: Record<string, string> = {
  APPROVAL_SELF_NOT_ALLOWED: 'You created or submitted this change; another Level 2 admin must approve it.',
  NOT_VERSION_OWNER: 'Only the admin who created this draft can edit or submit it, and only the submitter can withdraw it.',
  FORBIDDEN: 'Your admin level is not allowed to do this.',
  VERSION_NOT_FOUND: 'This version no longer exists.',
  COMPANY_PROFILE_NOT_FOUND: 'No company profile has been set up yet.',
  PENDING_CHANGE_EXISTS: 'Another change is already waiting for approval.',
  INVALID_STATE_TRANSITION: 'This version has changed and no longer allows this action. The page has been refreshed.',
  CONCURRENT_UPDATE: 'Someone else changed this draft. Reload it to continue.',
};
