import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useAccess } from '../../../hooks/useAccess';
import { orderTrackingApi } from '../../order-tracking/api/orderTrackingApi';
import { CustomerWords } from '../../order-tracking/components/CustomerWords';
import { RejectReturnDialog, ReturnChargeDialog } from '../../order-tracking/components/ReturnDecisionDialogs';
import { useIsMe } from '../../order-tracking/hooks/useIsMe';
import { useOrderReturn } from '../../order-tracking/hooks/useOrderReturn';
import type { ReturnRequestRow } from '../../order-tracking/types/orderTracking.types';
import { formatCurrency, formatDateTime, formatUpdater } from '../../order-tracking/utils/orderTracking.utils';
import { orderDetailPath } from '../../order-tracking/utils/orderTrackingRoutes';
import { useQueueList } from '../hooks/useQueueList';

/** Only a handful wait at a time; the backend caps a page at 50. */
export const RETURN_REQUESTS_PAGE_SIZE = 50;

const button = 'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const loadRequests = async () => {
  const res = await orderTrackingApi.listReturnRequests(0, RETURN_REQUESTS_PAGE_SIZE);
  return { ...res, data: res.data?.content ?? [] };
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="mt-0.5 text-black dark:text-white break-words">{children}</dd>
  </div>
);

/**
 * One request, with its own return actions (the same dialogs and checks as the order page). Whoever raised it can't
 * decide it (the server answers 409 RETURN_SELF_APPROVAL), so they see why instead of the buttons.
 */
const WaitingRequest: React.FC<{ request: ReturnRequestRow; mine: boolean; onChanged: () => void }> = ({ request, mine, onChanged }) => {
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const actions = useOrderReturn(request.orderNumber, { onOrderChanged: onChanged });
  const close = () => setDialog(null);
  const words = (
    <CustomerWords
      words={request.reason}
      ticketReference={request.ticketReference}
      staffNote={request.staffNote}
      requestedBy={request.requestedBy}
      requestedAt={formatDateTime(request.requestedAt)}
    />
  );
  return (
    <li className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-2 text-xs" data-testid={`return-request-${request.orderNumber}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={orderDetailPath(request.orderNumber)} className="font-mono font-semibold text-[#0071e3] dark:text-blue-400 hover:underline">
          Order #{request.orderNumber}
        </Link>
        <span className="text-gray-500">
          Requested {formatDateTime(request.requestedAt)} by {formatUpdater(request.requestedBy)}
        </span>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Row label="Customer">{request.customerName || request.customerEmail || '—'}</Row>
        <Row label="Order amount">{formatCurrency(request.orderAmount)}</Row>
        <Row label="Shipping (not refunded)">{formatCurrency(request.shippingFee)}</Row>
        <Row label="Proposed charge">{Number(request.chargeAmount) > 0 ? formatCurrency(request.chargeAmount) : 'Free return'}</Row>
      </dl>
      {request.chargeReason && <p className="text-gray-600 dark:text-gray-300">Charge for: {request.chargeReason}</p>}
      <CustomerWords words={request.reason} ticketReference={request.ticketReference} staffNote={request.staffNote} />
      {mine ? (
        <p role="status" className="text-amber-700 dark:text-amber-400 text-right">
          You raised this request, so another Store Manager must decide it.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" disabled={actions.isSubmitting} onClick={() => setDialog('reject')} className={`${button} ${SOLID_TONE.danger}`}>
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
          <button type="button" disabled={actions.isSubmitting} onClick={() => setDialog('approve')} className={`${button} ${SOLID_TONE.approve}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </button>
        </div>
      )}
      {dialog === 'approve' && (
        <ReturnChargeDialog
          mode="approve"
          orderNumber={request.orderNumber}
          orderAmount={request.orderAmount}
          shippingFee={request.shippingFee}
          initialCharge={request.chargeAmount}
          initialChargeReason={request.chargeReason}
          context={words}
          isSubmitting={actions.isSubmitting}
          onClose={close}
          onSubmit={actions.approveReturn}
        />
      )}
      {dialog === 'reject' && (
        <RejectReturnDialog orderNumber={request.orderNumber} context={words} isSubmitting={actions.isSubmitting} onClose={close} onSubmit={actions.rejectReturn} />
      )}
    </li>
  );
};

/**
 * Approvals Hub › Return requests (RETURN_ENABLE, Store Managers): returns Customer Support asked for from the
 * customer's support ticket, with the order amount (shipping apart), the proposed charge, the customer's own words (with
 * a link to the ticket) and the staff note. Approving enables the return with the charge
 * the manager decides; rejecting emails the customer the reason. Loads only while its tab is open; a decision reloads
 * this list and the hub's badges.
 */
export const ReturnRequestApprovalsPanel: React.FC<{ enabled: boolean; onChanged: () => void }> = ({ enabled, onChanged }) => {
  const { can } = useAccess();
  const isMe = useIsMe();
  const allowed = enabled && can('RETURN_ENABLE');
  const { items, reload } = useQueueList(allowed, loadRequests, "Couldn't load the return requests.");
  const changed = useCallback(() => {
    reload();
    onChanged();
  }, [reload, onChanged]);
  if (!allowed) return null;
  return (
    <section aria-label="Return requests awaiting approval" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white">
            <RotateCcw className="w-4 h-4 text-purple-500" /> Return requests
          </h2>
          <p className="text-xs text-gray-500">
            Customer Support asked for these returns from the customers' tickets; the reason is the customer's own words. You can't decide a
            request you raised. The charge can be deducted from the refund only while it is less than the order amount.
          </p>
        </div>
        <button type="button" onClick={reload} aria-label="Refresh return requests" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
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
          {items.map((request) => (
            <WaitingRequest key={request.orderNumber} request={request} mine={isMe(request.requestedBy)} onChanged={changed} />
          ))}
        </ul>
      )}
    </section>
  );
};
