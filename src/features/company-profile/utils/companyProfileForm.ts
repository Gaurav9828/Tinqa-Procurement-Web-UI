import type { CompanyProfileFields, CompanyProfileVersion, TrademarkMark } from '../types/companyProfile.types';

/**
 * Editor state: every field as a string ('' = empty). Error keys use the backend's field paths
 * ("address.postalCode", "invoiceTerms[2]") so server and client errors land on the same inputs.
 */
export interface CompanyProfileForm {
  brandName: string;
  trademarkMark: TrademarkMark;
  logoUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  legalName: string;
  gstin: string;
  pan: string;
  cin: string;
  headquartersName: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    stateCode: string;
    postalCode: string;
    country: string;
  };
  supportEmail: string;
  supportPhone: string;
  careersEmail: string;
  website: string;
  invoiceTerms: string[];
}

export type FormErrors = Record<string, string>;

export const LIMITS = {
  brandName: 40,
  legalName: 200,
  headquartersName: 100,
  addressLine: 200,
  place: 100,
  invoiceTerms: 10,
  invoiceTerm: 300,
  rejectComment: { min: 3, max: 500 },
} as const;

export const DEFAULT_COUNTRY = 'India';

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const CIN_PATTERN = /^[A-Z0-9]{21}$/;
const STATE_CODE_PATTERN = /^[0-9]{2}$/;
const INDIA_POSTAL_PATTERN = /^[0-9]{6}$/;
const OTHER_POSTAL_PATTERN = /^[A-Za-z0-9 -]{3,10}$/;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const PHONE_PATTERN = /^[0-9 +-]{7,20}$/;
const UNSAFE_TEXT = /[<>]/;

const str = (value: string | null | undefined) => value ?? '';
const isTrademark = (value: unknown): value is TrademarkMark => value === '' || value === 'TM' || value === 'R' || value === 'SM';

export const emptyForm = (): CompanyProfileForm => ({
  brandName: '',
  trademarkMark: '',
  logoUrl: '',
  logoDarkUrl: '',
  faviconUrl: '',
  legalName: '',
  gstin: '',
  pan: '',
  cin: '',
  headquartersName: '',
  address: { line1: '', line2: '', city: '', state: '', stateCode: '', postalCode: '', country: DEFAULT_COUNTRY },
  supportEmail: '',
  supportPhone: '',
  careersEmail: '',
  website: '',
  invoiceTerms: [],
});

export const toForm = (v: CompanyProfileFields): CompanyProfileForm => ({
  brandName: str(v.brandName),
  trademarkMark: isTrademark(v.trademarkMark) ? v.trademarkMark : '',
  logoUrl: str(v.logoUrl),
  logoDarkUrl: str(v.logoDarkUrl),
  faviconUrl: str(v.faviconUrl),
  legalName: str(v.legalName),
  gstin: str(v.gstin),
  pan: str(v.pan),
  cin: str(v.cin),
  headquartersName: str(v.headquartersName),
  address: {
    line1: str(v.address?.line1),
    line2: str(v.address?.line2),
    city: str(v.address?.city),
    state: str(v.address?.state),
    stateCode: str(v.address?.stateCode),
    postalCode: str(v.address?.postalCode),
    // A saved profile without a country keeps it empty; only brand-new forms default to India.
    country: str(v.address?.country),
  },
  supportEmail: str(v.supportEmail),
  supportPhone: str(v.supportPhone),
  careersEmail: str(v.careersEmail),
  website: str(v.website),
  invoiceTerms: [...(v.invoiceTerms ?? [])],
});

const orNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

/** First two GSTIN digits, when they look like a state code. */
export const stateCodeFromGstin = (gstin: string): string | null => {
  const prefix = gstin.trim().slice(0, 2);
  return STATE_CODE_PATTERN.test(prefix) ? prefix : null;
};

/** The full request body: every field, trimmed, blanks as null, IDs upper-cased (PUT replaces everything). */
export const toBody = (form: CompanyProfileForm): CompanyProfileFields => {
  const gstin = orNull(form.gstin.toUpperCase());
  return {
    brandName: orNull(form.brandName),
    trademarkMark: form.trademarkMark,
    logoUrl: orNull(form.logoUrl),
    logoDarkUrl: orNull(form.logoDarkUrl),
    faviconUrl: orNull(form.faviconUrl),
    legalName: orNull(form.legalName),
    gstin,
    pan: orNull(form.pan.toUpperCase()),
    cin: orNull(form.cin.toUpperCase()),
    headquartersName: orNull(form.headquartersName),
    address: {
      line1: orNull(form.address.line1),
      line2: orNull(form.address.line2),
      city: orNull(form.address.city),
      state: orNull(form.address.state),
      stateCode: orNull(form.address.stateCode) ?? (gstin ? stateCodeFromGstin(gstin) : null),
      postalCode: orNull(form.address.postalCode),
      country: orNull(form.address.country),
    },
    supportEmail: orNull(form.supportEmail),
    supportPhone: orNull(form.supportPhone),
    careersEmail: orNull(form.careersEmail),
    website: orNull(form.website),
    invoiceTerms: form.invoiceTerms.map((term) => term.trim()),
  };
};

/** Copies a version's field values (e.g. to start a new draft from an old version). */
export const fieldsOf = (v: CompanyProfileVersion): CompanyProfileFields => toBody(toForm(v));

export const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** PAN vs GSTIN characters 3-12; null when either is incomplete or they match. */
export const panMismatch = (gstin: string, pan: string): string | null => {
  const g = gstin.trim().toUpperCase();
  const p = pan.trim().toUpperCase();
  if (!GSTIN_PATTERN.test(g) || !PAN_PATTERN.test(p)) return null;
  return g.slice(2, 12) === p ? null : `PAN must match characters 3–12 of the GSTIN (${g.slice(2, 12)}).`;
};

/** State code vs the GSTIN's first two digits; null when it matches or can't be checked. */
export const stateCodeMismatch = (gstin: string, stateCode: string): string | null => {
  const expected = stateCodeFromGstin(gstin.toUpperCase());
  const code = stateCode.trim();
  if (!expected || !code || !GSTIN_PATTERN.test(gstin.trim().toUpperCase())) return null;
  return code === expected ? null : `State code must be ${expected} to match the GSTIN.`;
};

interface SaveRuleOptions {
  /** Image URLs that came from the upload endpoint or the loaded version (accepted even if not https). */
  knownImageUrls?: ReadonlySet<string>;
}

const checkText = (errors: FormErrors, key: string, value: string, label: string, max: number) => {
  const v = value.trim();
  if (!v) return;
  if (v.length > max) errors[key] = `${label} can't be longer than ${max} characters.`;
  else if (UNSAFE_TEXT.test(v)) errors[key] = `${label} can't contain < or >.`;
};

/** Rules applied on every save (drafts may still be incomplete). Mirrors the backend. */
export const validateForSave = (form: CompanyProfileForm, { knownImageUrls }: SaveRuleOptions = {}): FormErrors => {
  const errors: FormErrors = {};

  const brand = form.brandName.trim();
  if (!brand) errors.brandName = 'Brand name is required.';
  else checkText(errors, 'brandName', brand, 'Brand name', LIMITS.brandName);

  if (!isTrademark(form.trademarkMark)) errors.trademarkMark = 'Choose None, TM, R or SM.';

  for (const [key, label] of [
    ['logoUrl', 'Logo'],
    ['logoDarkUrl', 'Dark-mode logo'],
    ['faviconUrl', 'Favicon'],
  ] as const) {
    const url = form[key].trim();
    if (url && !isHttpsUrl(url) && !knownImageUrls?.has(url)) errors[key] = `${label} must be an https URL or an uploaded image.`;
  }
  const website = form.website.trim();
  if (website && !isHttpsUrl(website)) errors.website = 'Website must start with https://.';

  checkText(errors, 'legalName', form.legalName, 'Legal name', LIMITS.legalName);
  checkText(errors, 'headquartersName', form.headquartersName, 'Headquarters name', LIMITS.headquartersName);

  const gstin = form.gstin.trim().toUpperCase();
  const pan = form.pan.trim().toUpperCase();
  const cin = form.cin.trim().toUpperCase();
  if (gstin && !GSTIN_PATTERN.test(gstin)) errors.gstin = 'Enter a valid 15-character GSTIN (e.g. 27AAACT1234A1Z5).';
  if (pan && !PAN_PATTERN.test(pan)) errors.pan = 'Enter a valid PAN (5 letters, 4 digits, 1 letter).';
  else {
    const mismatch = panMismatch(gstin, pan);
    if (mismatch) errors.pan = mismatch;
  }
  if (cin && !CIN_PATTERN.test(cin)) errors.cin = 'CIN must be 21 letters or digits.';

  const a = form.address;
  checkText(errors, 'address.line1', a.line1, 'Address line 1', LIMITS.addressLine);
  checkText(errors, 'address.line2', a.line2, 'Address line 2', LIMITS.addressLine);
  checkText(errors, 'address.city', a.city, 'City', LIMITS.place);
  checkText(errors, 'address.state', a.state, 'State', LIMITS.place);
  checkText(errors, 'address.country', a.country, 'Country', LIMITS.place);
  if (gstin && !a.state.trim()) errors['address.state'] = 'State is required when a GSTIN is set.';

  const stateCode = a.stateCode.trim();
  if (stateCode && !STATE_CODE_PATTERN.test(stateCode)) errors['address.stateCode'] = 'State code must be 2 digits.';
  else {
    const mismatch = stateCodeMismatch(gstin, stateCode);
    if (mismatch) errors['address.stateCode'] = mismatch;
  }

  const postal = a.postalCode.trim();
  const country = a.country.trim().toLowerCase();
  if (postal) {
    if (!country || country === 'india') {
      if (!INDIA_POSTAL_PATTERN.test(postal)) errors['address.postalCode'] = 'Postal code must be 6 digits.';
    } else if (!OTHER_POSTAL_PATTERN.test(postal)) {
      errors['address.postalCode'] = 'Postal code must be 3–10 letters, digits, spaces or hyphens.';
    }
  }

  for (const [key, label] of [
    ['supportEmail', 'Support email'],
    ['careersEmail', 'Careers email'],
  ] as const) {
    const email = form[key].trim();
    if (email && !EMAIL_PATTERN.test(email)) errors[key] = `${label} must be a valid email address.`;
  }
  const phone = form.supportPhone.trim();
  if (phone && !PHONE_PATTERN.test(phone)) errors.supportPhone = 'Phone must be 7–20 digits, spaces, + or -.';

  if (form.invoiceTerms.length > LIMITS.invoiceTerms) errors.invoiceTerms = `At most ${LIMITS.invoiceTerms} invoice terms.`;
  form.invoiceTerms.forEach((term, i) => {
    const t = term.trim();
    const key = `invoiceTerms[${i}]`;
    if (!t) errors[key] = `Term ${i + 1} is empty — fill it in or remove it.`;
    else checkText(errors, key, t, `Term ${i + 1}`, LIMITS.invoiceTerm);
  });

  return errors;
};

/** Fields required only when submitting (and approving). */
export const SUBMIT_REQUIRED: { key: string; label: string; get: (f: CompanyProfileForm) => string }[] = [
  { key: 'legalName', label: 'Legal name', get: (f) => f.legalName },
  { key: 'address.line1', label: 'Address line 1', get: (f) => f.address.line1 },
  { key: 'address.city', label: 'City', get: (f) => f.address.city },
  { key: 'address.state', label: 'State', get: (f) => f.address.state },
  { key: 'address.postalCode', label: 'Postal code', get: (f) => f.address.postalCode },
];

export const missingForSubmit = (form: CompanyProfileForm) => SUBMIT_REQUIRED.filter((field) => !field.get(form).trim());

export const validateForSubmit = (form: CompanyProfileForm, options?: SaveRuleOptions): FormErrors => {
  const errors = validateForSave(form, options);
  for (const field of missingForSubmit(form)) errors[field.key] ??= `${field.label} is required to submit.`;
  return errors;
};

export const sameForm = (a: CompanyProfileForm, b: CompanyProfileForm) => JSON.stringify(a) === JSON.stringify(b);
