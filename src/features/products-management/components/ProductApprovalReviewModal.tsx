import React, { useState } from 'react';
import { Ban, CheckCircle2, Loader2, ShieldCheck, X, XCircle } from 'lucide-react';
import type { ProductApprovalDecision, ProductApprovalResponse } from '../types/productApproval.types';
import { DECISION_REASON_MAX } from '../utils/productApproval';
import { formatWarrantyDuration, formatWarrantyType } from '../../item-management/utils/itemWarranty';

interface Props {
  request: ProductApprovalResponse | null;
  isSubmitting: boolean;
  onClose: () => void;
  onDecide: (decision: ProductApprovalDecision, reason?: string) => Promise<boolean>;
}

const DECISIONS: Record<ProductApprovalDecision, { label: string; confirm: string; tone: string; icon: React.ElementType; help: string }> = {
  APPROVED: {
    label: 'Approve',
    confirm: 'Approve & activate',
    tone: 'bg-emerald-600 hover:bg-emerald-700',
    icon: CheckCircle2,
    help: 'The product becomes active and visible in the store.',
  },
  REJECTED: {
    label: 'Reject',
    confirm: 'Reject',
    tone: 'bg-rose-600 hover:bg-rose-700',
    icon: XCircle,
    help: 'The product stays inactive. The creator can edit it and resubmit it for approval.',
  },
  CANCELLED: {
    label: 'Cancel product',
    confirm: 'Cancel product',
    tone: 'bg-gray-700 hover:bg-gray-800',
    icon: Ban,
    help: 'The product stays inactive permanently and can no longer be edited or resubmitted. It is not deleted.',
  },
};

/** Changes to a live product can't be cancelled — rejecting leaves the product as it was. */
const UPDATE_DECISIONS: ProductApprovalDecision[] = ['APPROVED', 'REJECTED'];
const UPDATE_HELP: Partial<Record<ProductApprovalDecision, string>> = {
  APPROVED: 'The changes are applied to the product right away.',
  REJECTED: 'The product stays as it is. The requester sees your reason and can submit new changes.',
};

const REQUEST_LABELS: Record<ProductApprovalResponse['requestType'], string> = {
  CREATE: 'New product',
  RESUBMISSION: 'Resubmitted',
  UPDATE: 'Changes to a live product',
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</span>
    <span className="text-black dark:text-white">{children}</span>
  </div>
);

/** Admin L2 review of a product approval request: the submitted snapshot, then Approve / Reject / Cancel. */
export const ProductApprovalReviewModal: React.FC<Props> = ({ request, isSubmitting, onClose, onDecide }) => {
  const [decision, setDecision] = useState<ProductApprovalDecision | null>(null);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  if (!request) return null;
  const snapshot = request.snapshot;
  const isUpdate = request.requestType === 'UPDATE';
  const decisionKeys = isUpdate ? UPDATE_DECISIONS : (Object.keys(DECISIONS) as ProductApprovalDecision[]);
  const helpFor = (key: ProductApprovalDecision) => (isUpdate ? UPDATE_HELP[key] : undefined) ?? DECISIONS[key].help;
  const confirmFor = (key: ProductApprovalDecision) => (isUpdate && key === 'APPROVED' ? 'Approve & apply' : DECISIONS[key].confirm);
  const needsReason = decision === 'REJECTED' || decision === 'CANCELLED';
  const reasonError =
    needsReason && !reason.trim()
      ? 'A reason is required.'
      : reason.trim().length > DECISION_REASON_MAX
        ? `Reason cannot exceed ${DECISION_REASON_MAX} characters.`
        : null;

  const submit = async () => {
    setTouched(true);
    if (!decision || reasonError) return;
    const ok = await onDecide(decision, needsReason ? reason.trim() : undefined);
    if (ok) {
      setDecision(null);
      setReason('');
      setTouched(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review product approval"
        className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl text-xs flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
            <div>
              <h2 className="text-sm font-bold text-black dark:text-white">Product approval</h2>
              <p className="text-[11px] text-gray-500">
                {REQUEST_LABELS[request.requestType] ?? 'New product'} · requested by{' '}
                {request.requestedByUsername ?? (request.requestedBy !== null ? `user #${request.requestedBy}` : 'unknown')}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex gap-3">
            {snapshot.image1Url && (
              <img src={snapshot.image1Url} alt="" className="w-16 h-16 rounded-lg object-cover border border-black/10 dark:border-white/10" onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-black dark:text-white">{snapshot.title}</p>
              {snapshot.tagline && <p className="text-gray-500">{snapshot.tagline}</p>}
              <p className="text-[10px] text-gray-400 font-mono">Product #{request.ecommerceProductId}</p>
            </div>
          </div>

          {isUpdate && (
            <div>
              <span className="block font-semibold text-gray-500 mb-1">Requested changes ({request.changeSummary?.length ?? 0})</span>
              {!request.changeSummary?.length ? (
                <p className="text-gray-400 italic">No change details were sent.</p>
              ) : (
                <ul className="space-y-2" aria-label="Requested changes">
                  {request.changeSummary.map((change, i) => (
                    <li key={i} className="border border-black/10 dark:border-white/10 rounded-xl p-2 space-y-1">
                      <span className="font-semibold text-black dark:text-white">{change.label}</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-rose-500/10 p-2 rounded text-rose-600 dark:text-rose-400 break-all whitespace-pre-line">
                          <span className="block font-semibold text-[10px] opacity-75">Current</span>
                          {change.oldValue}
                        </div>
                        <div className="bg-emerald-500/10 p-2 rounded text-emerald-600 dark:text-emerald-400 break-all whitespace-pre-line">
                          <span className="block font-semibold text-[10px] opacity-75">Requested</span>
                          {change.newValue}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Product after the changes</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
            <Row label="Price">₹{Number(snapshot.price).toLocaleString('en-IN')}</Row>
            <Row label="Discount">{snapshot.discountPercentage ? `${snapshot.discountPercentage}%` : '—'}</Row>
            <Row label="Stock">{snapshot.stockQuantity}</Row>
          </div>

          <div>
            <span className="block font-semibold text-gray-500 mb-1">Components ({snapshot.components.length})</span>
            {snapshot.components.length === 0 ? (
              <p className="text-gray-400 italic">None</p>
            ) : (
              <ul className="space-y-0.5" aria-label="Components">
                {snapshot.components.map((c) => (
                  <li key={c.itemId} className="flex justify-between">
                    <span className="text-black dark:text-white">{c.itemName}</span>
                    <span className="text-gray-500">× {c.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <span className="block font-semibold text-gray-500 mb-1">Warranties ({snapshot.warranties.length})</span>
            {snapshot.warranties.length === 0 ? (
              <p className="text-gray-400 italic">None</p>
            ) : (
              <ul className="space-y-0.5">
                {snapshot.warranties.map((w, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-black dark:text-white">{w.title}</span>
                    <span className="text-gray-500 shrink-0">
                      {formatWarrantyType(w.warrantyType)} · {formatWarrantyDuration(w.durationValue, w.durationUnit)}
                      {w.isActive ? '' : ' · inactive'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
            <span className="block font-semibold text-gray-700 dark:text-gray-300">Decision</span>
            <div role="radiogroup" aria-label="Decision" className={`grid ${isUpdate ? 'grid-cols-2' : 'grid-cols-3'} gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5`}>
              {decisionKeys.map((key) => {
                const { label, icon: Icon } = DECISIONS[key];
                const active = decision === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={isSubmitting}
                    onClick={() => setDecision(key)}
                    className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg font-semibold cursor-pointer transition-colors ${
                      active ? 'bg-white dark:bg-neutral-800 text-[#0071e3] shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                );
              })}
            </div>
            {decision && <p className="text-[11px] text-gray-500">{helpFor(decision)}</p>}
            {needsReason && (
              <div>
                <label htmlFor="product-decision-reason" className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Reason *
                </label>
                <textarea
                  id="product-decision-reason"
                  rows={3}
                  value={reason}
                  maxLength={DECISION_REASON_MAX + 50}
                  aria-invalid={touched && !!reasonError}
                  onChange={(e) => setReason(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder={decision === 'REJECTED' ? 'What should be changed before resubmitting?' : 'Why is this product cancelled?'}
                  className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-y"
                />
                <div className="flex justify-between text-[10px]">
                  <span className="text-rose-500" role={touched && reasonError ? 'alert' : undefined}>
                    {touched ? reasonError : ''}
                  </span>
                  <span className="text-gray-400">{reason.trim().length}/{DECISION_REASON_MAX}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-black/10 dark:border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-black/5 dark:bg-white/10 rounded-xl font-medium text-black dark:text-white cursor-pointer">
            Close
          </button>
          <button
            type="button"
            disabled={!decision || isSubmitting || (touched && !!reasonError)}
            onClick={submit}
            className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${decision ? DECISIONS[decision].tone : 'bg-[#0071e3]'}`}
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {decision ? confirmFor(decision) : 'Choose a decision'}
          </button>
        </div>
      </div>
    </div>
  );
};
