import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, PackageX } from 'lucide-react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { todayLocalIsoDate } from '../validator/orderValidator';
import { useOrderReturns } from '../hooks/useOrderReturns';
import { validateDispatch, validateRaise, type DispatchForm, type RaiseForm } from '../utils/returnForms';
import {
  CANCELLABLE_RETURN_STATUSES,
  RETURN_EVENT_LABELS,
  RETURN_STATUS_LABELS,
  SHIPPING_MODE_LABELS,
  type OrderReturns,
  type ReturnShippingMode,
  type SupplierReturn,
  type SupplierReturnStatus,
} from '../types/supplierReturn.types';

const field = 'w-full px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-xs';
const smallButton = 'px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const plainButton = `${smallButton} bg-black/5 dark:bg-white/10`;

const STATUS_TONE: Record<SupplierReturnStatus, string> = {
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  REJECTED: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  AWAITING_SUPPLIER: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  DECLINED: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  ACCEPTED: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  IN_TRANSIT: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  RECEIVED_BY_SUPPLIER: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  SETTLED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  CANCELLED: 'bg-black/5 dark:bg-white/10 text-gray-500',
};

const unitsOf = (ret: Pick<SupplierReturn, 'units' | 'unitType'>) => `${Number(ret.units)} ${ret.unitType ?? 'units'}`;

/** Everything about one return: pieces, value, reason, shipping, the answers, the repayment and every step. */
export const ReturnDetails: React.FC<{ ret: SupplierReturn; view: 'staff' | 'supplier' }> = ({ ret, view }) => {
  const shipping = [
    SHIPPING_MODE_LABELS[ret.shippingMode],
    ret.courier && (ret.shippingMode === 'SUPPLIER_PICKUP' ? `collected by ${ret.courier}` : ret.courier),
    ret.trackingNumber && `tracking ${ret.trackingNumber}`,
    ret.dispatchedOn && `${ret.shippingMode === 'SUPPLIER_PICKUP' ? 'collected' : 'dispatched'} on ${formatDate(ret.dispatchedOn)}`,
    ret.shippingCharge != null && ret.shippingCharge > 0 && `shipping ${formatCurrency(ret.shippingCharge)}`,
  ].filter(Boolean).join(' · ');
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-black dark:text-white">
          {unitsOf(ret)}{ret.itemName ? ` of ${ret.itemName}` : ''} · {formatCurrency(ret.piecesValue)}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_TONE[ret.status]}`}>{RETURN_STATUS_LABELS[ret.status]}</span>
      </div>
      <p className="text-gray-500">
        {formatCurrency(ret.unitPrice)} per unit, with GST: {formatCurrency(ret.piecesValue)}
        {view === 'staff' && ret.requestedByUsername ? ` · raised by ${ret.requestedByUsername}` : ''}
      </p>
      <p className="text-gray-700 dark:text-gray-300">Reason: {ret.reason}</p>
      {ret.pieceDetails && <p className="text-gray-600 dark:text-gray-300">Pieces: {ret.pieceDetails}</p>}
      <p className="text-gray-500" data-testid={`return-shipping-${ret.id}`}>{shipping}</p>
      {ret.amountDue != null && <p className="font-medium text-amber-700 dark:text-amber-400">To pay back: {formatCurrency(ret.amountDue)}</p>}
      {view === 'staff' && ret.decisionReason && <p className="text-rose-600">Super Admin: {ret.decisionReason}</p>}
      {ret.supplierResponseReason && <p className="text-rose-600">Supplier: {ret.supplierResponseReason}</p>}
      {ret.cancelReason && <p className="text-gray-500">Cancelled: {ret.cancelReason}</p>}
      {ret.events.length > 0 && (
        <ol aria-label={`Return ${ret.id} history`} className="ml-1.5 pl-3 border-l border-black/10 dark:border-white/10 space-y-0.5">
          {ret.events.map((event) => (
            <li key={event.id}>
              <span className="font-medium text-black dark:text-white">{RETURN_EVENT_LABELS[event.type]}</span>
              <span className="text-gray-400">
                {' · '}{new Date(event.at).toLocaleString()}
                {(event.actorRole || event.actorName) && ` · ${[view === 'staff' ? event.actorName : null, event.actorRole].filter(Boolean).join(', ')}`}
              </span>
              {event.note && <span className="block text-gray-600 dark:text-gray-300">{event.note}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

/** A short required text, then the action (cancel, send again, decline). */
const TextPrompt: React.FC<{ label: string; inputLabel: string; tone: 'danger' | 'warning' | 'primary'; busy: boolean; onConfirm: (text: string) => Promise<boolean>; onCancel: () => void }> = ({
  label, inputLabel, tone, busy, onConfirm, onCancel,
}) => {
  const [text, setText] = useState('');
  return (
    <div className="flex items-center gap-2 pt-1">
      <input aria-label={inputLabel} placeholder={inputLabel} maxLength={500} className={field} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" disabled={!text.trim() || busy}
        onClick={async () => {
          if (await onConfirm(text.trim())) onCancel();
        }}
        className={`${smallButton} ${SOLID_TONE[tone]}`}>
        {label}
      </button>
      <button type="button" onClick={onCancel} className={plainButton}>Back</button>
    </div>
  );
};

const EMPTY_RAISE: RaiseForm = { units: '', reason: '', pieceDetails: '', shippingMode: '' };

/** A Supplier Manager raises a return of failed pieces: how many (at most what is left), why, which, and how they go back. */
const RaiseReturnForm: React.FC<{ returns: OrderReturns; busy: boolean; onSave: Returns['raise']; onCancel: () => void }> = ({ returns, busy, onSave, onCancel }) => {
  const [form, setForm] = useState<RaiseForm>({ ...EMPTY_RAISE, units: String(returns.unitsLeft) });
  const [touched, setTouched] = useState(false);
  const errors = validateRaise(form, returns.unitsLeft);
  const set = (patch: Partial<RaiseForm>) => setForm((current) => ({ ...current, ...patch }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    const ok = await onSave({
      units: Number(form.units),
      reason: form.reason.trim(),
      pieceDetails: form.pieceDetails.trim() || undefined,
      shippingMode: form.shippingMode as ReturnShippingMode,
    });
    if (ok) onCancel();
  };
  const error = (key: keyof RaiseForm) => touched && errors[key] && <span role="alert" className="block text-[10px] text-rose-600">{errors[key]}</span>;
  return (
    <form onSubmit={submit} aria-label="Raise a return" className="space-y-2 p-3 rounded-xl border border-[#0071e3]/30 bg-[#0071e3]/[0.03]" noValidate>
      <label className="block space-y-0.5">
        <span className="text-gray-500">Units to return (at most {Number(returns.unitsLeft)})</span>
        <input aria-label="Units to return" type="number" min="1" max={returns.unitsLeft} step="1" className={field} value={form.units} onChange={(e) => set({ units: e.target.value })} />
        {error('units')}
      </label>
      <label className="block space-y-0.5">
        <span className="text-gray-500">Reason <span className="text-rose-600">*</span></span>
        <input aria-label="Reason for the return" maxLength={500} className={field} value={form.reason} onChange={(e) => set({ reason: e.target.value })} />
        {error('reason')}
      </label>
      <label className="block space-y-0.5">
        <span className="text-gray-500">Piece details (serial numbers, barcodes, faults)</span>
        <textarea aria-label="Piece details" rows={2} maxLength={2000} className={field} value={form.pieceDetails} onChange={(e) => set({ pieceDetails: e.target.value })} />
      </label>
      <div role="radiogroup" aria-label="How the pieces go back" className="flex flex-wrap gap-3">
        {(['TINQA_SHIPS', 'SUPPLIER_PICKUP'] as const).map((mode) => (
          <label key={mode} className="flex items-center gap-1.5">
            <input type="radio" name="return-shipping" checked={form.shippingMode === mode} onChange={() => set({ shippingMode: mode })} />
            {SHIPPING_MODE_LABELS[mode]}
          </label>
        ))}
      </div>
      {error('shippingMode')}
      <p className="text-gray-500">The Super Admin approves the return, then the supplier accepts it. When TinQa ships, the supplier repays the shipping charge too.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={plainButton}>Cancel</button>
        <button type="submit" disabled={busy} className={`${smallButton} ${SOLID_TONE.primary}`}>Send for Super Admin approval</button>
      </div>
    </form>
  );
};

/** The pieces left: TinQa shipped them (courier, tracking number, charge) or the supplier collected them (date, by whom). */
const DispatchReturnForm: React.FC<{ ret: SupplierReturn; busy: boolean; onSave: Returns['dispatch']; onCancel: () => void }> = ({ ret, busy, onSave, onCancel }) => {
  const ships = ret.shippingMode === 'TINQA_SHIPS';
  const [form, setForm] = useState<DispatchForm>({ dispatchedOn: todayLocalIsoDate(), courier: '', trackingNumber: '', shippingCharge: '', note: '' });
  const [touched, setTouched] = useState(false);
  const errors = validateDispatch(form, ret.shippingMode, todayLocalIsoDate());
  const set = (patch: Partial<DispatchForm>) => setForm((current) => ({ ...current, ...patch }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    const ok = await onSave(ret.id, {
      dispatchedOn: form.dispatchedOn,
      courier: form.courier.trim() || undefined,
      ...(ships ? { trackingNumber: form.trackingNumber.trim(), shippingCharge: Number(form.shippingCharge) } : {}),
      note: form.note.trim() || undefined,
    });
    if (ok) onCancel();
  };
  const error = (key: keyof DispatchForm) => touched && errors[key] && <span role="alert" className="block text-[10px] text-rose-600">{errors[key]}</span>;
  return (
    <form onSubmit={submit} aria-label="Record the dispatch" className="space-y-2 p-3 rounded-xl border border-[#0071e3]/30 bg-[#0071e3]/[0.03]" noValidate>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-0.5">
          <span className="text-gray-500">{ships ? 'Dispatched on' : 'Pickup date'}</span>
          <input aria-label={ships ? 'Dispatched on' : 'Pickup date'} type="date" max={todayLocalIsoDate()} className={field} value={form.dispatchedOn} onChange={(e) => set({ dispatchedOn: e.target.value })} />
          {error('dispatchedOn')}
        </label>
        <label className="space-y-0.5">
          <span className="text-gray-500">{ships ? 'Courier' : 'Collected by (optional)'}</span>
          <input aria-label={ships ? 'Courier' : 'Collected by'} maxLength={100} className={field} value={form.courier} onChange={(e) => set({ courier: e.target.value })} />
          {error('courier')}
        </label>
        {ships && (
          <>
            <label className="space-y-0.5">
              <span className="text-gray-500">Tracking number</span>
              <input aria-label="Tracking number" maxLength={100} className={field} value={form.trackingNumber} onChange={(e) => set({ trackingNumber: e.target.value })} />
              {error('trackingNumber')}
            </label>
            <label className="space-y-0.5">
              <span className="text-gray-500">Shipping charge (₹, the supplier repays it)</span>
              <input aria-label="Shipping charge" type="number" min="0" step="0.01" className={field} value={form.shippingCharge} onChange={(e) => set({ shippingCharge: e.target.value })} />
              {error('shippingCharge')}
            </label>
          </>
        )}
      </div>
      <label className="block space-y-0.5">
        <span className="text-gray-500">Note</span>
        <input aria-label="Dispatch note" maxLength={500} className={field} value={form.note} onChange={(e) => set({ note: e.target.value })} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={plainButton}>Cancel</button>
        <button type="submit" disabled={busy} className={`${smallButton} ${SOLID_TONE.approve}`}>{ships ? 'Dispatched' : 'Collected'}</button>
      </div>
    </form>
  );
};

type Returns = ReturnType<typeof useOrderReturns>;
type Action = 'dispatch' | 'resend' | 'cancel' | 'decline' | 'arrived';

/** One return with what the person looking at it may do now. */
const ReturnItem: React.FC<{ ret: SupplierReturn; view: 'staff' | 'supplier'; returns: Returns }> = ({ ret, view, returns }) => {
  const [action, setAction] = useState<Action | null>(null);
  const [arrivedNote, setArrivedNote] = useState('');
  const busy = returns.isSubmitting;
  const close = () => setAction(null);
  const staff = view === 'staff' && returns.canRequest;
  const supplier = view === 'supplier' && returns.canRespond;
  return (
    <li className="p-2 rounded-lg border border-black/5 dark:border-white/10 space-y-1.5" data-testid={`return-${ret.id}`}>
      <ReturnDetails ret={ret} view={view} />
      {view === 'supplier' && ret.status === 'RECEIVED_BY_SUPPLIER' && (
        <p className="text-amber-700 dark:text-amber-400">Please pay this back under Payments to the supplier › Pay back.</p>
      )}
      {!action && (
        <div className="flex flex-wrap gap-1.5">
          {staff && ret.status === 'ACCEPTED' && (
            <button type="button" disabled={busy} onClick={() => setAction('dispatch')} className={`${smallButton} ${SOLID_TONE.approve}`}>Dispatch</button>
          )}
          {staff && ret.status === 'DECLINED' && (
            <button type="button" disabled={busy} onClick={() => setAction('resend')} className={`${smallButton} ${SOLID_TONE.primary}`}>Send again</button>
          )}
          {staff && CANCELLABLE_RETURN_STATUSES.has(ret.status) && (
            <button type="button" disabled={busy} onClick={() => setAction('cancel')} className={`${smallButton} ${SOLID_TONE.danger}`}>Cancel return</button>
          )}
          {supplier && ret.status === 'AWAITING_SUPPLIER' && (
            <>
              <button type="button" disabled={busy} onClick={() => void returns.respond(ret.id, true)} className={`${smallButton} ${SOLID_TONE.approve}`}>Accept return</button>
              <button type="button" disabled={busy} onClick={() => setAction('decline')} className={`${smallButton} ${SOLID_TONE.danger}`}>Decline</button>
            </>
          )}
          {supplier && ret.status === 'IN_TRANSIT' && (
            <button type="button" disabled={busy} onClick={() => setAction('arrived')} className={`${smallButton} ${SOLID_TONE.approve}`}>Pieces arrived</button>
          )}
        </div>
      )}
      {action === 'dispatch' && <DispatchReturnForm ret={ret} busy={busy} onSave={returns.dispatch} onCancel={close} />}
      {action === 'resend' && (
        <TextPrompt label="Send again" inputLabel="Note for the supplier" tone="primary" busy={busy} onCancel={close} onConfirm={(note) => returns.resend(ret.id, note)} />
      )}
      {action === 'cancel' && (
        <TextPrompt label="Cancel return" inputLabel="Reason to cancel" tone="danger" busy={busy} onCancel={close} onConfirm={(reason) => returns.cancel(ret.id, reason)} />
      )}
      {action === 'decline' && (
        <TextPrompt label="Decline return" inputLabel="Reason to decline" tone="danger" busy={busy} onCancel={close} onConfirm={(reason) => returns.respond(ret.id, false, reason)} />
      )}
      {action === 'arrived' && (
        <div className="space-y-1 pt-1">
          <p className="text-gray-600 dark:text-gray-300">Confirm the pieces reached you. You are then asked to pay back what TinQa paid for them{ret.shippingCharge ? ' and the shipping charge' : ''}.</p>
          <div className="flex items-center gap-2">
            <input aria-label="Note (optional)" placeholder="Note (optional)" maxLength={500} className={field} value={arrivedNote} onChange={(e) => setArrivedNote(e.target.value)} />
            <button type="button" disabled={busy}
              onClick={async () => {
                if (await returns.received(ret.id, arrivedNote.trim() || undefined)) close();
              }}
              className={`${smallButton} ${SOLID_TONE.approve}`}>
              Yes, they arrived
            </button>
            <button type="button" onClick={close} className={plainButton}>Back</button>
          </div>
        </div>
      )}
    </li>
  );
};

interface Props {
  orderId: number;
  view?: 'staff' | 'supplier';
  /** Open (and load) from the start, e.g. when the supplier has a return to answer */
  defaultOpen?: boolean;
  /** After a change: the caller refreshes what depends on it (payments, flow history, list flags) */
  onChanged?: () => void;
}

/**
 * The order's returns of pieces that failed testing, loaded only once opened. Staff see every return with its steps
 * and a Supplier Manager raises, dispatches, sends again or cancels one; the supplier accepts or declines a return and
 * confirms the pieces arrived. The supplier sees roles, never staff names.
 */
export const SupplierReturnsPanel: React.FC<Props> = ({ orderId, view = 'staff', defaultOpen = false, onChanged }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [raising, setRaising] = useState(false);
  const returns = useOrderReturns(orderId, open, view, onChanged);
  const data = returns.data;
  const title = view === 'supplier' ? 'Returns of failed pieces' : 'Failed pieces returns';
  return (
    <section aria-label={title} className="p-3 border border-black/10 dark:border-white/10 rounded-xl text-xs space-y-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 font-medium text-gray-500 cursor-pointer">
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <PackageX className="w-3.5 h-3.5" /> {title}
      </button>
      {open && returns.loading && (
        <p role="status" className="flex items-center gap-1.5 text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading returns…
        </p>
      )}
      {open && data && (
        <>
          {view === 'staff' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-gray-500" data-testid="return-units">
                {data.tested
                  ? `Failed testing: ${Number(data.failedUnits)} · in returns: ${Number(data.unitsInReturns)} · left: ${Number(data.unitsLeft)}`
                  : 'A return can be raised once the stock entry (testing) is approved.'}
              </p>
              {returns.canRequest && data.canRaise && !raising && (
                <button type="button" onClick={() => setRaising(true)} className={`${smallButton} ${SOLID_TONE.primary}`}>Raise return</button>
              )}
            </div>
          )}
          {raising && <RaiseReturnForm returns={data} busy={returns.isSubmitting} onSave={returns.raise} onCancel={() => setRaising(false)} />}
          {data.returns.length === 0 ? (
            <p className="text-gray-400 italic">No returns.</p>
          ) : (
            <ul className="space-y-2" aria-label="Returns">
              {data.returns.map((ret) => (
                <ReturnItem key={ret.id} ret={ret} view={view} returns={returns} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};
