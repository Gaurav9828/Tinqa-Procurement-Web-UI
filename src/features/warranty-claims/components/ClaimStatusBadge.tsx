import React from 'react';
import { CLAIM_STATUS_LABEL, RESOLUTION_LABEL, type WarrantyClaimStatus, type WarrantyResolution } from '../types/warrantyClaim.types';

const TONE: Record<WarrantyClaimStatus, string> = {
  SUBMITTED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  IN_REVIEW: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  RESOLVED: 'bg-gray-500/10 text-gray-600 dark:text-gray-300',
};

export const ClaimStatusBadge: React.FC<{ status: WarrantyClaimStatus; resolution?: WarrantyResolution | null }> = ({ status, resolution }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${TONE[status]}`}>
    {CLAIM_STATUS_LABEL[status]}
    {resolution && (status === 'APPROVED' || status === 'RESOLVED') ? ` · ${RESOLUTION_LABEL[resolution]}` : ''}
  </span>
);
