/**
 * Indian PIN code → city / district / state, from the India Post public API
 * (https://api.postalpincode.in). Called with plain fetch, never the app's API client, so the
 * admin's token is not sent to a third party.
 */

const PINCODE_API = 'https://api.postalpincode.in/pincode';
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;
const LOOKUP_TIMEOUT_MS = 8000;

export interface PincodeLocation {
  /** India Post has no "city"; the district is the closest match. */
  city: string;
  district: string;
  state: string;
  country: 'India';
  /** Post office names under this PIN code, e.g. "Hinjawadi". */
  areas: string[];
}

export type PincodeLookupResult = { status: 'found'; location: PincodeLocation } | { status: 'notFound' };

interface IndiaPostOffice {
  Name?: string;
  District?: string;
  State?: string;
}

interface IndiaPostEntry {
  Status?: string;
  PostOffice?: IndiaPostOffice[] | null;
}

export const isIndianPincode = (value: string) => PINCODE_PATTERN.test(value.trim());

/** Only definite answers are cached; network failures are retried on the next call. */
const cache = new Map<string, PincodeLookupResult>();

export const clearPincodeCache = () => cache.clear();

/** Resolves found / notFound; throws when the service can't be reached or answers unexpectedly. */
export const lookupPincode = async (pincode: string, signal?: AbortSignal): Promise<PincodeLookupResult> => {
  const pin = pincode.trim();
  if (!isIndianPincode(pin)) return { status: 'notFound' };
  const cached = cache.get(pin);
  if (cached) return cached;

  // Give up after a few seconds so a slow service falls back to manual entry instead of hanging.
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, LOOKUP_TIMEOUT_MS);
  signal?.addEventListener('abort', abort);
  let body: unknown;
  try {
    const response = await fetch(`${PINCODE_API}/${pin}`, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`PIN code service answered ${response.status}`);
    body = await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
  const entry = Array.isArray(body) ? (body[0] as IndiaPostEntry | undefined) : undefined;
  if (!entry || typeof entry.Status !== 'string') throw new Error('Unexpected PIN code service response');

  const offices = (entry.PostOffice ?? []).filter((o) => o.District?.trim() && o.State?.trim());
  const result: PincodeLookupResult =
    entry.Status === 'Success' && offices.length
      ? {
          status: 'found',
          location: {
            city: offices[0].District!.trim(),
            district: offices[0].District!.trim(),
            state: offices[0].State!.trim(),
            country: 'India',
            areas: [...new Set(offices.map((o) => o.Name?.trim()).filter((n): n is string => !!n))],
          },
        }
      : { status: 'notFound' };
  cache.set(pin, result);
  return result;
};

export interface AddressPlace {
  city: string;
  district: string;
  state: string;
}

/**
 * Applies a looked-up location. For the PIN code a record was opened with, saved values are kept
 * and only blanks are filled (opening a form never rewrites it); a changed PIN code replaces all three.
 */
export const applyPincodeLocation = (current: AddressPlace, location: PincodeLocation, keepExisting: boolean): AddressPlace =>
  keepExisting
    ? { city: current.city || location.city, district: current.district || location.district, state: current.state || location.state }
    : { city: location.city, district: location.district, state: location.state };

export const PINCODE_MESSAGES = {
  idle: 'Filled automatically from the PIN code.',
  loading: 'Looking up PIN code…',
  found: 'Filled from the PIN code.',
  notFound: 'PIN code not found. Check the number.',
  error: "Couldn't reach the PIN code service. Enter city, district and state manually.",
} as const;
