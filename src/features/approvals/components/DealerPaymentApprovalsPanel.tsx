import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Wallet } from 'lucide-react';
import { dealerPaymentApi } from '../../order-management/api/dealerPaymentApi';
import type { DealerPaymentEntry } from '../../order-management/types/dealerPayment.types';
import { MILESTONE_LABELS } from '../../order-management/types/dealerPayment.types';
import { PAYMENT_METHOD_LABELS } from '../../order-management/utils/paymentPlan';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { useApiAction } from '../../../hooks/useApiAction';
import { useAuthStore } from '../../../store/useAuthStore';

const what = (entry: DealerPaymentEntry) => {
  if (entry.kind === 'PAYMENT') return `${MILESTONE_LABELS[entry.milestone ?? 'ADVANCE']} payment to the dealer`;
  if (entry.kind === 'REFUND') return 'Refund received from the dealer';
  return 'Reversal of a confirmed entry';
};

const button = 'px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const WaitingEntry: React.FC<{
  entry: DealerPaymentEntry;
  mine: boolean;
  busy: boolean;
  onDecide: (entry: DealerPaymentEntry, decision: 'APPROVED' | 'REJECTED', reason?: string) => Promise<boolean>;
}> = ({ entry, mine, busy, onDecide }) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <li className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-1.5 text-xs" data-testid={`waiting-payment-${entry.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-black dark:text-white">
          {entry.orderNumber} · {entry.dealerName}
        </span>
        <span className="font-bold text-sm">{formatCurrency(entry.amount)}</span>
      </div>
      <p className="text-gray-600 dark:text-gray-300">
        {what(entry)} · {PAYMENT_METHOD_LABELS[entry.method]} · {formatDate(entry.paidOn)}
        {entry.reference ? ` · Ref ${entry.reference}` : ''}
      </p>
      {entry.note && <p className="text-gray-500">{entry.note}</p>}
      <p className="text-[10px] text-gray-400">Recorded by {entry.recordedByUsername ?? 'someone'}</p>
      {mine ? (
        <p className="text-[11px] text-gray-400">You recorded it: someone else confirms it.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => onDecide(entry, 'APPROVED')} className={`${button} ${SOLID_TONE.approve}`}>
            Confirm
          </button>
          {rejecting ? (
            <>
              <input
                aria-label={`Reason to reject ${entry.orderNumber}`}
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
                  if (await onDecide(entry, 'REJECTED', reason.trim())) setRejecting(false);
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
 * Payments to dealers and refunds from them waiting for confirmation (DEALER_PAYMENT_APPROVE). Loads only while its
 * tab is open; nobody confirms what they recorded. Each decision refreshes this list and the hub's badges.
 */
export const DealerPaymentApprovalsPanel: React.FC<{ enabled: boolean; onChanged: () => void }> = ({ enabled, onChanged }) => {
  const { can } = useAccess();
  const notify = useNotify();
  const userId = useAuthStore((state) => state.user?.userId);
  const allowed = enabled && can('DEALER_PAYMENT_APPROVE');
  const [entries, setEntries] = useState<DealerPaymentEntry[] | null>(null);
  const [round, setRound] = useState(0);
  const reload = useCallback(() => setRound((n) => n + 1), []);
  const { run, isSubmitting } = useApiAction(() => {
    reload();
    onChanged();
  });

  useEffect(() => {
    if (!allowed) return;
    let current = true;
    dealerPaymentApi
      .waiting()
      .then((res) => {
        if (current) setEntries(res.success ? res.data ?? [] : []);
      })
      .catch((err: unknown) => {
        if (!current) return;
        setEntries([]);
        notify.error(err, "Couldn't load the dealer payments waiting for confirmation.");
      });
    return () => {
      current = false;
    };
  }, [allowed, round, notify]);

  if (!allowed) return null;
  const decide = (entry: DealerPaymentEntry, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    run(() => dealerPaymentApi.decide(entry.id, decision, reason), {
      success: decision === 'APPROVED' ? 'Payment entry confirmed.' : 'Payment entry rejected.',
      failure: "Couldn't decide the entry.",
    });

  return (
    <section aria-label="Dealer payments awaiting confirmation" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white">
            <Wallet className="w-4 h-4 text-[#0071e3]" /> Dealer payments awaiting confirmation
          </h2>
          <p className="text-xs text-gray-500">
            Payments made to dealers against their quotation's payment plan, and refunds they paid back. They count only once confirmed.
          </p>
        </div>
        <button type="button" onClick={reload} aria-label="Refresh dealer payments" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {entries === null && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </p>
      )}
      {entries?.length === 0 && <p className="text-xs text-gray-400 italic">Nothing waiting.</p>}
      {entries && entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <WaitingEntry key={entry.id} entry={entry} mine={entry.recordedBy === userId} busy={isSubmitting} onDecide={decide} />
          ))}
        </ul>
      )}
    </section>
  );
};
