import React, { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { useGatedLoad } from '../../../hooks/useGatedLoad';
import { warrantyClaimsApi } from '../api/warrantyClaimsApi';
import { ClaimActions } from '../components/ClaimActions';
import { ClaimStatusBadge } from '../components/ClaimStatusBadge';
import { formatDate, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { orderDetailPath } from '../../order-tracking/utils/orderTrackingRoutes';
import type { CoverageStatus } from '../types/warrantyClaim.types';

const COVERAGE: Record<CoverageStatus, string> = {
  NOT_STARTED: 'Starts on delivery',
  ACTIVE: 'Covered',
  EXPIRED: 'Expired',
  NO_WARRANTY: 'No warranty',
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="mt-1 text-black dark:text-white break-words">{children}</dd>
  </div>
);

const Step: React.FC<{ title: string; who: string | null; when: string | null; text: string | null }> = ({ title, who, when, text }) =>
  who ? (
    <li className="space-y-1">
      <p className="font-semibold text-black dark:text-white">
        {title} <span className="font-normal text-gray-500">· {who} · {formatDateTime(when)}</span>
      </p>
      {text && <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">{text}</p>}
    </li>
  ) : null;

/** /warranty-claims/:referenceNumber — the claim, its unit's coverage, every step so far and the next step. */
export const WarrantyClaimDetailPage: React.FC = () => {
  const { referenceNumber = '' } = useParams<{ referenceNumber: string }>();
  const { can } = useAccess();
  const load = useCallback(() => warrantyClaimsApi.detail(referenceNumber), [referenceNumber]);
  const { data: claim, isLoading, refresh } = useGatedLoad(load, can('WARRANTY_CLAIM_VIEW') && !!referenceNumber, "Couldn't load the claim.");

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-xs">
      <Link to="/warranty-claims" className="inline-flex items-center gap-1 text-[#0071e3] dark:text-blue-400 hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Warranty claims
      </Link>
      {isLoading && !claim && (
        <p role="status" className="flex items-center gap-1.5 text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </p>
      )}
      {claim && (
        <>
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold text-black dark:text-white font-mono">{claim.referenceNumber}</h1>
            <ClaimStatusBadge status={claim.status} resolution={claim.resolution} />
          </header>
          <section aria-label="Claim" className="apple-card p-5 space-y-4">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Product">{claim.productTitle}</Field>
              <Field label="Serial">
                <span className="font-mono">{claim.serial}</span>
              </Field>
              <Field label="Order">
                <Link to={orderDetailPath(claim.orderNumber)} state={{ backLabel: 'Back to the claim' }} className="font-mono text-[#0071e3] dark:text-blue-400 hover:underline">
                  #{claim.orderNumber}
                </Link>
              </Field>
              <Field label="Customer">{[claim.customerName, claim.customerEmail].filter(Boolean).join(' · ') || '—'}</Field>
              <Field label="Warranty">{claim.warrantyTitle ?? 'None'}</Field>
              <Field label="Coverage">
                {COVERAGE[claim.coverageStatus]}
                {claim.coverageEndsOn ? ` · ${formatDate(claim.coverageStartsOn)} – ${formatDate(claim.coverageEndsOn)}` : ''}
              </Field>
            </dl>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">The customer&rsquo;s words · {formatDateTime(claim.createdAt)}</p>
              <p className="mt-1 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] whitespace-pre-line text-black dark:text-white">{claim.description}</p>
            </div>
            <ol className="space-y-3">
              <Step title="Reviewed" who={claim.reviewedBy} when={claim.reviewedAt} text={claim.diagnosis} />
              <Step title="Decided" who={claim.decidedBy} when={claim.decidedAt} text={claim.decisionNote} />
              <Step title="Resolved" who={claim.resolvedBy} when={claim.resolvedAt} text={claim.resolutionNote} />
            </ol>
          </section>
          <section aria-label="Next step" className="apple-card p-5 empty:hidden">
            <ClaimActions claim={claim} onChanged={refresh} />
          </section>
        </>
      )}
    </div>
  );
};
