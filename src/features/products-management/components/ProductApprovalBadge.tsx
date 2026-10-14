import React from 'react';
import { AlertTriangle, Ban, CheckCircle2, Clock, HelpCircle, Send, XCircle } from 'lucide-react';
import { APPROVAL_STATE_LABELS, type ProductApprovalState } from '../utils/productApproval';

const STYLES: Record<ProductApprovalState, { tone: string; icon: React.ElementType }> = {
  LEGACY: { tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  APPROVED: { tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  PENDING: { tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: Clock },
  REJECTED: { tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: XCircle },
  CANCELLED: { tone: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20', icon: Ban },
  NOT_SUBMITTED: { tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: Send },
  UPDATE_PENDING: { tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: Clock },
  UPDATE_REJECTED: { tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: XCircle },
  UPDATE_NOT_APPLIED: { tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', icon: AlertTriangle },
  UNKNOWN: { tone: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: HelpCircle },
};

/** Admin L2 approval state of a product, with the decision reason (rejected / cancelled) on hover and below. */
export const ProductApprovalBadge: React.FC<{ state: ProductApprovalState; reason?: string | null }> = ({ state, reason }) => {
  const { tone, icon: Icon } = STYLES[state];
  return (
    <div className="space-y-0.5" data-testid="product-approval-state" data-state={state}>
      <span
        title={reason ?? undefined}
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border whitespace-nowrap ${tone}`}
      >
        <Icon className="w-3 h-3" /> {APPROVAL_STATE_LABELS[state]}
      </span>
      {reason && (state === 'REJECTED' || state === 'CANCELLED' || state === 'UPDATE_REJECTED') && (
        <p className="text-[10px] text-gray-500 max-w-[180px] truncate" title={reason}>
          Reason: {reason}
        </p>
      )}
    </div>
  );
};
