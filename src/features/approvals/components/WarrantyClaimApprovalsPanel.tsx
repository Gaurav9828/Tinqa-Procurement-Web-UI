import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { warrantyClaimsApi } from '../../warranty-claims/api/warrantyClaimsApi';
import { warrantyClaimPath } from '../../warranty-claims/utils/warrantyClaimRoutes';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { useQueueList } from '../hooks/useQueueList';

/** Only a handful wait at a time; the backend caps a page at 50. */
export const WARRANTY_DECISIONS_PAGE_SIZE = 50;

const loadWaiting = async () => {
  const res = await warrantyClaimsApi.list('IN_REVIEW', 0, WARRANTY_DECISIONS_PAGE_SIZE);
  return { ...res, data: res.data?.content ?? [] };
};

/**
 * Approvals Hub › Warranty claims (WARRANTY_CLAIM_DECIDE): claims customer care has reviewed, waiting for someone else
 * to approve (repair or replace) or reject. Each opens on its own page, with the diagnosis and the customer's words.
 * Loads only while its tab is open.
 */
export const WarrantyClaimApprovalsPanel: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const { canAll } = useAccess();
  const allowed = enabled && canAll('WARRANTY_CLAIM_DECIDE', 'WARRANTY_CLAIM_VIEW');
  const { items, reload } = useQueueList(allowed, loadWaiting, "Couldn't load the warranty claims.");
  if (!allowed) return null;
  return (
    <section aria-label="Warranty claims awaiting a decision" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Warranty claims
          </h2>
          <p className="text-xs text-gray-500">Reviewed by customer care and waiting for a decision. You can&rsquo;t decide a claim you reviewed.</p>
        </div>
        <button type="button" onClick={reload} aria-label="Refresh warranty claims" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {items === null && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </p>
      )}
      {items?.length === 0 && <p className="text-xs text-gray-400 italic">Nothing waiting.</p>}
      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((claim) => (
            <li key={claim.referenceNumber} className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="min-w-0">
                <Link to={warrantyClaimPath(claim.referenceNumber)} className="font-mono font-semibold text-[#0071e3] dark:text-blue-400 hover:underline">
                  {claim.referenceNumber}
                </Link>
                <span className="text-gray-600 dark:text-gray-300">
                  {' '}
                  · {claim.productTitle} · <span className="font-mono">{claim.serial}</span> · {claim.customerName || claim.customerEmail || '—'}
                </span>
              </span>
              <span className="text-gray-500">Filed {formatDateTime(claim.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
