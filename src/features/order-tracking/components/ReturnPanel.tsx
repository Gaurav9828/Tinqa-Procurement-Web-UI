import React, { useState } from 'react';
import { CheckCircle2, ClipboardCheck, Info, Pencil, RotateCcw, Send, Undo2, XCircle } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import type { OrderReturnInfo, ReturnTicketContext } from '../types/orderTracking.types';
import type { ReturnActions } from '../hooks/useOrderReturn';
import { useIsMe } from '../hooks/useIsMe';
import { formatCurrency, formatDateTime, formatUpdater } from '../utils/orderTracking.utils';
import { CopyableId } from './CopyableId';
import { CustomerWords } from './CustomerWords';
import { EnableReturnDialog } from './EnableReturnDialog';
import { InspectionDialog } from './InspectionDialog';
import { RejectReturnDialog, ReturnChargeDialog } from './ReturnDecisionDialogs';

interface Props {
  orderNumber: string;
  orderStatus: string | null;
  /** The order's subtotal: what a return can refund. Shipping is never part of it. */
  orderAmount: number | null;
  shippingFee: number | null;
  returnInfo: OrderReturnInfo | null;
  /** REFUND_REQUEST: request a return (from the customer's ticket only), withdraw it, record the inspection. */
  canManage: boolean;
  /** RETURN_ENABLE (Store Manager): approve or reject someone else's request, change the charge. */
  canDecide: boolean;
  /** The customer's support ticket the panel is shown in. Returns are requested only from there. */
  ticket?: ReturnTicketContext | null;
  actions: ReturnActions;
}

const Field: React.FC<{ label: string; children: React.ReactNode; testId?: string; wide?: boolean }> = ({ label, children, testId, wide }) => (
  <div className={`min-w-0 ${wide ? 'col-span-2' : ''}`}>
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="mt-1 text-black dark:text-white break-words whitespace-pre-line" data-testid={testId}>
      {children}
    </dd>
  </div>
);

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-gray-400">{children}</span>;

const DETAILS = 'grid grid-cols-2 gap-4 p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]';

const OUTCOME_TEXT: Record<string, { label: string; className: string }> = {
  PASS: { label: 'Passed', className: 'text-emerald-600 dark:text-emerald-400' },
  PARTIAL: { label: 'Partial refund', className: 'text-amber-600 dark:text-amber-400' },
  FAIL: { label: 'Failed — sent back to the customer', className: 'text-rose-600 dark:text-rose-400' },
};

const isCharged = (info: OrderReturnInfo) => Number(info.chargeAmount) > 0;
const chargeText = (info: OrderReturnInfo) => (isCharged(info) ? formatCurrency(info.chargeAmount) : 'Free return');

/** Order amount vs shipping: a return refunds the order amount at most, never the shipping. */
const Amounts: React.FC<{ orderAmount: number | null; shippingFee: number | null }> = ({ orderAmount, shippingFee }) => (
  <>
    <Field label="Order amount (excl. shipping)" testId="return-order-amount">{formatCurrency(orderAmount)}</Field>
    <Field label="Shipping (not refunded)" testId="return-shipping">{formatCurrency(shippingFee)}</Field>
  </>
);

const settlementOptions = (info: OrderReturnInfo): string => {
  if (!isCharged(info)) return 'Nothing to settle';
  return info.deductAllowed
    ? 'Customer may have it deducted from the refund or pay it now'
    : 'Not less than the order amount: the customer must pay it before the return starts';
};

const notReturnableText = (info: OrderReturnInfo | null): string => {
  if (!info) {
    return "This order is not returnable. Orders aren't returnable by default: when the customer gives a reason we accept in their support ticket, Customer Support requests a return from that ticket.";
  }
  const when = info.withdrawnAt ? ` on ${formatDateTime(info.withdrawnAt)}` : '';
  return `The return option was withdrawn${when} by ${formatUpdater(info.withdrawnBy)}. The order is not returnable.`;
};

const ChargePayment: React.FC<{ info: OrderReturnInfo }> = ({ info }) => {
  if (info.chargeStatus === 'PAID') {
    return <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Paid {formatDateTime(info.chargePaidAt)}</span>;
  }
  if (info.chargeStatus === 'PENDING') return <span className="text-amber-600 dark:text-amber-400 font-semibold">Pending</span>;
  return <Muted>Not paid</Muted>;
};

type Amount = { orderAmount: number | null; shippingFee: number | null };

/** The customer's own words (from their ticket), the staff note and who asked: what a Store Manager decides on. */
const RequestWords: React.FC<{ info: OrderReturnInfo; withRequester?: boolean }> = ({ info, withRequester }) => (
  <div className="col-span-2">
    <CustomerWords
      words={info.enabledReason}
      ticketReference={info.sourceTicketReference}
      staffNote={info.staffNote}
      {...(withRequester ? { requestedBy: info.staffRequestedBy, requestedAt: formatDateTime(info.staffRequestedAt) } : {})}
    />
  </div>
);

const requestedText = (canDecide: boolean, mine: boolean): string => {
  if (canDecide && mine) return 'You raised this request, so another Store Manager must decide it.';
  if (canDecide) return 'Return requested by Customer Support. Approve it (you may change the charge) or reject it.';
  return 'Return requested. Waiting for a Store Manager to approve it.';
};

/** Customer Support asked; a Store Manager (not the requester) decides. */
const RequestedDetails: React.FC<{ info: OrderReturnInfo; canDecide: boolean; mine: boolean } & Amount> = ({ info, canDecide, mine, ...amounts }) => (
  <>
    <p className="text-amber-700 dark:text-amber-400 font-semibold" role="status">
      {requestedText(canDecide, mine)}
    </p>
    <dl className={DETAILS}>
      <Amounts {...amounts} />
      <Field label="Proposed charge" testId="return-charge">{chargeText(info)}</Field>
      <Field label="Requested">
        {formatDateTime(info.staffRequestedAt)} by {formatUpdater(info.staffRequestedBy)}
      </Field>
      {info.chargeReason && <Field label="Charge for" wide>{info.chargeReason}</Field>}
      <RequestWords info={info} />
    </dl>
  </>
);

const RejectedDetails: React.FC<{ info: OrderReturnInfo }> = ({ info }) => (
  <>
    <p className="text-rose-600 dark:text-rose-400 font-semibold" role="status">
      Return request rejected {formatDateTime(info.rejectedAt)} by {formatUpdater(info.rejectedBy)}. The order is not returnable.
    </p>
    <dl className={DETAILS}>
      <Field label="Reason given to the customer" wide testId="return-rejection-reason">{info.rejectionReason || <Muted>—</Muted>}</Field>
      <RequestWords info={info} withRequester />
    </dl>
  </>
);

/** Enabled, waiting for the customer to agree to the charge and start it (or expired). */
const EnabledDetails: React.FC<{ info: OrderReturnInfo } & Amount> = ({ info, ...amounts }) => (
  <>
    <p className={info.open ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'} role="status">
      {info.open
        ? `Return enabled. The customer can start it until ${formatDateTime(info.expiresAt)}.`
        : `Expired: the customer did not start the return by ${formatDateTime(info.expiresAt)}.`}
    </p>
    <dl className={DETAILS}>
      <Amounts {...amounts} />
      <Field label="Return charge" testId="return-charge">{chargeText(info)}</Field>
      <Field label="Start by">{formatDateTime(info.expiresAt)}</Field>
      <Field label="Settlement" wide testId="return-settlement-options">{settlementOptions(info)}</Field>
      {isCharged(info) && (
        <Field label="Customer agreed to the charge" wide testId="return-consent">
          {info.chargeConsentedAt ? formatDateTime(info.chargeConsentedAt) : <Muted>Not yet</Muted>}
        </Field>
      )}
      {info.chargeReason && <Field label="Charge for" wide>{info.chargeReason}</Field>}
      <RequestWords info={info} />
      {info.staffRequestedBy && (
        <Field label="Requested" wide>
          {formatDateTime(info.staffRequestedAt)} by {formatUpdater(info.staffRequestedBy)}
          {info.requestedChargeAmount !== null && info.requestedChargeAmount !== info.chargeAmount
            ? ` (proposed charge ${formatCurrency(info.requestedChargeAmount)})`
            : ''}
        </Field>
      )}
      <Field label="Enabled" wide>
        {formatDateTime(info.enabledAt)} by {formatUpdater(info.enabledBy)}
      </Field>
      {info.chargeChangedBy && (
        <Field label="Charge changed" wide testId="return-charge-changed">
          {formatDateTime(info.chargeChangedAt)} by {formatUpdater(info.chargeChangedBy)}
        </Field>
      )}
    </dl>
    {info.chargeStatus === 'PENDING' && <p className="text-amber-700 dark:text-amber-400">The customer is paying the return charge right now.</p>}
  </>
);

const StartedSettlement: React.FC<{ info: OrderReturnInfo }> = ({ info }) => {
  if (!isCharged(info)) return <Muted>Nothing to settle</Muted>;
  return <>{info.settlement === 'PAY' ? 'Paid by the customer now' : 'Deducted from the refund'}</>;
};

/** Started by the customer: how the charge is settled, their reason and the return tracking ID. */
const StartedDetails: React.FC<{ info: OrderReturnInfo } & Amount> = ({ info, ...amounts }) => (
  <dl className={DETAILS}>
    {info.trackingId && (
      <Field label="Return tracking ID" wide>
        <CopyableId value={info.trackingId} label="Return tracking ID" />
      </Field>
    )}
    <Amounts {...amounts} />
    <Field label="Return charge" testId="return-charge">{chargeText(info)}</Field>
    <Field label="Settlement" testId="return-settlement">
      <StartedSettlement info={info} />
    </Field>
    {info.settlement === 'PAY' && isCharged(info) && (
      <Field label="Charge payment" testId="return-charge-status">
        <ChargePayment info={info} />
      </Field>
    )}
    {isCharged(info) && info.chargeConsentedAt && <Field label="Customer agreed to the charge">{formatDateTime(info.chargeConsentedAt)}</Field>}
    <Field label="Started">{formatDateTime(info.requestedAt)}</Field>
    {info.customerReason && (
      <Field label="Reason the customer gave when starting" wide>
        {info.customerReason}
      </Field>
    )}
    {(info.enabledReason || !info.customerReason) && <RequestWords info={info} />}
    {info.chargeReason && <Field label="Charge for" wide>{info.chargeReason}</Field>}
    {info.chargeStatus === 'PAID' && (
      <p className="col-span-2 text-purple-700 dark:text-purple-300">The customer paid the return charge, so this return can't be rejected or cancelled.</p>
    )}
  </dl>
);

const InspectionDetails: React.FC<{ info: OrderReturnInfo }> = ({ info }) => {
  const outcome = OUTCOME_TEXT[info.inspectionOutcome!];
  return (
    <dl aria-label="Inspection" className={DETAILS}>
      <Field label="Inspection" testId="inspection-outcome">
        <span className={`font-semibold ${outcome.className}`}>{outcome.label}</span>
      </Field>
      <Field label="Refund" testId="inspection-refund">
        {info.inspectionOutcome === 'FAIL' ? <Muted>No refund</Muted> : formatCurrency(info.refundAmount)}
      </Field>
      {info.inspectionNote && <Field label="Note" wide>{info.inspectionNote}</Field>}
      <Field label="Inspected" wide>
        {formatDateTime(info.inspectedAt)} by {formatUpdater(info.inspectedBy)}
      </Field>
    </dl>
  );
};

const ACTION = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed';

type Dialog = 'request' | 'update-request' | 'approve' | 'reject' | 'charge' | 'withdraw' | 'inspect' | null;

interface Abilities {
  /** A (new) return may be requested now; the button is offered only inside the customer's open ticket. */
  request: boolean;
  /** The request can be made from here: the panel is in the customer's ticket, which is still open. */
  fromTicket: boolean;
  updateRequest: boolean;
  decideRequest: boolean;
  /** The signed-in Store Manager raised the waiting request, so someone else decides it. */
  ownRequest: boolean;
  changeCharge: boolean;
  withdraw: boolean;
  inspect: boolean;
  chargeBeingPaid: boolean;
}

/** Which return actions this user may take now: the same rules the server applies (ReturnService). */
const returnAbilities = (
  orderStatus: string | null,
  info: OrderReturnInfo | null,
  canManage: boolean,
  canDecide: boolean,
  ticket: ReturnTicketContext | null | undefined,
  mine: boolean
): Abilities => {
  const state = info?.state ?? null;
  const open = !!info?.open;
  const chargeBeingPaid = info?.chargeStatus === 'PENDING';
  const delivered = orderStatus === 'DELIVERED';
  const enabledAndOpen = state === 'ENABLED' && open;
  // A (new) return can be requested on a delivered order with none, a withdrawn or rejected one, or an expired one
  const closed = state === null || state === 'WITHDRAWN' || state === 'REJECTED';
  const expired = state === 'ENABLED' && !open && !chargeBeingPaid;
  const requested = state === 'REQUESTED';
  const fromTicket = !!ticket && !ticket.closed;
  return {
    request: canManage && delivered && (closed || expired),
    fromTicket,
    // A Store Manager who updates someone else's request would become its requester, so only the requester (or Customer
    // Support without RETURN_ENABLE) updates it
    updateRequest: canManage && fromTicket && requested && delivered && (!canDecide || mine),
    decideRequest: canDecide && requested && !mine,
    ownRequest: canDecide && requested && mine,
    changeCharge: canDecide && enabledAndOpen,
    withdraw: canManage && (enabledAndOpen || state === 'REQUESTED'),
    inspect: canManage && state === 'STARTED' && orderStatus === 'RETURN_INSPECTION' && !info?.inspectionOutcome,
    chargeBeingPaid,
  };
};

const ReturnButtons: React.FC<{
  can: Abilities;
  state: OrderReturnInfo['state'] | null;
  isSubmitting: boolean;
  onOpen: (dialog: Dialog) => void;
}> = ({ can, state, isSubmitting, onOpen }) => {
  const payingTitle = can.chargeBeingPaid ? 'The customer is paying the return charge' : undefined;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {can.withdraw && (
        <button type="button" onClick={() => onOpen('withdraw')} disabled={isSubmitting || can.chargeBeingPaid} title={payingTitle} className={`${ACTION} ${SOLID_TONE.warning}`}>
          <Undo2 className="w-3.5 h-3.5" /> {state === 'REQUESTED' ? 'Withdraw request' : 'Withdraw return'}
        </button>
      )}
      {can.updateRequest && (
        <button type="button" onClick={() => onOpen('update-request')} disabled={isSubmitting} className={`${ACTION} ${SOLID_TONE.primary}`}>
          <Pencil className="w-3.5 h-3.5" /> Update request
        </button>
      )}
      {can.decideRequest && (
        <>
          <button type="button" onClick={() => onOpen('reject')} disabled={isSubmitting} className={`${ACTION} ${SOLID_TONE.danger}`}>
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
          <button type="button" onClick={() => onOpen('approve')} disabled={isSubmitting} className={`${ACTION} ${SOLID_TONE.approve}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </button>
        </>
      )}
      {can.changeCharge && (
        <button type="button" onClick={() => onOpen('charge')} disabled={isSubmitting || can.chargeBeingPaid} title={payingTitle} className={`${ACTION} ${SOLID_TONE.warning}`}>
          <Pencil className="w-3.5 h-3.5" /> Change charge
        </button>
      )}
      {can.request && can.fromTicket && (
        <button type="button" onClick={() => onOpen('request')} disabled={isSubmitting} className={`${ACTION} ${SOLID_TONE.primary}`}>
          <Send className="w-3.5 h-3.5" /> {state === null ? 'Request return' : 'Request return again'}
        </button>
      )}
      {can.inspect && (
        <button type="button" onClick={() => onOpen('inspect')} disabled={isSubmitting} className={`${ACTION} ${SOLID_TONE.primary}`}>
          <ClipboardCheck className="w-3.5 h-3.5" /> Record inspection
        </button>
      )}
    </div>
  );
};

const ReturnDialogs: React.FC<{
  dialog: Dialog;
  orderNumber: string;
  orderAmount: number | null;
  shippingFee: number | null;
  returnInfo: OrderReturnInfo | null;
  ticket: ReturnTicketContext | null | undefined;
  actions: ReturnActions;
  onClose: () => void;
}> = ({ dialog, orderNumber, orderAmount, shippingFee, returnInfo, ticket, actions, onClose }) => {
  const { isSubmitting } = actions;
  const amounts = { orderAmount, shippingFee };
  const state = returnInfo?.state ?? null;
  const withdraw = async () => {
    await actions.withdrawReturn();
    onClose();
  };
  const requestDraft =
    dialog === 'update-request' && returnInfo
      ? { charge: String(returnInfo.chargeAmount ?? 0), chargeReason: returnInfo.chargeReason ?? '', staffNote: returnInfo.staffNote ?? '' }
      : undefined;
  const requestContext = returnInfo && (
    <CustomerWords
      words={returnInfo.enabledReason}
      ticketReference={returnInfo.sourceTicketReference}
      staffNote={returnInfo.staffNote}
      requestedBy={returnInfo.staffRequestedBy}
      requestedAt={formatDateTime(returnInfo.staffRequestedAt)}
    />
  );
  return (
    <>
      {(dialog === 'request' || dialog === 'update-request') && ticket && (
        <EnableReturnDialog
          orderNumber={orderNumber}
          {...amounts}
          ticket={ticket}
          initial={requestDraft}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSubmit={actions.enableReturn}
        />
      )}
      {dialog === 'approve' && returnInfo && (
        <ReturnChargeDialog
          mode="approve"
          orderNumber={orderNumber}
          {...amounts}
          initialCharge={returnInfo.chargeAmount}
          initialChargeReason={returnInfo.chargeReason}
          context={requestContext}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSubmit={actions.approveReturn}
        />
      )}
      {dialog === 'charge' && returnInfo && (
        <ReturnChargeDialog
          mode="change"
          orderNumber={orderNumber}
          {...amounts}
          initialCharge={returnInfo.chargeAmount}
          initialChargeReason={returnInfo.chargeReason}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSubmit={actions.changeReturnCharge}
        />
      )}
      {dialog === 'reject' && (
        <RejectReturnDialog orderNumber={orderNumber} context={requestContext} isSubmitting={isSubmitting} onClose={onClose} onSubmit={actions.rejectReturn} />
      )}
      {dialog === 'inspect' && returnInfo && (
        <InspectionDialog orderNumber={orderNumber} returnInfo={returnInfo} isSubmitting={isSubmitting} onClose={onClose} onSubmit={actions.recordInspection} />
      )}
      <ConfirmationModal
        isOpen={dialog === 'withdraw'}
        actionType="CONFIRM"
        tone="warning"
        title={state === 'REQUESTED' ? 'Withdraw the return request?' : 'Withdraw the return option?'}
        description={`The customer will no longer be able to start a return on order ${orderNumber}, and is emailed about it. A return can be requested again later from the customer's support ticket.`}
        confirmLabel="Yes, withdraw"
        isSubmitting={isSubmitting}
        onClose={onClose}
        onConfirm={withdraw}
      />
    </>
  );
};

/** What the return looks like now, for each state. */
const ReturnState: React.FC<{ info: OrderReturnInfo | null; canDecide: boolean; mine: boolean; orderAmount: number | null; shippingFee: number | null }> = ({
  info,
  canDecide,
  mine,
  ...amounts
}) => {
  if (!info || info.state === 'WITHDRAWN') {
    return (
      <p className="text-gray-600 dark:text-gray-300" role="status">
        {notReturnableText(info)}
      </p>
    );
  }
  if (info.state === 'REQUESTED') return <RequestedDetails info={info} canDecide={canDecide} mine={mine} {...amounts} />;
  if (info.state === 'REJECTED') return <RejectedDetails info={info} />;
  if (info.state === 'ENABLED') return <EnabledDetails info={info} {...amounts} />;
  return (
    <>
      <StartedDetails info={info} {...amounts} />
      {info.inspectionOutcome && <InspectionDetails info={info} />}
    </>
  );
};

/** Why the request button isn't here: returns are requested from the customer's (open) ticket about the order. */
const RequestElsewhere: React.FC<{ ticket: ReturnTicketContext | null | undefined }> = ({ ticket }) => (
  <p className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300" data-testid="return-request-note">
    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-500" />
    {ticket?.closed
      ? "This ticket is closed, so a return can't be requested from it. The customer can raise a new ticket about the order."
      : "Returns are requested from the customer's support ticket for this order."}
  </p>
);

/**
 * Returns are not offered by default. Customer Support requests one from the customer's support ticket about a
 * delivered order: the customer's reason is one of their own messages in it (never typed by staff), with a proposed
 * charge and an optional internal note. A Store Manager other than the requester approves (possibly with another
 * charge) or rejects it, and may change the charge until the customer starts it. The customer agrees to the charge and
 * starts it within 7 days, and after the item is back staff record the inspection. Everything shown comes with the
 * order (or ticket) detail; actions reload it. Used on the order page (no requests there) and in the ticket chat.
 */
export const ReturnPanel: React.FC<Props> = ({ orderNumber, orderStatus, orderAmount, shippingFee, returnInfo, canManage, canDecide, ticket, actions }) => {
  const [dialog, setDialog] = useState<Dialog>(null);
  const isMe = useIsMe();
  const mine = returnInfo?.state === 'REQUESTED' && isMe(returnInfo.staffRequestedBy);
  const can = returnAbilities(orderStatus, returnInfo, canManage, canDecide, ticket, mine);
  if (!returnInfo && !can.request) return null;
  const requestHere = can.request && can.fromTicket;
  const anyAction = requestHere || can.updateRequest || can.decideRequest || can.changeCharge || can.withdraw || can.inspect;

  return (
    <section aria-label="Return" className="apple-card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-1.5">
        <RotateCcw className="w-4 h-4 text-purple-500" /> Return
      </h2>
      <ReturnState info={returnInfo} canDecide={canDecide} mine={mine} orderAmount={orderAmount} shippingFee={shippingFee} />
      {can.request && !can.fromTicket && <RequestElsewhere ticket={ticket} />}
      {anyAction && <ReturnButtons can={can} state={returnInfo?.state ?? null} isSubmitting={actions.isSubmitting} onOpen={setDialog} />}
      <ReturnDialogs
        dialog={dialog}
        orderNumber={orderNumber}
        orderAmount={orderAmount}
        shippingFee={shippingFee}
        returnInfo={returnInfo}
        ticket={ticket}
        actions={actions}
        onClose={() => setDialog(null)}
      />
    </section>
  );
};
