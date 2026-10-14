import React from 'react';
import { ImageOff } from 'lucide-react';
import type { CompanyProfileFields, TrademarkMark, VersionStatus } from '../types/companyProfile.types';
import { STATUS_LABELS, TRADEMARK_SYMBOLS } from '../utils/companyProfile.utils';

const STATUS_TONES: Record<VersionStatus, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  SUPERSEDED: 'bg-transparent text-gray-400 dark:text-neutral-500 border-black/10 dark:border-white/10',
  WITHDRAWN: 'bg-transparent text-gray-400 dark:text-neutral-500 border-black/10 dark:border-white/10',
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

/** Brand name with its trademark mark (TM → ™, R → ®, SM → ℠). Plain text only. */
export const BrandName: React.FC<{ name: string | null; mark: TrademarkMark | null; className?: string }> = ({ name, mark, className }) => (
  <span className={className}>
    {name || <span className="italic text-gray-400">No brand name</span>}
    {name && mark && TRADEMARK_SYMBOLS[mark] && <sup className="ml-0.5 text-[0.6em]">{TRADEMARK_SYMBOLS[mark]}</sup>}
  </span>
);

export type ImageVariant = 'logo' | 'logoDark' | 'favicon';

// Checkerboard so transparent areas are visible; the dark logo is shown on a dark background.
const CHECKERBOARD: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgba(0,0,0,.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.08) 75%)',
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
  backgroundColor: '#fff',
};

/** Constrained preview: logos up to 200×60, favicon 32×32. */
export const ProfileImage: React.FC<{ url: string | null | undefined; alt: string; variant: ImageVariant }> = ({ url, alt, variant }) => {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const frame = variant === 'favicon' ? 'w-12 h-12' : 'w-[216px] h-[76px]';
  const img = variant === 'favicon' ? 'w-8 h-8' : 'max-w-[200px] max-h-[60px]';
  return (
    <div
      className={`${frame} shrink-0 rounded-lg border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden`}
      style={variant === 'logoDark' ? { backgroundColor: '#1d1d1f' } : CHECKERBOARD}
    >
      {url && failedUrl !== url ? (
        <img src={url} alt={alt} className={`${img} object-contain`} onError={() => setFailedUrl(url)} />
      ) : (
        <span className="flex flex-col items-center text-[10px] text-gray-400" role="img" aria-label={`${alt}: ${url ? 'could not be loaded' : 'none'}`}>
          <ImageOff className="w-4 h-4" />
          {variant !== 'favicon' && (url ? 'Not loadable' : 'None')}
        </span>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="mt-0.5 text-black dark:text-white break-words whitespace-pre-line">{children}</dd>
  </div>
);

const orDash = (value: string | null | undefined) => (value && value.trim() ? value : '—');

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

/** Read-only profile (live card, proposed version). Every value is rendered as text, never HTML. */
export const ProfileDetails: React.FC<{ profile: CompanyProfileFields }> = ({ profile: p }) => {
  const a = p.address;
  const addressLines = [a?.line1, a?.line2, [a?.city, a?.state].filter(Boolean).join(', '), [a?.postalCode, a?.country].filter(Boolean).join(' ')]
    .filter((line) => line && line.trim())
    .join('\n');
  return (
    <div className="space-y-5 text-xs">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Logo</span>
          <ProfileImage url={p.logoUrl} alt="Company logo" variant="logo" />
        </div>
        <div className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Dark-mode logo</span>
          <ProfileImage url={p.logoDarkUrl} alt="Dark-mode company logo" variant="logoDark" />
        </div>
        <div className="space-y-1">
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Favicon</span>
          <ProfileImage url={p.faviconUrl} alt="Favicon" variant="favicon" />
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Brand name">
          <BrandName name={p.brandName} mark={p.trademarkMark} className="font-semibold" />
        </Field>
        <Field label="Legal name">{orDash(p.legalName)}</Field>
        <Field label="Headquarters">{orDash(p.headquartersName)}</Field>
        <Field label="GSTIN">{orDash(p.gstin)}</Field>
        <Field label="PAN">{orDash(p.pan)}</Field>
        <Field label="CIN">{orDash(p.cin)}</Field>
        <Field label="Address">{orDash(addressLines)}</Field>
        <Field label="State code">{orDash(a?.stateCode)}</Field>
        <Field label="Website">{orDash(p.website)}</Field>
        <Field label="Support email">{orDash(p.supportEmail)}</Field>
        <Field label="Support phone">{orDash(p.supportPhone)}</Field>
        <Field label="Careers email">{orDash(p.careersEmail)}</Field>
      </dl>

      <div>
        <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Invoice terms</span>
        <div className="text-black dark:text-white">
          <InvoiceTermsList terms={p.invoiceTerms} />
        </div>
      </div>
    </div>
  );
};
