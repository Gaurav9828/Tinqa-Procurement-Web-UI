import React from 'react';
import { ExternalLink, Mail, Phone, UserRound } from 'lucide-react';
import type { ApplicationDetail } from '../types/careers.types';
import { formatDateTime, formatRupees } from '../utils/careers';

/** Only https links the candidate gave are opened; anything else is shown as text. */
const SafeLink: React.FC<{ url: string | null; label: string }> = ({ url, label }) => {
  if (!url) return null;
  if (!/^https:\/\//i.test(url)) return <span className="break-all">{label}: {url}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0071e3] font-semibold hover:underline break-all">
      {label} <ExternalLink className="w-3 h-3" />
    </a>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-3 py-1.5 border-b border-black/5 dark:border-white/5 last:border-0">
    <dt className="text-gray-500">{label}</dt>
    <dd className="text-right font-medium text-gray-800 dark:text-gray-200">{children}</dd>
  </div>
);

/** Who applied: contact, current job, pay expectations, links and the cover note. */
export const CandidateCard: React.FC<{ application: ApplicationDetail }> = ({ application: a }) => (
  <section aria-label="Candidate" className="apple-card p-5 space-y-3 text-xs">
    <h2 className="text-sm font-semibold flex items-center gap-2">
      <UserRound className="w-4 h-4 text-[#0071e3]" /> Candidate
    </h2>
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 text-[#0071e3] hover:underline"><Mail className="w-3.5 h-3.5" /> {a.email}</a>
      <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 text-[#0071e3] hover:underline"><Phone className="w-3.5 h-3.5" /> {a.phone}</a>
    </div>
    <dl>
      <Row label="Lives in">{a.currentLocation}</Row>
      <Row label="Experience">{a.totalExperienceYears === null ? '—' : `${a.totalExperienceYears} yrs`}</Row>
      <Row label="Now">{[a.currentTitle, a.currentCompany].filter(Boolean).join(' at ') || '—'}</Row>
      <Row label="Current CTC">{formatRupees(a.currentCtc)}</Row>
      <Row label="Expected CTC">{formatRupees(a.expectedCtc)}</Row>
      <Row label="Notice period">{a.noticePeriodDays === null ? '—' : `${a.noticePeriodDays} days`}</Row>
      <Row label="Heard about us">{a.source || '—'}</Row>
      <Row label="Talent pool">{a.talentPool ? 'Yes, opted in' : 'No'}</Row>
      <Row label="Consent given">{formatDateTime(a.consentAt)}</Row>
      <Row label="Email verified">{a.emailVerifiedAt ? `Yes, by code · ${formatDateTime(a.emailVerifiedAt)}` : '—'}</Row>
    </dl>
    {(a.linkedinUrl || a.portfolioUrl) && (
      <div className="flex flex-wrap gap-3">
        <SafeLink url={a.linkedinUrl} label="LinkedIn" />
        <SafeLink url={a.portfolioUrl} label="Portfolio" />
      </div>
    )}
    {a.coverLetter && (
      <div>
        <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">Cover note</p>
        <p className="whitespace-pre-line break-words text-gray-700 dark:text-gray-300">{a.coverLetter}</p>
      </div>
    )}
  </section>
);
