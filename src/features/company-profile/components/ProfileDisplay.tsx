import React from 'react';
import { ExternalLink, ImageOff } from 'lucide-react';
import type { CompanyProfileFields, ProfileSection, ShippingRule, TrademarkMark, VersionStatus } from '../types/companyProfile.types';
import { STATUS_LABELS, TRADEMARK_SYMBOLS, onOff, rupees, shippingRuleRange } from '../utils/companyProfile.utils';
import { isHttpsUrl, toYouTubeVideoId } from '../utils/companyProfileForm';
import { PROFILE_SECTIONS, SECTIONS, sectionLabel } from '../utils/companyProfileSections';

const STATUS_TONES: Record<VersionStatus, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  SUPERSEDED: 'bg-transparent text-gray-400 dark:text-neutral-500 border-black/10 dark:border-white/10',
  WITHDRAWN: 'bg-transparent text-gray-400 dark:text-neutral-500 border-black/10 dark:border-white/10',
  DELETED: 'bg-transparent text-gray-400 dark:text-neutral-500 border-black/10 dark:border-white/10 line-through',
};

export const VersionStatusBadge: React.FC<{ status: VersionStatus; live?: boolean }> = ({ status, live }) => (
  <span
    data-testid="version-status"
    className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold rounded-full border whitespace-nowrap ${
      STATUS_TONES[status] ?? STATUS_TONES.DRAFT
    }`}
  >
    {live && status === 'APPROVED' ? 'Live' : (STATUS_LABELS[status] ?? status)}
  </span>
);

/** Which part of the profile a version changes: "Brand", or "Whole profile". */
export const SectionBadge: React.FC<{ section: ProfileSection | null | undefined }> = ({ section }) => (
  <span
    data-testid="version-section"
    className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold rounded-full border whitespace-nowrap bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/20"
  >
    {sectionLabel(section)}
  </span>
);

/** Brand name with its trademark mark (TM → ™, R → ®, SM → ℠). Plain text only. */
export const BrandName: React.FC<{ name: string | null; mark: TrademarkMark | null; className?: string }> = ({ name, mark, className }) => (
  <span className={className}>
    {name || <span className="italic text-gray-400">No brand name</span>}
    {name && mark && TRADEMARK_SYMBOLS[mark] && <sup className="ml-0.5 text-[0.6em]">{TRADEMARK_SYMBOLS[mark]}</sup>}
  </span>
);

export type ImageVariant = 'logo' | 'logoDark' | 'favicon' | 'loginImage';

// Checkerboard so transparent areas are visible; the dark logo is shown on a dark background.
const CHECKERBOARD: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgba(0,0,0,.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.08) 75%)',
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
  backgroundColor: '#fff',
};

const FRAMES: Record<ImageVariant, { frame: string; img: string }> = {
  logo: { frame: 'w-[216px] h-[76px]', img: 'max-w-[200px] max-h-[60px] object-contain' },
  logoDark: { frame: 'w-[216px] h-[76px]', img: 'max-w-[200px] max-h-[60px] object-contain' },
  favicon: { frame: 'w-12 h-12', img: 'w-8 h-8 object-contain' },
  // A photo: cropped to fill, like the sign-in page does
  loginImage: { frame: 'w-[120px] h-[150px]', img: 'w-full h-full object-cover' },
};

/** Constrained preview: logos up to 200×60, favicon 32×32, the sign-in image as a cropped portrait thumbnail. */
export const ProfileImage: React.FC<{ url: string | null | undefined; alt: string; variant: ImageVariant }> = ({ url, alt, variant }) => {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const { frame, img } = FRAMES[variant];
  return (
    <div
      className={`${frame} shrink-0 rounded-lg border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden`}
      style={variant === 'logoDark' ? { backgroundColor: '#1d1d1f' } : CHECKERBOARD}
    >
      {url && failedUrl !== url ? (
        <img src={url} alt={alt} className={img} onError={() => setFailedUrl(url)} />
      ) : (
        <span className="flex flex-col items-center text-[10px] text-gray-400" role="img" aria-label={`${alt}: ${url ? 'could not be loaded' : 'none'}`}>
          <ImageOff className="w-4 h-4" />
          {variant !== 'favicon' && (url ? 'Not loadable' : 'None')}
        </span>
      )}
    </div>
  );
};

/**
 * Thumbnail + "Watch on YouTube" for a valid YouTube link; nothing otherwise. A thumbnail (not an
 * embedded player) keeps the console free of YouTube frames.
 */
export const YouTubePreview: React.FC<{ url: string | null | undefined }> = ({ url }) => {
  const id = toYouTubeVideoId(url);
  const [failedId, setFailedId] = React.useState<string | null>(null);
  if (!id) return null;
  return (
    <div className="space-y-1.5 w-full max-w-xs" data-testid="video-preview">
      {failedId === id ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">Couldn't load a preview; check that the video is public and embeddable.</p>
      ) : (
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt="Video preview"
          className="w-full aspect-video object-cover rounded-lg border border-black/10 dark:border-white/10 bg-black/5"
          onError={() => setFailedId(id)}
          // Unknown videos come back as YouTube's 120×90 placeholder rather than an error.
          onLoad={(e) => e.currentTarget.naturalWidth > 0 && e.currentTarget.naturalWidth <= 120 && setFailedId(id)}
        />
      )}
      <a
        href={`https://www.youtube.com/watch?v=${id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0071e3] hover:underline"
      >
        Watch on YouTube <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
};

/** A link as plain text, clickable only when it's an https URL. */
export const UrlLink: React.FC<{ url: string | null | undefined }> = ({ url }) => {
  if (!url || !url.trim()) return <>—</>;
  return isHttpsUrl(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#0071e3] hover:underline break-all">
      {url}
    </a>
  ) : (
    <span className="break-all">{url}</span>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="mt-0.5 text-black dark:text-white break-words whitespace-pre-line">{children}</dd>
  </div>
);

const orDash = (value: string | null | undefined) => (value && value.trim() ? value : '—');

/** Rules from the API, or from a change row (amounts there are strings such as "500.00"). */
export const ShippingRulesList: React.FC<{ rules: unknown; label?: string }> = ({ rules, label = 'Shipping charges' }) => {
  const list = Array.isArray(rules) ? (rules as Record<keyof ShippingRule, unknown>[]) : [];
  if (list.length === 0) return <span className="text-gray-400">No rules: every order ships free</span>;
  return (
    <table aria-label={label} className="text-xs border-collapse">
      <thead>
        <tr className="text-gray-400 text-left">
          <th className="pr-4 pb-1 font-semibold">Order value</th>
          <th className="pb-1 font-semibold text-right">Shipping</th>
        </tr>
      </thead>
      <tbody>
        {list.map((rule, i) => {
          const max = rule.maxOrderValue == null ? null : Number(rule.maxOrderValue);
          const fee = Number(rule.fee);
          return (
            <tr key={i}>
              <td className="pr-4 py-0.5">{shippingRuleRange(Number(rule.minOrderValue), max)}</td>
              <td className="py-0.5 text-right font-mono">{fee === 0 ? 'Free' : rupees(fee)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export const InvoiceTermsList: React.FC<{ terms: string[] | null | undefined; label?: string }> = ({ terms, label = 'Invoice terms' }) =>
  terms && terms.length ? (
    <ol aria-label={label} className="list-decimal pl-5 space-y-0.5">
      {terms.map((term, i) => (
        <li key={i} className="break-words">
          {term}
        </li>
      ))}
    </ol>
  ) : (
    <span className="text-gray-400">None</span>
  );

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">{children}</span>
);

/** One section of a profile, read-only. Every value is rendered as text, never HTML. */
export const SectionDetails: React.FC<{ section: ProfileSection; profile: CompanyProfileFields }> = ({ section, profile: p }) => {
  switch (section) {
    case 'BRAND':
      return (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Brand name">
              <BrandName name={p.brandName} mark={p.trademarkMark} className="font-semibold" />
            </Field>
          </dl>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Logo</Label>
              <ProfileImage url={p.logoUrl} alt="Company logo" variant="logo" />
            </div>
            <div>
              <Label>Dark-mode logo</Label>
              <ProfileImage url={p.logoDarkUrl} alt="Dark-mode company logo" variant="logoDark" />
            </div>
            <div>
              <Label>Favicon</Label>
              <ProfileImage url={p.faviconUrl} alt="Favicon" variant="favicon" />
            </div>
          </div>
        </div>
      );
    case 'LEGAL_ADDRESS': {
      const a = p.address;
      const addressLines = [a?.line1, a?.line2, [a?.city, a?.district && a.district !== a.city ? a.district : null, a?.state].filter(Boolean).join(', '), [a?.postalCode, a?.country].filter(Boolean).join(' ')]
        .filter((line) => line && line.trim())
        .join('\n');
      return (
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Legal name">{orDash(p.legalName)}</Field>
          <Field label="GSTIN">{orDash(p.gstin)}</Field>
          <Field label="PAN">{orDash(p.pan)}</Field>
          <Field label="CIN">{orDash(p.cin)}</Field>
          <Field label="Headquarters">{orDash(p.headquartersName)}</Field>
          <Field label="Address">{orDash(addressLines)}</Field>
          <Field label="State code">{orDash(a?.stateCode)}</Field>
        </dl>
      );
    }
    case 'CONTACT':
      return (
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Support email">{orDash(p.supportEmail)}</Field>
          <Field label="Support phone">{orDash(p.supportPhone)}</Field>
          <Field label="Careers email">{orDash(p.careersEmail)}</Field>
          <Field label="Website">{orDash(p.website)}</Field>
        </dl>
      );
    case 'HOME_VIDEO':
      return (
        <dl role="group" aria-label="Home page video" className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
          <Field label="Status">{onOff(p.homeVideoEnabled)}</Field>
          <Field label="YouTube link">
            <UrlLink url={p.homeVideoUrl} />
            <div className="mt-2 whitespace-normal">
              <YouTubePreview url={p.homeVideoUrl} />
            </div>
          </Field>
        </dl>
      );
    case 'SIGN_IN':
      return (
        <div role="group" aria-label="Sign-in pages" className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-4">
          <div className="space-y-1">
            <span className="block text-[10px] text-gray-400">Image (both)</span>
            <ProfileImage url={p.loginImageUrl} alt="Sign-in image" variant="loginImage" />
          </div>
          <LoginTextDetails title="Admin portal" headline={p.adminLoginHeadline} tagline={p.adminLoginTagline} highlights={p.adminLoginHighlights} />
          <LoginTextDetails title="Storefront" headline={p.storeLoginHeadline} tagline={p.storeLoginTagline} highlights={p.storeLoginHighlights} />
        </div>
      );
    case 'SHIPPING':
      return (
        <div className="text-black dark:text-white">
          <ShippingRulesList rules={p.shippingRules} />
        </div>
      );
    case 'INVOICE_TERMS':
      return (
        <div className="text-black dark:text-white">
          <InvoiceTermsList terms={p.invoiceTerms} />
        </div>
      );
  }
};

/** The whole profile, section by section (a whole-profile version). */
export const ProfileDetails: React.FC<{ profile: CompanyProfileFields }> = ({ profile }) => (
  <div className="space-y-6 text-xs">
    {PROFILE_SECTIONS.map((section) => (
      <div key={section} role="group" aria-label={`${SECTIONS[section].label} details`} className="space-y-2">
        <h3 className="text-[11px] font-bold text-black dark:text-white">{SECTIONS[section].label}</h3>
        <SectionDetails section={section} profile={profile} />
      </div>
    ))}
  </div>
);

/** Highlight points from the API or a change row. */
export const LoginHighlightsList: React.FC<{ points: unknown; label?: string }> = ({ points, label = 'Highlight points' }) => {
  const list = Array.isArray(points) ? points.filter((p): p is string => typeof p === 'string' && !!p.trim()) : [];
  return list.length ? (
    <ul aria-label={label} className="list-disc pl-5 space-y-0.5">
      {list.map((point, i) => (
        <li key={i} className="break-words">
          {point}
        </li>
      ))}
    </ul>
  ) : (
    <span className="text-gray-400">None</span>
  );
};

const LoginTextDetails: React.FC<{ title: string; headline: string | null; tagline: string | null; highlights: string[] | null }> = ({
  title,
  headline,
  tagline,
  highlights,
}) => (
  <dl className="space-y-2 min-w-0" aria-label={`${title} sign-in text`}>
    <span className="block text-[10px] text-gray-400">{title}</span>
    <Field label="Headline">{orDash(headline)}</Field>
    <Field label="Tagline">{orDash(tagline)}</Field>
    <Field label="Points">
      <LoginHighlightsList points={highlights} label={`${title} sign-in points`} />
    </Field>
  </dl>
);
