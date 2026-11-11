import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { useGatedLoad } from '../../../hooks/useGatedLoad';
import { warrantyClaimsApi } from '../api/warrantyClaimsApi';
import { ClaimStatusBadge } from '../components/ClaimStatusBadge';
import { CLAIM_STATUS_LABEL, type WarrantyClaimStatus } from '../types/warrantyClaim.types';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';

export const WARRANTY_CLAIMS_PAGE_SIZE = 20;
const FILTERS: (WarrantyClaimStatus | null)[] = [null, 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED'];

export const warrantyClaimPath = (referenceNumber: string) => `/warranty-claims/${encodeURIComponent(referenceNumber)}`;

/**
 * Warranty claims customers filed from "My devices" on the storefront (WARRANTY_CLAIM_VIEW). Customer care reviews new
 * ones, an approver decides those waiting, and approved ones are marked resolved once repaired or replaced.
 */
export const WarrantyClaimsPage: React.FC = () => {
  const { can } = useAccess();
  const [status, setStatus] = useState<WarrantyClaimStatus | null>('SUBMITTED');
  const [page, setPage] = useState(0);
  const load = useCallback(() => warrantyClaimsApi.list(status, page, WARRANTY_CLAIMS_PAGE_SIZE), [status, page]);
  const { data, isLoading, refresh } = useGatedLoad(load, can('WARRANTY_CLAIM_VIEW'), "Couldn't load the warranty claims.");
  const rows = data?.content ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-4 text-xs">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-black dark:text-white">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> Warranty claims
          </h1>
          <p className="text-gray-500 mt-1">
            Filed by customers for a device still under warranty. Review new claims with a diagnosis; someone else decides them.
          </p>
        </div>
        <button type="button" onClick={refresh} aria-label="Refresh warranty claims" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option ?? 'ALL'}
            type="button"
            aria-pressed={status === option}
            onClick={() => {
              setStatus(option);
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold cursor-pointer ${
              status === option ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-black/5'
            }`}
          >
            {option ? CLAIM_STATUS_LABEL[option] : 'All'}
          </button>
        ))}
      </div>

      <div className="apple-card overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="p-3 font-semibold">Claim</th>
              <th className="p-3 font-semibold">Product · serial</th>
              <th className="p-3 font-semibold">Customer</th>
              <th className="p-3 font-semibold">Filed</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300">
            {rows.map((row) => (
              <tr key={row.referenceNumber}>
                <td className="p-3">
                  <Link to={warrantyClaimPath(row.referenceNumber)} className="font-mono font-semibold text-[#0071e3] dark:text-blue-400 hover:underline">
                    {row.referenceNumber}
                  </Link>
                </td>
                <td className="p-3">
                  {row.productTitle} · <span className="font-mono">{row.serial}</span>
                </td>
                <td className="p-3">{row.customerName || row.customerEmail || '—'}</td>
                <td className="p-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                <td className="p-3">
                  <ClaimStatusBadge status={row.status} resolution={row.resolution} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <p role="status" className="p-4 flex items-center gap-1.5 text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </p>
        )}
        {!isLoading && rows.length === 0 && <p className="p-4 text-gray-400 italic">No claims here.</p>}
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-end gap-2">
          <button type="button" disabled={data.first} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" className="p-1.5 rounded-lg border border-black/10 disabled:opacity-40 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-gray-500">
            Page {data.number + 1} of {data.totalPages}
          </span>
          <button type="button" disabled={data.last} onClick={() => setPage((p) => p + 1)} aria-label="Next page" className="p-1.5 rounded-lg border border-black/10 disabled:opacity-40 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
};
