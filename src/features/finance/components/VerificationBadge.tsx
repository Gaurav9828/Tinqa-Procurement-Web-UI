import React from 'react';
import { AlertTriangle, CheckCircle2, ScanLine } from 'lucide-react';
import type { VoucherDocument } from '../types/finance.types';

/** How an attached invoice compared with its voucher; nothing for documents that aren't checked. */
export const VerificationBadge: React.FC<{ document: Pick<VoucherDocument, 'verificationStatus' | 'verificationNotes'>; compact?: boolean }> = ({
  document,
  compact = false,
}) => {
  switch (document.verificationStatus) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400" title="Read and matches the voucher">
          <CheckCircle2 className="w-3 h-3" aria-hidden /> {compact ? 'Verified' : 'Verified: matches the voucher'}
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span className="inline-flex items-start gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400" title={document.verificationNotes ?? undefined}>
          <AlertTriangle className="w-3 h-3 mt-px shrink-0" aria-hidden />
          <span>{compact ? 'Check bill' : `Check: ${document.verificationNotes ?? 'the bill differs from the voucher.'}`}</span>
        </span>
      );
    case 'UNREADABLE':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500" title="A scan: it couldn't be read, so check it by eye">
          <ScanLine className="w-3 h-3" aria-hidden /> {compact ? 'Scan' : 'Scanned: check it by eye'}
        </span>
      );
    default:
      return null;
  }
};
