import React, { useCallback, useState } from 'react';
import { Loader2, PackageX, RefreshCw } from 'lucide-react';
import { supplierReturnApi } from '../../order-management/api/supplierReturnApi';
import type { SupplierReturn } from '../../order-management/types/supplierReturn.types';
import { ReturnDetails } from '../../order-management/components/SupplierReturnsPanel';
import { OrderTimeline } from '../../order-management/components/OrderTimeline';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useAuthStore } from '../../../store/useAuthStore';
import { useQueueList } from '../hooks/useQueueList';

const button = 'px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const WaitingReturn: React.FC<{
  ret: SupplierReturn;
  mine: boolean;
  busy: boolean;
  onDecide: (ret: SupplierReturn, decision: 'APPROVED' | 'REJECTED', reason?: string) => Promise<boolean>;
}> = ({ ret, mine, busy, onDecide }) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <li className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-2 text-xs" data-testid={`waiting-return-${ret.id}`}>
      <p className="font-semibold text-black dark:text-white">
        {ret.orderNumber} · {ret.supplierName}
      </p>
      <ReturnDetails ret={ret} view="staff" />
      <p className="text-[11px] text-amber-700 dark:text-amber-400">
        Approve it and the supplier is asked to accept the return. When the pieces arrive, they pay back what TinQa paid for them
        (and the shipping charge), and a Finance Manager checks the money.
      </p>
      <OrderTimeline orderId={ret.orderId} />
      {mine ? (
        <p className="text-[11px] text-gray-400">You raised it: someone else decides it.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => void onDecide(ret, 'APPROVED')} className={`${button} ${SOLID_TONE.approve}`}>
            Approve return
          </button>
          {rejecting ? (
            <>
              <input
                aria-label={`Reason to reject the return of ${ret.orderNumber}`}
                placeholder="Reason"
                maxLength={500}
                className="flex-1 min-w-40 px-2.5 py-1 rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !reason.trim()}
                onClick={async () => {
                  if (await onDecide(ret, 'REJECTED', reason.trim())) setRejecting(false);
                }}
                className={`${button} ${SOLID_TONE.danger}`}
              >
                Reject
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={`${button} ${SOLID_TONE.danger}`}>
              Reject
            </button>
          )}
        </div>
      )}
    </li>
  );
};

/**
 * Approvals Hub › Supplier returns (Super Admin, SUPPLIER_RETURN_APPROVE): returns of pieces that failed testing,
 * raised by a Supplier Manager, with the order, the supplier, the pieces, their value with GST, the reason and the
 * order's flow history. Loads only while its tab is open; a decision reloads this list and the hub's badges.
 */
export const SupplierReturnApprovalsPanel: React.FC<{ enabled: boolean; onChanged: () => void }> = ({ enabled, onChanged }) => {
  const { canAll } = useAccess();
  const username = useAuthStore((state) => state.user?.username);
  const allowed = enabled && canAll('SUPPLIER_RETURN_APPROVE', 'PROCUREMENT_ORDER_VIEW');
  const { items, reload } = useQueueList(allowed, supplierReturnApi.waiting, "Couldn't load the returns waiting for approval.");
  const changed = useCallback(() => {
    reload();
    onChanged();
  }, [reload, onChanged]);
  const { run, isSubmitting } = useApiAction(changed);
  if (!allowed) return null;
  const decide = (ret: SupplierReturn, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    run(() => supplierReturnApi.decide(ret.id, decision, reason), {
      success: decision === 'APPROVED' ? 'Return approved: the supplier is asked to accept it.' : 'Return rejected.',
      failure: "Couldn't decide the return.",
    });
  return (
    <section aria-label="Supplier returns awaiting approval" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white">
            <PackageX className="w-4 h-4 text-rose-500" /> Returns of failed pieces
          </h2>
          <p className="text-xs text-gray-500">You approve only the return; the supplier's answer, the shipping and the repayment follow on the order.</p>
        </div>
        <button type="button" onClick={reload} aria-label="Refresh supplier returns" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
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
          {items.map((ret) => (
            <WaitingReturn key={ret.id} ret={ret} mine={!!username && ret.requestedByUsername === username} busy={isSubmitting} onDecide={decide} />
          ))}
        </ul>
      )}
    </section>
  );
};
