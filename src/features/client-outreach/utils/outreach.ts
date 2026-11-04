import { CLIENT_CATEGORY_LABELS, isGoogleMapsLink, PATTERNS } from '../../client-demos/utils/clientDemo';
import type {
  BusinessPayload,
  BusinessType,
  ContactChannel,
  ContactPayload,
  ContactRating,
  Interest,
  NextAction,
} from '../types/outreach.types';

export const OUTREACH_PATH = '/client-outreach';
export const businessPath = (id: number) => `${OUTREACH_PATH}/businesses/${id}`;

export const BUSINESS_PAGE_SIZE = 20;
export const CONTACT_PAGE_SIZE = 10;

/** The business types offered for outreach (the contract's list; labels shared with client demos). */
export const BUSINESS_TYPES: BusinessType[] = ['HOTEL', 'HOME_STAY', 'CORPORATE_OFFICE', 'HOSPITAL', 'CLINIC', 'RESTAURANT', 'SHOPPING_MALL', 'OTHER'];
export const businessTypeLabel = (type: string | null | undefined) =>
  (type && CLIENT_CATEGORY_LABELS[type as BusinessType]) || type || '—';

export const CHANNEL_LABELS: Record<ContactChannel, string> = {
  CALL: 'Phone call',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  IN_PERSON: 'In person',
  OTHER: 'Other',
};

export const RATING_LABELS: Record<ContactRating, string> = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  AVERAGE: 'Average',
  BAD: 'Bad',
  WORSE: 'Worse',
};

export const INTEREST_LABELS: Record<Interest, string> = {
  INTERESTED: 'Interested',
  MAYBE: 'Maybe',
  LATER: 'Later',
  NOT_INTERESTED: 'Not interested',
};

export const NEXT_ACTION_LABELS: Record<NextAction, string> = {
  NONE: 'Nothing planned',
  CALL_BACK: 'Call back',
  DEMO_REQUESTED: 'Demo requested',
  MEETING_REQUESTED: 'Meeting requested',
};

/** Badge colours: positive green, undecided amber, negative red. */
export const INTEREST_TONE: Record<Interest, string> = {
  INTERESTED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  MAYBE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  LATER: 'bg-blue-500/10 text-[#0071e3] dark:text-blue-400 border-blue-500/20',
  NOT_INTERESTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
};

export const options = <K extends string>(labels: Record<K, string>) =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));

// ---- Dates ----------------------------------------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD of a local date. */
export const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const daysAgo = (days: number, from = new Date()) => {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return isoDate(date);
};

/** A `datetime-local` value (YYYY-MM-DDTHH:mm) for a moment, in the browser's time zone. */
export const toLocalInput = (value: Date | string | null | undefined): string => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${isoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** A `datetime-local` value as ISO-8601 with the browser's offset, e.g. 2026-11-04T15:30:00+05:30. */
export const fromLocalInput = (local: string): string => {
  const date = new Date(local);
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const withSeconds = local.length === 16 ? `${local}:00` : local;
  return `${withSeconds}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  // A bare date is a local day, not UTC midnight
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return date.toLocaleDateString('en-IN', { dateStyle: 'medium' });
};

/** Due now or earlier. */
export const isOverdue = (iso: string | null | undefined, now = new Date()) => !!iso && new Date(iso).getTime() <= now.getTime();

// ---- Business form --------------------------------------------------------------------------------------------------

export interface BusinessForm {
  name: string;
  businessType: BusinessType | '';
  city: string;
  address: string;
  googleMapsUrl: string;
  phone: string;
  email: string;
  contactPerson: string;
  notes: string;
}

export const EMPTY_BUSINESS: BusinessForm = {
  name: '', businessType: '', city: '', address: '', googleMapsUrl: '', phone: '', email: '', contactPerson: '', notes: '',
};

export const businessToForm = (b: Partial<BusinessPayload> | null): BusinessForm =>
  b
    ? {
        name: b.name ?? '', businessType: b.businessType ?? '', city: b.city ?? '', address: b.address ?? '',
        googleMapsUrl: b.googleMapsUrl ?? '', phone: b.phone ?? '', email: b.email ?? '', contactPerson: b.contactPerson ?? '',
        notes: b.notes ?? '',
      }
    : EMPTY_BUSINESS;

const blank = (value: string) => value.trim() || null;

export const validateBusiness = (form: BusinessForm): Partial<Record<keyof BusinessForm, string>> => {
  const errors: Partial<Record<keyof BusinessForm, string>> = {};
  if (!form.name.trim()) errors.name = 'Enter the business name.';
  if (!form.businessType) errors.businessType = 'Pick the type of business.';
  if (form.email.trim() && !PATTERNS.email.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  // Mobiles and landlines (with the STD code); the server normalises Indian numbers to 10 digits
  const phoneLength = form.phone.replace(/\D/g, '').length;
  if (form.phone.trim() && (phoneLength < 10 || phoneLength > 15)) errors.phone = 'Enter the number with its area code (10 digits or more).';
  if (form.googleMapsUrl.trim() && !isGoogleMapsLink(form.googleMapsUrl.trim())) errors.googleMapsUrl = 'Paste an https:// Google Maps link.';
  return errors;
};

export const businessPayload = (form: BusinessForm): BusinessPayload => ({
  name: form.name.trim(),
  businessType: form.businessType as BusinessType,
  city: blank(form.city),
  address: blank(form.address),
  googleMapsUrl: blank(form.googleMapsUrl),
  phone: blank(form.phone),
  email: blank(form.email)?.toLowerCase() ?? null,
  contactPerson: blank(form.contactPerson),
  notes: blank(form.notes),
});

// ---- Contact form ---------------------------------------------------------------------------------------------------

export const SUMMARY_MAX = 4000;
export const RESPONSE_MAX = 2000;

export interface ContactForm {
  channel: ContactChannel | '';
  contactedAt: string;
  contactPerson: string;
  contactPhone: string;
  summary: string;
  response: string;
  rating: ContactRating | '';
  interest: Interest | '';
  nextAction: NextAction;
  followUpAt: string;
}

export const newContactForm = (now = new Date()): ContactForm => ({
  channel: 'CALL', contactedAt: toLocalInput(now), contactPerson: '', contactPhone: '', summary: '', response: '',
  rating: '', interest: '', nextAction: 'NONE', followUpAt: '',
});

export const contactToForm = (c: {
  channel: ContactChannel; contactedAt: string; contactPerson: string | null; contactPhone: string | null; summary: string;
  response: string | null; rating: ContactRating | null; interest: Interest | null; nextAction: NextAction; followUpAt: string | null;
}): ContactForm => ({
  channel: c.channel, contactedAt: toLocalInput(c.contactedAt), contactPerson: c.contactPerson ?? '', contactPhone: c.contactPhone ?? '',
  summary: c.summary, response: c.response ?? '', rating: c.rating ?? '', interest: c.interest ?? '', nextAction: c.nextAction,
  followUpAt: toLocalInput(c.followUpAt),
});

export const validateContact = (form: ContactForm): Partial<Record<keyof ContactForm, string>> => {
  const errors: Partial<Record<keyof ContactForm, string>> = {};
  if (!form.channel) errors.channel = 'Pick how you contacted them.';
  if (!form.contactedAt) errors.contactedAt = 'Enter when you contacted them.';
  if (!form.summary.trim()) errors.summary = 'Write what was discussed.';
  else if (form.summary.trim().length > SUMMARY_MAX) errors.summary = `At most ${SUMMARY_MAX} characters.`;
  if (form.response.trim().length > RESPONSE_MAX) errors.response = `At most ${RESPONSE_MAX} characters.`;
  if (!form.rating) errors.rating = 'Say how the conversation went.';
  if (!form.interest) errors.interest = 'Say how interested they are.';
  if (form.nextAction !== 'NONE') {
    if (!form.followUpAt) errors.followUpAt = 'Pick the follow-up date and time.';
    else if (form.contactedAt && new Date(form.followUpAt).getTime() <= new Date(form.contactedAt).getTime()) {
      errors.followUpAt = 'The follow-up must come after the contact.';
    }
  }
  return errors;
};

export const contactPayload = (form: ContactForm): ContactPayload => ({
  contactedAt: fromLocalInput(form.contactedAt),
  channel: form.channel as ContactChannel,
  contactPerson: blank(form.contactPerson),
  contactPhone: blank(form.contactPhone),
  summary: form.summary.trim(),
  response: blank(form.response),
  rating: form.rating as ContactRating,
  interest: form.interest as Interest,
  nextAction: form.nextAction,
  followUpAt: form.nextAction === 'NONE' || !form.followUpAt ? null : fromLocalInput(form.followUpAt),
});

// ---- Proofs ---------------------------------------------------------------------------------------------------------

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_MAX_COUNT = 5;
export const PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
export const PROOF_ACCEPT = PROOF_TYPES.join(',');

export const isImageProof = (contentType: string) => contentType.startsWith('image/');

export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Splits picked files into those that can be added and the reasons the others can't: only images (png, jpeg, webp)
 * and PDFs, at most 5 MB each and 5 per contact (counting the ones it already has).
 */
export const checkProofFiles = (files: File[], alreadyAttached: number): { accepted: File[]; problems: string[] } => {
  const accepted: File[] = [];
  const problems: string[] = [];
  for (const file of files) {
    if (!PROOF_TYPES.includes(file.type)) problems.push(`${file.name}: only PNG, JPEG, WebP images or PDFs.`);
    else if (file.size > PROOF_MAX_BYTES) problems.push(`${file.name}: larger than 5 MB.`);
    else if (alreadyAttached + accepted.length >= PROOF_MAX_COUNT) problems.push(`${file.name}: at most ${PROOF_MAX_COUNT} proofs per contact.`);
    else accepted.push(file);
  }
  return { accepted, problems };
};
