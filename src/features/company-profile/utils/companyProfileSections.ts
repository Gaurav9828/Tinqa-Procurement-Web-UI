import type { CompanyProfileVersion, ProfileSection } from '../types/companyProfile.types';
import { missingForSubmit, type CompanyProfileForm, type FormErrors } from './companyProfileForm';

interface SectionInfo {
  label: string;
  /** In the URL: /settings/company-profile?section=<slug>. */
  slug: string;
  description: string;
  /** Top-level field names (the backend's); "address.city", "invoiceTerms[2]" belong to their root. */
  fields: readonly string[];
}

/**
 * The parts of the company profile that are changed, reviewed and approved on their own (mirrors the backend's
 * CompanyProfileSection). A section draft changes only its own fields; approving it applies them on top of the
 * live profile. GSTIN and address are one section because they are checked against each other.
 */
export const SECTIONS: Record<ProfileSection, SectionInfo> = {
  BRAND: {
    label: 'Brand',
    slug: 'brand',
    description: 'Brand name, trademark mark, logos and favicon on the storefront, sign-in pages and documents.',
    fields: ['brandName', 'trademarkMark', 'logoUrl', 'logoDarkUrl', 'faviconUrl'],
  },
  LEGAL_ADDRESS: {
    label: 'Legal & address',
    slug: 'legal-address',
    description: 'Legal name, GSTIN, PAN, CIN and the registered address printed on invoices; the state code decides CGST + SGST or IGST.',
    fields: ['legalName', 'gstin', 'pan', 'cin', 'headquartersName', 'address'],
  },
  CONTACT: {
    label: 'Contact',
    slug: 'contact',
    description: 'Support and careers contacts and the website shown to customers.',
    fields: ['supportEmail', 'supportPhone', 'careersEmail', 'website'],
  },
  HOME_VIDEO: {
    label: 'Home page video',
    slug: 'home-video',
    description: 'The YouTube video playing behind the storefront home page.',
    fields: ['homeVideoEnabled', 'homeVideoUrl'],
  },
  SIGN_IN: {
    label: 'Sign-in pages',
    slug: 'sign-in',
    description: 'The image and the text beside the sign-in form, on this admin portal and on the storefront.',
    fields: ['loginImageUrl', 'adminLoginHeadline', 'adminLoginTagline', 'adminLoginHighlights', 'storeLoginHeadline', 'storeLoginTagline', 'storeLoginHighlights'],
  },
  SHIPPING: {
    label: 'Shipping charges',
    slug: 'shipping',
    description: 'The shipping fee customers pay, by order value.',
    fields: ['shippingRules'],
  },
  INVOICE_TERMS: {
    label: 'Invoice terms',
    slug: 'invoice-terms',
    description: 'Terms printed at the foot of every invoice.',
    fields: ['invoiceTerms'],
  },
};

export const PROFILE_SECTIONS = Object.keys(SECTIONS) as ProfileSection[];

export const WHOLE_PROFILE_LABEL = 'Whole profile';

/** "Brand", or "Whole profile" for a version that changes every section (the first one, or an older version). */
export const sectionLabel = (section: ProfileSection | null | undefined) => (section ? SECTIONS[section].label : WHOLE_PROFILE_LABEL);

export const sectionFromSlug = (slug: string | null): ProfileSection | null =>
  PROFILE_SECTIONS.find((section) => SECTIONS[section].slug === slug) ?? null;

/** Whether a field path ("address.city", "invoiceTerms[2]", "shippingRules[0].fee") is one of the section's. */
export const sectionOwns = (section: ProfileSection, field: string) =>
  SECTIONS[section].fields.some((root) => field === root || field.startsWith(`${root}.`) || field.startsWith(`${root}[`));

/** The section a field belongs to. */
export const sectionOfField = (field: string): ProfileSection | null => PROFILE_SECTIONS.find((section) => sectionOwns(section, field)) ?? null;

/** Errors a section draft answers for: its own fields only (the rest is the live profile). Null = the whole profile. */
export const errorsInSection = (section: ProfileSection | null, errors: FormErrors): FormErrors =>
  section ? Object.fromEntries(Object.entries(errors).filter(([field]) => sectionOwns(section, field))) : errors;

/** Required-to-submit fields that are empty, limited to the section's own (null = the whole profile). */
export const missingInSection = (section: ProfileSection | null, form: CompanyProfileForm) =>
  missingForSubmit(form).filter((m) => !section || sectionOwns(section, m.key));

/**
 * Whether a pending change stops `section` from being submitted: one change per section waits for approval, and a
 * whole-profile change (section null) waits alone.
 */
export const blocksSubmit = (pending: Pick<CompanyProfileVersion, 'section'>, section: ProfileSection | null) =>
  section === null || pending.section == null || pending.section === section;

/** The pending change that stops `section` from being submitted, if any (excluding `selfId`). */
export const blockingPending = (pendingChanges: CompanyProfileVersion[], section: ProfileSection | null, selfId?: number) =>
  pendingChanges.find((p) => p.id !== selfId && blocksSubmit(p, section)) ?? null;
