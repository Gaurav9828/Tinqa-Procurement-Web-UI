import React, { useState } from 'react';
import { Check, FileText, KeyRound, Loader2, RefreshCw, X } from 'lucide-react';
import { useSupplierApprovals } from '../hooks/useSupplierApprovals';
import { supplierLoginApi } from '../../supplier-management/api/supplierLoginApi';
import { orderApi } from '../../order-management/api/orderApi';
import { ChangeDiff } from '../../supplier-portal/components/ChangeDiff';
import { formatCurrency, formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { useApiAction } from '../../../hooks/useApiAction';
import { useAuthStore } from '../../../store/useAuthStore';
import { CommonTextArea } from '../../../components/ui/FormInputs';
import { QuotedPriceCheck } from '../../order-management/components/QuotedPriceCheck';
import { SOLID_TONE } from '../../../components/ui/actionTones';

type Target = { kind: 'login'; supplierId: number } | { kind: 'change'; id: number };

const sameTarget = (a: Target | null, b: Target) =>
  !!a && a.kind === b.kind && (a.kind === 'login' ? a.supplierId === (b as { supplierId: number }).supplierId : a.id === (b as { id: number }).id);

/** Approve / reject with a required reason for rejecting, inline under the item. */
const Decision: React.FC<{
  target: Target;
  rejecting: Target | null;
  setRejecting: (target: Target | null) => void;
  disabled: boolean;
  disabledReason?: string;
  approveLabel: string;
  onApprove: () => void;
  onReject: (reason: string) => Promise<boolean>;
}> = ({ target, rejecting, setRejecting, disabled, disabledReason, approveLabel, onApprove, onReject }) => {
  const [reason, setReason] = useState('');
  if (disabledReason) return <p className="text-xs text-gray-500">{disabledReason}</p>;
  if (sameTarget(rejecting, target)) {
    return (
      <div className="space-y-2">
        <CommonTextArea label="Reason for rejecting" aria-label="Reason for rejecting" required rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setRejecting(null)} className="px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={disabled || !reason.trim()}
            onClick={async () => {
              if (await onReject(reason.trim())) setRejecting(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.danger}`}
          >
            Reject
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 justify-end">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setRejecting(target)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.danger}`}
      >
        <X className="w-3.5 h-3.5" /> Reject
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onApprove}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.approve}`}
      >
        <Check className="w-3.5 h-3.5" /> {approveLabel}
      </button>
    </div>
  );
};

/** The Approvals hub's Suppliers tab: supplier logins to approve, and suppliers' changes to their quotations. */
export const SupplierApprovalsPanel: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const approvals = useSupplierApprovals();
  const currentUserId = useAuthStore((state) => state.user?.userId);
  const [rejecting, setRejecting] = useState<Target | null>(null);
  const { isSubmitting, run } = useApiAction(() => {
    approvals.refresh();
    onChanged?.();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-2xl">
          Supplier logins can sign in only after someone other than their creator approves them. A supplier's change to a quotation is
          applied only when you approve it; until then the quotation is frozen.
        </p>
        <button
          type="button"
          onClick={approvals.refresh}
          aria-label="Refresh supplier approvals"
          className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${approvals.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {approvals.canChanges && (
        <section aria-label="Quotation changes from suppliers" className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0071e3]" /> Quotation changes from suppliers
            <span className="text-xs text-gray-400">({approvals.changes.length})</span>
          </h2>
          {approvals.changes.length === 0 && (
            <p className="apple-card p-5 text-sm text-gray-500">{approvals.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'No changes waiting.'}</p>
          )}
          {approvals.changes.map((change) => (
            <article key={change.id} className="apple-card p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    <span className="font-mono">{change.orderNumber}</span> · {change.supplierName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Requested by {change.requestedByUsername} on {formatDateTime(change.requestedAt)}
                  </p>
                </div>
                {change.proposedTotalPrice != null && (
                  <p className="text-xs text-right">
                    Total <span className="font-mono line-through text-gray-400">{formatCurrency(change.currentTotalPrice)}</span>{' '}
                    → <span className="font-mono font-semibold">{formatCurrency(change.proposedTotalPrice)}</span>
                  </p>
                )}
              </div>
              {change.changes.unitPrice != null && (
                <QuotedPriceCheck
                  quotedLabel="Proposed"
                  quotedPrice={change.changes.unitPrice}
                  itemPrice={change.itemPrice ?? null}
                  previousPrice={change.previous.unitPrice ?? null}
                  reason={change.note}
                  unitType={change.changes.unitType ?? change.previous.unitType}
                />
              )}
              {change.note && change.changes.unitPrice == null && (
                <p className="text-sm rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2">
                  <span className="text-xs text-gray-400 block">Supplier's reason</span>
                  {change.note}
                </p>
              )}
              <ChangeDiff changes={change.changes} previous={change.previous} />
              <Decision
                target={{ kind: 'change', id: change.id }}
                rejecting={rejecting}
                setRejecting={setRejecting}
                disabled={isSubmitting}
                approveLabel="Approve & apply"
                onApprove={() =>
                  run(() => orderApi.decideChangeRequest(change.id, 'APPROVED'), {
                    success: 'Change approved and applied.',
                    failure: 'The change could not be approved.',
                  })
                }
                onReject={(reason) =>
                  run(() => orderApi.decideChangeRequest(change.id, 'REJECTED', reason), {
                    success: 'Change rejected.',
                    failure: 'The change could not be rejected.',
                  })
                }
              />
            </article>
          ))}
        </section>
      )}

      {approvals.canLogins && (
        <section aria-label="Supplier logins waiting for approval" className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#0071e3]" /> Supplier logins
            <span className="text-xs text-gray-400">({approvals.logins.length})</span>
          </h2>
          {approvals.logins.length === 0 && (
            <p className="apple-card p-5 text-sm text-gray-500">{approvals.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'No logins waiting.'}</p>
          )}
          {approvals.logins.map((login) => (
            <article key={login.id} className="apple-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-semibold">{login.supplierName}</p>
                <p className="text-xs text-gray-500">
                  Username <span className="font-mono">{login.username}</span> · {login.email}
                </p>
                <p className="text-xs text-gray-500">
                  Created by {login.createdByUsername} on {formatDateTime(login.createdAt)}
                  {!login.supplierActive && <span className="text-amber-600"> · supplier is inactive</span>}
                </p>
              </div>
              <div className="sm:min-w-[260px]">
                <Decision
                  target={{ kind: 'login', supplierId: login.supplierId }}
                  rejecting={rejecting}
                  setRejecting={setRejecting}
                  disabled={isSubmitting}
                  disabledReason={login.createdBy === currentUserId ? 'You created this login, so someone else approves it.' : undefined}
                  approveLabel="Approve login"
                  onApprove={() =>
                    run(() => supplierLoginApi.decide(login.supplierId, 'APPROVED'), {
                      success: 'Supplier login approved.',
                      failure: 'The login could not be approved.',
                    })
                  }
                  onReject={(reason) =>
                    run(() => supplierLoginApi.decide(login.supplierId, 'REJECTED', reason), {
                      success: 'Supplier login rejected.',
                      failure: 'The login could not be rejected.',
                    })
                  }
                />
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};
