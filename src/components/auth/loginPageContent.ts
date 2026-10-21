import axios from 'axios';
import { ECOMMERCE_API_BASE_URL } from '../../api/ecommerceAxiosClient';

/** What the image half of the sign-in page shows. */
export interface LoginPageContent {
  /** Full-bleed background; null = the built-in gradient. */
  imageUrl: string | null;
  headline: string;
  tagline: string;
  highlights: string[];
}

/** Shown until the live company profile answers, and when the backend predates these fields. */
export const DEFAULT_ADMIN_LOGIN: LoginPageContent = {
  imageUrl: null,
  headline: 'Procurement, sales & delivery — one workspace.',
  tagline: '',
  highlights: [
    'Quotes, purchase orders & GST invoices in one place',
    'Live order tracking from dispatch to door-step',
    'Role-based access with maker-checker approvals',
  ],
};

type RawProfile = Record<string, unknown>;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * The admin sign-in content from the public company profile. A field the backend doesn't send keeps the default;
 * one it sends as null / empty was cleared by an admin, so that part is left out.
 */
export const toAdminLoginContent = (raw: RawProfile | null | undefined, base: LoginPageContent = DEFAULT_ADMIN_LOGIN): LoginPageContent => {
  if (!raw || typeof raw !== 'object') return base;
  const has = (key: string) => key in raw;
  const highlights = raw.adminLoginHighlights;
  return {
    imageUrl: text(raw.loginImageUrl) || null,
    headline: has('adminLoginHeadline') ? text(raw.adminLoginHeadline) : base.headline,
    tagline: has('adminLoginTagline') ? text(raw.adminLoginTagline) : base.tagline,
    highlights: !has('adminLoginHighlights')
      ? base.highlights
      : Array.isArray(highlights)
        ? highlights.map(text).filter(Boolean)
        : [],
  };
};

const CACHE_KEY = 'tinqa.loginPage';

const readCache = (): LoginPageContent | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? (JSON.parse(cached) as LoginPageContent) : null;
  } catch {
    return null;
  }
};

let current: LoginPageContent | null = null;
let request: Promise<LoginPageContent> | null = null;

/** Last known content, so the page paints right away (before the network answers). */
export const cachedAdminLoginContent = (): LoginPageContent => current ?? readCache() ?? DEFAULT_ADMIN_LOGIN;

/**
 * GET {ecommerce}/company/profile (public, no auth) once per page load; every caller shares the request. A plain axios
 * call, not the signed-in client: a stale session must not redirect away from the sign-in pages. Failure keeps the
 * cached / default content and never blocks signing in.
 */
export const loadAdminLoginContent = (): Promise<LoginPageContent> => {
  if (current) return Promise.resolve(current);
  request ??= axios
    .get<{ data?: RawProfile }>(`${ECOMMERCE_API_BASE_URL}/company/profile`, { timeout: 10000 })
    .then((response) => {
      current = toAdminLoginContent(response.data?.data);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(current));
      } catch {
        // Storage full or blocked: the content just isn't remembered for the next visit.
      }
      return current;
    })
    .catch(() => cachedAdminLoginContent())
    .finally(() => {
      request = null;
    });
  return request;
};

/** Tests: forget the loaded content. */
export const resetAdminLoginContent = () => {
  current = null;
  request = null;
};
